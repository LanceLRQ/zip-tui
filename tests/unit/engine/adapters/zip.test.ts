import { describe, expect, it } from 'vitest';
import { zipAdapter } from '../../../../src/engine/adapters/zip';

describe('zipAdapter', () => {
  it('builds create command with level and excludes', () => {
    const c = zipAdapter.buildCreate({
      archive: 'out.zip',
      inputs: ['src', 'docs'],
      level: 9,
      excludes: ['node_modules/*', '.git/*'],
    });
    expect(c.cmd).toBe('zip');
    expect(c.args).toEqual([
      '-r',
      '-9',
      'out.zip',
      'src',
      'docs',
      '-x',
      'node_modules/*',
      '-x',
      '.git/*',
    ]);
  });

  it('adds -e flag and password when provided', () => {
    const c = zipAdapter.buildCreate({
      archive: 'out.zip',
      inputs: ['src'],
      password: 'p@ss',
    });
    expect(c.args).toContain('-e');
    expect(c.args).toContain('-P');
    expect(c.args).toContain('p@ss');
  });

  it('builds extract command with output dir', () => {
    const c = zipAdapter.buildExtract({
      archive: 'out.zip',
      outputDir: '/tmp/out',
    });
    expect(c.cmd).toBe('unzip');
    expect(c.args).toEqual(['-o', 'out.zip', '-d', '/tmp/out']);
  });

  it('builds extract with password', () => {
    const c = zipAdapter.buildExtract({
      archive: 'out.zip',
      outputDir: '/tmp',
      password: 'p@ss',
    });
    expect(c.args).toContain('-P');
    expect(c.args).toContain('p@ss');
  });

  it('builds list command', () => {
    const c = zipAdapter.buildList('out.zip');
    expect(c.cmd).toBe('unzip');
    expect(c.args).toEqual(['-l', 'out.zip']);
  });

  it('builds test command', () => {
    const c = zipAdapter.buildTest('out.zip');
    expect(c).not.toBeNull();
    expect(c?.args).toEqual(['-t', 'out.zip']);
  });

  it('parses list output', () => {
    const stdout = `
Archive:  out.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
      124  2026-05-14 10:30   src/index.ts
       89  2026-05-14 10:31   src/utils.ts
        0  2026-05-14 10:30   docs/
---------                     -------
      213                     3 files
`;
    const entries = zipAdapter.parseList(stdout);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({ path: 'src/index.ts', size: 124, isDir: false });
    expect(entries[2]).toMatchObject({ path: 'docs/', isDir: true });
  });

  // Info-ZIP's unzip prints MM-DD-YYYY, not ISO. This is verbatim output from
  // /usr/bin/unzip on macOS 15.
  it('parses the MM-DD-YYYY date format real unzip emits', () => {
    const stdout = `Archive:  /tmp/t.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
        0  08-26-2026 10:49   src/
       10  08-26-2026 10:49   src/file-3.txt
       10  08-26-2026 10:49   src/file-2.txt
---------                     -------
       30                     4 files
`;
    const entries = zipAdapter.parseList(stdout);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({ path: 'src/', size: 0, isDir: true });
    expect(entries[1]).toMatchObject({ path: 'src/file-3.txt', size: 10, isDir: false });
  });

  it('parses the timestamp into a date', () => {
    const stdout = `  Length      Date    Time    Name
---------  ---------- -----   ----
       10  08-26-2026 10:49   a.txt
`;
    const e = zipAdapter.parseList(stdout)[0];
    expect(e?.modified?.getFullYear()).toBe(2026);
    expect(e?.modified?.getMonth()).toBe(7);
    expect(e?.modified?.getDate()).toBe(26);
    expect(e?.modified?.getHours()).toBe(10);
    expect(e?.modified?.getMinutes()).toBe(49);
    expect(e?.modifiedText).toBe('08-26-2026 10:49');
  });

  it('does not mistake the summary footer for an entry', () => {
    const stdout = `  Length      Date    Time    Name
---------  ---------- -----   ----
       10  08-26-2026 10:49   a.txt
---------                     -------
       30                     4 files
`;
    expect(zipAdapter.parseList(stdout).map((e) => e.path)).toEqual(['a.txt']);
  });

  it('parses progress line', () => {
    const p = zipAdapter.parseProgress?.('  adding: src/index.ts (deflated 45%)');
    expect(p).toMatchObject({ current: 1, total: 0 });
  });

  it('forwards encoding via -O flag', () => {
    const c = zipAdapter.buildExtract({
      archive: 'out.zip',
      outputDir: '/tmp',
      encoding: 'gbk',
    });
    expect(c.args).toContain('-O');
    expect(c.args).toContain('GBK');
  });
});
