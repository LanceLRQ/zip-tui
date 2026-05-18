import { describe, expect, it } from 'vitest';
import { tarzstAdapter } from '../../../../src/engine/adapters/tarzst';

describe('tarzstAdapter', () => {
  it('default create uses --zstd', () => {
    const c = tarzstAdapter.buildCreate({ archive: 'out.tar.zst', inputs: ['src'] });
    expect(c.args).toEqual(['--zstd', '-cf', 'out.tar.zst', 'src']);
  });

  it('custom level uses --use-compress-program', () => {
    const c = tarzstAdapter.buildCreate({ archive: 'out.tar.zst', inputs: ['src'], level: 19 });
    expect(c.args).toContain('--use-compress-program=zstd -19');
  });

  it('extract uses --zstd -xf', () => {
    expect(tarzstAdapter.buildExtract({ archive: 'a.tar.zst', outputDir: '/o' }).args).toEqual([
      '--zstd',
      '-xf',
      'a.tar.zst',
      '-C',
      '/o',
    ]);
  });

  it('list / test', () => {
    expect(tarzstAdapter.buildList('a.tar.zst').args).toEqual(['--zstd', '-tvf', 'a.tar.zst']);
    expect(tarzstAdapter.buildTest('a.tar.zst')?.cmd).toBe('zstd');
  });

  it('declares zstd dep', () => {
    expect(tarzstAdapter.requiredTools).toContain('zstd');
  });
});
