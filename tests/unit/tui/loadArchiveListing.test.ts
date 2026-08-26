import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../../src/engine/registry';
import type { ArchiveEntry, FormatAdapter } from '../../../src/engine/types';
import { loadArchiveListing } from '../../../src/tui/components/archiveTree';

function fakeAdapter(entries: ArchiveEntry[]): FormatAdapter {
  return {
    id: 'zip',
    requiredTools: ['zip'],
    supportsPassword: false,
    supportsFilenameEncryption: false,
    buildCreate: () => ({ cmd: 'zip', args: [] }),
    buildExtract: () => ({ cmd: 'unzip', args: [] }),
    buildList: (archive) => ({ cmd: 'unzip', args: ['-l', archive] }),
    buildTest: () => null,
    parseList: () => entries,
  };
}

function registryWith(entries: ArchiveEntry[]) {
  const r = createRegistry();
  r.register(fakeAdapter(entries));
  return r;
}

const ok = (stdout: string) => async () => ({ exitCode: 0, stdout, stderr: '' });

describe('loadArchiveListing', () => {
  it('hands back the parsed entries on success', async () => {
    const r = registryWith([
      { path: 'a.txt', size: 10, isDir: false },
      { path: 'docs/', size: 0, isDir: true },
    ]);
    const res = await loadArchiveListing('x.zip', r, ok('irrelevant'));
    expect(res.ok).toBe(true);
    expect(res.entries.map((e) => e.path)).toEqual(['a.txt', 'docs/']);
  });

  it('reports an unrecognised extension without running anything', async () => {
    const r = registryWith([]);
    let ran = false;
    const res = await loadArchiveListing('mystery.qqq', r, async () => {
      ran = true;
      return { exitCode: 0, stdout: '', stderr: '' };
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('mystery.qqq');
    expect(ran).toBe(false);
  });

  it('surfaces stderr when the tool exits non-zero', async () => {
    const r = registryWith([]);
    const res = await loadArchiveListing('x.zip', r, async () => ({
      exitCode: 82,
      stdout: '',
      stderr: 'unzip: incorrect password',
    }));
    expect(res.ok).toBe(false);
    expect(res.error).toContain('unzip: incorrect password');
    expect(res.entries).toEqual([]);
  });

  it('falls back to the exit code when stderr is silent', async () => {
    const r = registryWith([]);
    const res = await loadArchiveListing('x.zip', r, async () => ({
      exitCode: 9,
      stdout: '',
      stderr: '   ',
    }));
    expect(res.ok).toBe(false);
    expect(res.error).toContain('9');
  });

  it('treats an archive with no entries as a success, not an error', async () => {
    const r = registryWith([]);
    const res = await loadArchiveListing('x.zip', r, ok(''));
    expect(res.ok).toBe(true);
    expect(res.entries).toEqual([]);
  });

  it('reports a thrown spawn failure instead of propagating it', async () => {
    const r = registryWith([]);
    const res = await loadArchiveListing('x.zip', r, async () => {
      throw new Error('ENOENT: unzip not found');
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('unzip not found');
  });
});
