import { describe, expect, it } from 'vitest';
import { gzAdapter } from '../../../../src/engine/adapters/gz';

describe('gzAdapter', () => {
  it('create pipes input to outputFile', () => {
    const c = gzAdapter.buildCreate({ archive: 'out.gz', inputs: ['data.txt'] });
    expect(c.cmd).toBe('gzip');
    expect(c.args).toEqual(['-c', 'data.txt']);
    expect(c.outputFile).toBe('out.gz');
  });

  it('create with level prepends -<n>', () => {
    const c = gzAdapter.buildCreate({ archive: 'out.gz', inputs: ['data.txt'], level: 9 });
    expect(c.args).toEqual(['-c', '-9', 'data.txt']);
  });

  it('rejects multi-input', () => {
    expect(() => gzAdapter.buildCreate({ archive: 'out.gz', inputs: ['a', 'b'] })).toThrow();
    expect(() => gzAdapter.buildCreate({ archive: 'out.gz', inputs: [] })).toThrow();
  });

  it('extract decompresses into outputDir using suffix-stripped basename', () => {
    const c = gzAdapter.buildExtract({ archive: '/in/data.txt.gz', outputDir: '/out' });
    expect(c.args).toEqual(['-cd', '/in/data.txt.gz']);
    expect(c.outputFile).toBe('/out/data.txt');
  });

  it('extract maps .tgz back to .tar', () => {
    const c = gzAdapter.buildExtract({ archive: '/in/x.tgz', outputDir: '/out' });
    expect(c.outputFile).toBe('/out/x.tar');
  });

  it('list / test', () => {
    expect(gzAdapter.buildList('a.gz').args).toEqual(['-l', 'a.gz']);
    expect(gzAdapter.buildTest('a.gz')?.args).toEqual(['-t', 'a.gz']);
  });

  it('parses gunzip -l output as a single entry', () => {
    const stdout = `         compressed        uncompressed  ratio uncompressed_name
                 31                  124 -75.0% data.txt
`;
    const entries = gzAdapter.parseList(stdout);
    expect(entries).toEqual([{ path: 'data.txt', size: 124, isDir: false }]);
  });
});
