import { describe, expect, it } from 'vitest';
import { tarxzAdapter } from '../../../../src/engine/adapters/tarxz';

describe('tarxzAdapter', () => {
  it('default create uses -J flag', () => {
    const c = tarxzAdapter.buildCreate({ archive: 'out.txz', inputs: ['src'] });
    expect(c.args).toEqual(['-cJf', 'out.txz', 'src']);
  });

  it('custom level uses --use-compress-program', () => {
    const c = tarxzAdapter.buildCreate({ archive: 'out.txz', inputs: ['src'], level: 6 });
    expect(c.args).toContain('--use-compress-program=xz -6');
  });

  it('extract uses -xJ', () => {
    expect(tarxzAdapter.buildExtract({ archive: 'a.txz', outputDir: '/o' }).args).toEqual([
      '-xJf',
      'a.txz',
      '-C',
      '/o',
    ]);
  });

  it('list / test', () => {
    expect(tarxzAdapter.buildList('a.txz').args).toEqual(['-tJvf', 'a.txz']);
    expect(tarxzAdapter.buildTest('a.txz')?.cmd).toBe('xz');
  });

  it('declares xz dep', () => {
    expect(tarxzAdapter.requiredTools).toContain('xz');
  });
});
