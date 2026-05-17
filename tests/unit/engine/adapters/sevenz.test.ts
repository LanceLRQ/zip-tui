import { describe, expect, it } from 'vitest';
import { sevenzAdapter } from '../../../../src/engine/adapters/sevenz';

describe('sevenzAdapter', () => {
  it('builds create with level and password including filename encryption', () => {
    const c = sevenzAdapter.buildCreate({
      archive: 'out.7z',
      inputs: ['src'],
      level: 9,
      password: 'p@ss',
      filenameEncryption: true,
    });
    expect(c.cmd).toBe('7z');
    expect(c.args[0]).toBe('a');
    expect(c.args).toContain('-t7z');
    expect(c.args).toContain('-mx=9');
    expect(c.args).toContain('-pp@ss');
    expect(c.args).toContain('-mhe=on');
    expect(c.args).toContain('out.7z');
    expect(c.args).toContain('src');
  });

  it('builds excludes with -xr! pattern', () => {
    const c = sevenzAdapter.buildCreate({
      archive: 'out.7z',
      inputs: ['src'],
      excludes: ['node_modules', '.git'],
    });
    expect(c.args).toContain('-xr!node_modules');
    expect(c.args).toContain('-xr!.git');
  });

  it('builds extract with output dir', () => {
    const c = sevenzAdapter.buildExtract({
      archive: 'out.7z',
      outputDir: '/tmp/out',
    });
    expect(c.args[0]).toBe('x');
    expect(c.args).toContain('-o/tmp/out');
  });

  it('builds extract with password', () => {
    const c = sevenzAdapter.buildExtract({
      archive: 'out.7z',
      outputDir: '/tmp',
      password: 'p@ss',
    });
    expect(c.args).toContain('-pp@ss');
  });

  it('builds list and test commands', () => {
    expect(sevenzAdapter.buildList('out.7z').args).toEqual(['l', 'out.7z']);
    const t = sevenzAdapter.buildTest('out.7z');
    expect(t?.args).toEqual(['t', 'out.7z']);
  });

  it('parses progress line', () => {
    const p = sevenzAdapter.parseProgress?.('  42% 7 + src/big.bin');
    expect(p).toMatchObject({ current: 42, total: 100 });
  });

  it('parseProgress returns null on non-progress lines', () => {
    expect(sevenzAdapter.parseProgress?.('Scanning the drive')).toBeNull();
  });

  it('builds list with password', () => {
    expect(sevenzAdapter.buildList('out.7z', 'p@ss').args).toEqual(['l', 'out.7z', '-pp@ss']);
  });

  it('builds test with password', () => {
    expect(sevenzAdapter.buildTest('out.7z', 'p@ss')?.args).toEqual(['t', 'out.7z', '-pp@ss']);
  });

  it('parses list output between dashed separators', () => {
    const stdout = `7-Zip
Listing archive: out.7z
   Date      Time    Attr         Size   Compressed  Name
------------------- ----- ------------ ------------  ------------------------
2026-05-14 10:30:00 D....            0            0  docs
2026-05-14 10:30:00 ....A          124          120  src/index.ts
------------------- ----- ------------ ------------  ------------------------
                                   124          120  1 files, 1 folders
`;
    const entries = sevenzAdapter.parseList(stdout);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries.some((e: { path: string }) => e.path === 'src/index.ts')).toBe(true);
  });
});
