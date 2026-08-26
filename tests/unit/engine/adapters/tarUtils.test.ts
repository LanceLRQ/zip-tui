import { describe, expect, it } from 'vitest';
import { parseTarVerboseListing } from '../../../../src/engine/adapters/tarUtils';

/**
 * `tar -tvf` output differs by implementation and locale. All of these are
 * verbatim captures (or the documented GNU equivalent), and the shared parser
 * has to handle every one of them.
 */
describe('parseTarVerboseListing', () => {
  it('parses BSD tar under a non-English locale', () => {
    const stdout = `drwxr-xr-x  0 lancelrq wheel       0  8月 26 11:02 d/
-rw-r--r--  0 lancelrq wheel       3  8月 26 11:02 d/new.txt
`;
    const entries = parseTarVerboseListing(stdout);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ path: 'd/', size: 0, isDir: true });
    expect(entries[1]).toMatchObject({ path: 'd/new.txt', size: 3, isDir: false });
  });

  it('parses BSD tar under LC_ALL=C', () => {
    const stdout = `drwxr-xr-x  0 lancelrq wheel       0 Aug 26 11:02 d/
-rw-r--r--  0 lancelrq wheel       3 Aug 26 11:02 d/new.txt
`;
    const entries = parseTarVerboseListing(stdout);
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({ path: 'd/new.txt', size: 3, isDir: false });
  });

  // BSD tar swaps the clock for a year once a file is over ~6 months old
  it('parses BSD rows that show a year instead of a time', () => {
    const stdout = `-rw-r--r--  0 lancelrq wheel       4  1月  1  2024 d/old.txt
-rw-r--r--  0 lancelrq wheel       4 Jan  1  2024 d/older.txt
`;
    const entries = parseTarVerboseListing(stdout);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ path: 'd/old.txt', size: 4 });
    expect(entries[1]).toMatchObject({ path: 'd/older.txt', size: 4 });
  });

  it('parses GNU tar ISO output', () => {
    const stdout = `drwxr-xr-x lancelrq/wheel    0 2026-08-26 11:02 d/
-rw-r--r-- lancelrq/wheel    4 2024-01-01 12:00 d/old.txt
`;
    const entries = parseTarVerboseListing(stdout);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ path: 'd/', isDir: true });
    expect(entries[1]).toMatchObject({ path: 'd/old.txt', size: 4, isDir: false });
  });

  it('keeps spaces inside file names', () => {
    const stdout = `-rw-r--r--  0 lancelrq wheel      12 Aug 26 11:02 d/my file.txt\n`;
    expect(parseTarVerboseListing(stdout)[0]?.path).toBe('d/my file.txt');
  });

  it('ignores blank lines and non-entry noise', () => {
    const stdout = `
tar: Removing leading '/' from member names
-rw-r--r--  0 lancelrq wheel       3 Aug 26 11:02 d/new.txt

`;
    expect(parseTarVerboseListing(stdout).map((e) => e.path)).toEqual(['d/new.txt']);
  });

  it('returns nothing for empty output', () => {
    expect(parseTarVerboseListing('')).toEqual([]);
  });
});
