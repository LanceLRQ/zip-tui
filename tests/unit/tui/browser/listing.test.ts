import { describe, expect, it } from 'vitest';
import type { ArchiveEntry } from '../../../../src/engine/types';
import {
  archiveRows,
  childrenOf,
  fsRows,
  PARENT_ID,
  sortRows,
} from '../../../../src/tui/browser/listing';
import { buildArchiveTree } from '../../../../src/tui/components/archiveTree';
import type { TreeNode } from '../../../../src/tui/components/VirtualTree';

function entry(path: string, size = 0): ArchiveEntry {
  return { path, size, isDir: false };
}

function node(id: string, label: string, isDir: boolean, size = 0): TreeNode {
  return { id, label, isDir, size, depth: 0 };
}

const TREE = buildArchiveTree([
  entry('app/vendor/lib.js', 45),
  entry('app/index.js', 12),
  entry('readme.md', 3),
]);

describe('childrenOf', () => {
  it('returns the roots for the empty inner path', () => {
    expect(childrenOf(TREE, '')?.map((n) => n.name)).toEqual(['app', 'readme.md']);
  });

  it('descends one level', () => {
    expect(childrenOf(TREE, 'app')?.map((n) => n.name)).toEqual(['vendor', 'index.js']);
  });

  it('descends several levels', () => {
    expect(childrenOf(TREE, 'app/vendor')?.map((n) => n.name)).toEqual(['lib.js']);
  });

  // a stale inner directory must not crash a render path
  it('returns null for a path that is not in the tree', () => {
    expect(childrenOf(TREE, 'nope/at/all')).toBeNull();
  });

  it('returns null when a mid-path segment exists but is a leaf', () => {
    expect(childrenOf(TREE, 'readme.md/deeper')).toBeNull();
  });

  // location.ts requires innerDir to be normalised; this tolerates slop rather
  // than silently descending to the wrong level
  it('tolerates leading and trailing slashes', () => {
    expect(childrenOf(TREE, '/app/')?.map((n) => n.name)).toEqual(['vendor', 'index.js']);
  });
});

describe('archiveRows', () => {
  it('lists one directory level, not the whole tree', () => {
    expect(archiveRows(TREE, '', false).map((r) => r.label)).toEqual(['app', 'readme.md']);
  });

  // the parent row is what makes archive navigation identical to the
  // filesystem side
  it('prepends a parent row when asked', () => {
    const rows = archiveRows(TREE, 'app', true);
    expect(rows[0]?.id).toBe(PARENT_ID);
    expect(rows[0]?.label).toBe('..');
    expect(rows.map((r) => r.label)).toEqual(['..', 'vendor', 'index.js']);
  });

  it('shows a directory rolled-up size rather than a dash', () => {
    const app = archiveRows(TREE, '', false).find((r) => r.label === 'app');
    expect(app?.sizeLabel).toBe('57 B');
  });

  // nothing inside an archive can be opened as a nested archive
  it('never flags an entry as enterable', () => {
    const nested = buildArchiveTree([entry('inner.zip', 10), entry('a.txt', 1)]);
    expect(archiveRows(nested, '', true).every((r) => r.isArchive === false)).toBe(true);
  });

  // the sentinel must not be forgeable by a real entry: a collision would
  // navigate out instead of descending, and would collide as a React key
  it('cannot be impersonated by a real top-level entry', () => {
    const hostile = buildArchiveTree([entry('//parent', 1), entry(PARENT_ID, 1)]);
    const rows = archiveRows(hostile, '', true);
    expect(rows.filter((r) => r.id === PARENT_ID)).toHaveLength(1);
  });
});

describe('fsRows', () => {
  it('flags entries whose extension names a supported format', () => {
    const rows = fsRows(
      [node('/w/a.zip', 'a.zip', false), node('/w/b.txt', 'b.txt', false)],
      false,
    );
    expect(rows.find((r) => r.label === 'a.zip')?.isArchive).toBe(true);
    expect(rows.find((r) => r.label === 'b.txt')?.isArchive).toBe(false);
  });

  it('recognises two-part extensions', () => {
    expect(fsRows([node('/w/a.tar.gz', 'a.tar.gz', false)], false)[0]?.isArchive).toBe(true);
  });

  // a directory called "stuff.zip" is still a directory
  it('never flags a directory as an archive', () => {
    expect(fsRows([node('/w/stuff.zip', 'stuff.zip', true)], false)[0]?.isArchive).toBe(false);
  });

  it('labels directories with a dash instead of a meaningless zero', () => {
    expect(fsRows([node('/w/src', 'src', true)], false)[0]?.sizeLabel).toBe('-');
  });

  it('formats file sizes', () => {
    expect(fsRows([node('/w/a.bin', 'a.bin', false, 2048)], false)[0]?.sizeLabel).toBe('2.0 K');
  });

  it('prepends a parent row when asked', () => {
    expect(fsRows([node('/w/a.txt', 'a.txt', false)], true)[0]?.id).toBe(PARENT_ID);
  });

  it('still offers the way out of an empty directory', () => {
    expect(fsRows([], true).map((r) => r.id)).toEqual([PARENT_ID]);
  });
});

describe('sortRows', () => {
  const ROWS = fsRows(
    [
      node('/w/small.txt', 'small.txt', false, 10),
      node('/w/huge.txt', 'huge.txt', false, 9000),
      node('/w/dir', 'dir', true, 0),
    ],
    false,
  );

  // no reordering means the caller can keep the same array identity
  it('returns the very same array under the default sort', () => {
    expect(sortRows(ROWS, 'default')).toBe(ROWS);
  });

  it('puts the biggest first when sorting by size', () => {
    expect(sortRows(ROWS, 'size').map((r) => r.label)).toEqual(['huge.txt', 'small.txt', 'dir']);
  });

  // the parent row is navigation, not content — it must not get sorted into
  // the middle of the list
  it('keeps the parent row pinned to the top', () => {
    const withParent = fsRows(
      [node('/w/huge.txt', 'huge.txt', false, 9000), node('/w/a.txt', 'a.txt', false, 1)],
      true,
    );
    expect(sortRows(withParent, 'size')[0]?.id).toBe(PARENT_ID);
  });

  it('breaks ties by name so the order is stable', () => {
    const tied = fsRows(
      [node('/w/z.txt', 'z.txt', false, 5), node('/w/a.txt', 'a.txt', false, 5)],
      false,
    );
    expect(sortRows(tied, 'size').map((r) => r.label)).toEqual(['a.txt', 'z.txt']);
  });

  it('does not mutate the input', () => {
    const before = ROWS.map((r) => r.label);
    sortRows(ROWS, 'size');
    expect(ROWS.map((r) => r.label)).toEqual(before);
  });

  it('handles a listing that is nothing but a parent row', () => {
    const onlyParent = fsRows([], true);
    expect(sortRows(onlyParent, 'size').map((r) => r.id)).toEqual([PARENT_ID]);
  });
});
