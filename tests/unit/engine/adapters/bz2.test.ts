import { describe, expect, it } from 'vitest';
import { bz2Adapter } from '../../../../src/engine/adapters/bz2';

describe('bz2Adapter', () => {
  it('create pipes input to outputFile', () => {
    const c = bz2Adapter.buildCreate({ archive: 'out.bz2', inputs: ['data.txt'] });
    expect(c.cmd).toBe('bzip2');
    expect(c.args).toEqual(['-c', 'data.txt']);
    expect(c.outputFile).toBe('out.bz2');
  });

  it('create with level prepends -<n>', () => {
    const c = bz2Adapter.buildCreate({ archive: 'out.bz2', inputs: ['data.txt'], level: 9 });
    expect(c.args).toEqual(['-c', '-9', 'data.txt']);
  });

  it('rejects multi-input', () => {
    expect(() => bz2Adapter.buildCreate({ archive: 'out.bz2', inputs: ['a', 'b'] })).toThrow();
  });

  it('extract decompresses into outputDir using suffix-stripped basename', () => {
    const c = bz2Adapter.buildExtract({ archive: '/in/data.txt.bz2', outputDir: '/out' });
    expect(c.outputFile).toBe('/out/data.txt');
  });

  it('extract maps .tbz2 back to .tar', () => {
    const c = bz2Adapter.buildExtract({ archive: '/in/x.tbz2', outputDir: '/out' });
    expect(c.outputFile).toBe('/out/x.tar');
  });

  it('test uses -t', () => {
    expect(bz2Adapter.buildTest('a.bz2')?.args).toEqual(['-t', 'a.bz2']);
  });

  it('parseList returns the synthetic name from stdout', () => {
    const entries = bz2Adapter.parseList('data.txt\n');
    expect(entries).toEqual([{ path: 'data.txt', size: 0, isDir: false }]);
  });
});
