import { describe, expect, it } from 'vitest';
import { tarAdapter } from '../../../../src/engine/adapters/tar';

describe('tarAdapter', () => {
  it('builds uncompressed create command', () => {
    const c = tarAdapter.buildCreate({
      archive: 'out.tar',
      inputs: ['src', 'docs'],
      excludes: ['node_modules/*'],
    });
    expect(c.cmd).toBe('tar');
    expect(c.args).toEqual(['-cf', 'out.tar', '--exclude=node_modules/*', 'src', 'docs']);
  });

  it('extract honors outputDir + files', () => {
    const c = tarAdapter.buildExtract({
      archive: 'out.tar',
      outputDir: '/tmp/out',
      files: ['src/index.ts'],
    });
    expect(c.args).toEqual(['-xf', 'out.tar', '-C', '/tmp/out', 'src/index.ts']);
  });

  it('list / test', () => {
    expect(tarAdapter.buildList('out.tar').args).toEqual(['-tvf', 'out.tar']);
    expect(tarAdapter.buildTest('out.tar')?.args).toEqual(['-tf', 'out.tar']);
  });

  it('parses verbose listing', () => {
    const stdout = `-rw-r--r-- 0/0  124 2026-05-14 10:30 src/index.ts
drwxr-xr-x 0/0    0 2026-05-14 10:30 docs/
`;
    const entries = tarAdapter.parseList(stdout);
    expect(entries).toHaveLength(2);
    expect(entries[1]?.isDir).toBe(true);
  });
});
