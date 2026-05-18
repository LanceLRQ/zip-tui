import { describe, expect, it } from 'vitest';
import { tarbz2Adapter } from '../../../../src/engine/adapters/tarbz2';

describe('tarbz2Adapter', () => {
  it('default create uses -j flag', () => {
    const c = tarbz2Adapter.buildCreate({ archive: 'out.tbz2', inputs: ['src'] });
    expect(c.args).toEqual(['-cjf', 'out.tbz2', 'src']);
  });

  it('custom level uses --use-compress-program', () => {
    const c = tarbz2Adapter.buildCreate({ archive: 'out.tbz2', inputs: ['src'], level: 9 });
    expect(c.args).toContain('--use-compress-program=bzip2 -9');
  });

  it('extract uses -xj', () => {
    expect(tarbz2Adapter.buildExtract({ archive: 'a.tbz2', outputDir: '/o' }).args).toEqual([
      '-xjf',
      'a.tbz2',
      '-C',
      '/o',
    ]);
  });

  it('list / test', () => {
    expect(tarbz2Adapter.buildList('a.tbz2').args).toEqual(['-tjvf', 'a.tbz2']);
    expect(tarbz2Adapter.buildTest('a.tbz2')?.cmd).toBe('bzip2');
  });

  it('declares bzip2 dep', () => {
    expect(tarbz2Adapter.requiredTools).toContain('bzip2');
  });
});
