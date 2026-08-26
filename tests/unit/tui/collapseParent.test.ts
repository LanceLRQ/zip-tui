import { describe, expect, it } from 'vitest';
import type { ArchiveEntry } from '../../../src/engine/types';
import {
  buildArchiveTree,
  collapseParent,
  flattenTree,
} from '../../../src/tui/components/archiveTree';

function file(path: string, size = 0): ArchiveEntry {
  return { path, size, isDir: false };
}

const TREE = buildArchiveTree([
  file('proj/src/deep/a.txt', 1),
  file('proj/src/deep/b.txt', 2),
  file('proj/src/top.ts', 3),
  file('proj/readme.md', 4),
  file('other.txt', 5),
]);

const ALL_OPEN = new Set(['proj', 'proj/src', 'proj/src/deep']);

/** Rows with everything expanded:
 *  0 proj
 *  1   src
 *  2     deep
 *  3       a.txt
 *  4       b.txt
 *  5     top.ts
 *  6   readme.md
 *  7 other.txt
 */
const ROWS = flattenTree(TREE, ALL_OPEN);

describe('collapseParent', () => {
  it('lays out the fixture as expected', () => {
    expect(ROWS.map((n) => n.label)).toEqual([
      'proj',
      'src',
      'deep',
      'a.txt',
      'b.txt',
      'top.ts',
      'readme.md',
      'other.txt',
    ]);
  });

  it('closes the directory holding the cursor and lands on it', () => {
    // cursor on b.txt, whose parent is proj/src/deep at row 2
    const res = collapseParent(ROWS, 4, ALL_OPEN);
    expect(res).not.toBeNull();
    expect(res?.cursor).toBe(2);
    expect(res?.expanded.has('proj/src/deep')).toBe(false);
    // ancestors stay open, only the immediate parent closes
    expect(res?.expanded.has('proj/src')).toBe(true);
    expect(res?.expanded.has('proj')).toBe(true);
  });

  it('closes the parent of a directory rather than the directory itself', () => {
    // cursor on deep (row 2); its parent proj/src should close, not deep
    const res = collapseParent(ROWS, 2, ALL_OPEN);
    expect(res?.cursor).toBe(1);
    expect(res?.expanded.has('proj/src')).toBe(false);
    expect(res?.expanded.has('proj/src/deep')).toBe(true);
  });

  it('walks up one level per call', () => {
    const first = collapseParent(ROWS, 4, ALL_OPEN);
    expect(first?.cursor).toBe(2);

    // after the first collapse the visible rows change; recompute them
    const rows2 = flattenTree(TREE, first?.expanded ?? new Set());
    const second = collapseParent(rows2, first?.cursor ?? 0, first?.expanded ?? new Set());
    expect(rows2[second?.cursor ?? -1]?.label).toBe('src');
    expect(second?.expanded.has('proj/src')).toBe(false);
  });

  it('does nothing on a top-level row, which has no parent', () => {
    expect(collapseParent(ROWS, 0, ALL_OPEN)).toBeNull();
    expect(collapseParent(ROWS, 7, ALL_OPEN)).toBeNull();
  });

  it('does nothing when the cursor is out of range', () => {
    expect(collapseParent(ROWS, 99, ALL_OPEN)).toBeNull();
    expect(collapseParent(ROWS, -1, ALL_OPEN)).toBeNull();
  });

  it('does nothing on an empty list', () => {
    expect(collapseParent([], 0, ALL_OPEN)).toBeNull();
  });

  it('leaves the caller-supplied set untouched', () => {
    const original = new Set(ALL_OPEN);
    collapseParent(ROWS, 4, original);
    expect(original).toEqual(ALL_OPEN);
  });

  it('still lands on the parent when that parent was already closed', () => {
    // a defensive case: expanded lacks the parent, but the row is on screen
    const partial = new Set(['proj', 'proj/src']);
    const rows = flattenTree(TREE, partial);
    // rows: proj, src, deep, top.ts, readme.md, other.txt — cursor on deep
    const res = collapseParent(rows, 2, partial);
    expect(res?.cursor).toBe(1);
    expect(res?.expanded.has('proj/src')).toBe(false);
  });
});
