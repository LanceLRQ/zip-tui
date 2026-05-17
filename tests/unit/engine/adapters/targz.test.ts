import { describe, expect, it } from 'vitest';
import { targzAdapter } from '../../../../src/engine/adapters/targz';

describe('targzAdapter', () => {
  it('builds create command with excludes', () => {
    const c = targzAdapter.buildCreate({
      archive: 'out.tar.gz',
      inputs: ['src', 'docs'],
      excludes: ['node_modules/*'],
    });
    expect(c.cmd).toBe('tar');
    expect(c.args).toEqual(['-czf', 'out.tar.gz', '--exclude=node_modules/*', 'src', 'docs']);
  });

  it('emits --use-compress-program for compression level', () => {
    const c = targzAdapter.buildCreate({
      archive: 'out.tar.gz',
      inputs: ['src'],
      level: 9,
    });
    expect(c.args).toContain('--use-compress-program=gzip -9');
  });

  it('builds extract with output dir and files', () => {
    const c = targzAdapter.buildExtract({
      archive: 'out.tar.gz',
      outputDir: '/tmp/out',
      files: ['src/index.ts'],
    });
    expect(c.cmd).toBe('tar');
    expect(c.args).toEqual(['-xzf', 'out.tar.gz', '-C', '/tmp/out', 'src/index.ts']);
  });

  it('build list', () => {
    expect(targzAdapter.buildList('out.tar.gz').args).toEqual(['-tzvf', 'out.tar.gz']);
  });

  it('build test', () => {
    const c = targzAdapter.buildTest('out.tar.gz');
    expect(c?.cmd).toBe('gzip');
    expect(c?.args).toEqual(['-t', 'out.tar.gz']);
  });

  it('does not support password', () => {
    expect(targzAdapter.supportsPassword).toBe(false);
  });

  it('parses list with verbose format', () => {
    const stdout = `-rw-r--r-- 0/0  124 2026-05-14 10:30 src/index.ts
drwxr-xr-x 0/0    0 2026-05-14 10:30 docs/
`;
    const entries = targzAdapter.parseList(stdout);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ path: 'src/index.ts', size: 124, isDir: false });
    expect(entries[1]).toMatchObject({ path: 'docs/', isDir: true });
  });
});
