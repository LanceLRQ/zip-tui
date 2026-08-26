import { describe, expect, it } from 'vitest';
import type { ArchiveEntry } from '../../../src/engine/types';
import { type ArchiveTreeNode, buildArchiveTree } from '../../../src/tui/components/archiveTree';

function file(path: string, size = 0): ArchiveEntry {
  return { path, size, isDir: false };
}
function dir(path: string): ArchiveEntry {
  return { path, size: 0, isDir: true };
}

/** Compact shape for asserting structure: "name(size)" with children nested. */
function shape(nodes: ArchiveTreeNode[]): string {
  return nodes
    .map((n) =>
      n.children.length > 0 ? `${n.name}(${n.size})[${shape(n.children)}]` : `${n.name}(${n.size})`,
    )
    .join(' ');
}

describe('buildArchiveTree', () => {
  it('keeps flat files at the root', () => {
    expect(shape(buildArchiveTree([file('a.txt', 10), file('b.txt', 20)]))).toBe(
      'a.txt(10) b.txt(20)',
    );
  });

  it('nests files under their directories', () => {
    const tree = buildArchiveTree([dir('src/'), file('src/index.ts', 100)]);
    expect(shape(tree)).toBe('src(100)[index.ts(100)]');
  });

  // archives are not required to list directory entries — `zip -D` omits them
  it('infers intermediate directories that were never listed', () => {
    const tree = buildArchiveTree([file('a/b/c/deep.txt', 42)]);
    expect(shape(tree)).toBe('a(42)[b(42)[c(42)[deep.txt(42)]]]');
  });

  it('does not duplicate a directory that was listed explicitly', () => {
    const tree = buildArchiveTree([dir('docs/'), file('docs/readme.md', 5), dir('docs/')]);
    expect(shape(tree)).toBe('docs(5)[readme.md(5)]');
  });

  it('sums directory sizes recursively', () => {
    const tree = buildArchiveTree([
      file('p/one.txt', 100),
      file('p/sub/two.txt', 20),
      file('p/sub/three.txt', 3),
    ]);
    expect(tree[0]?.size).toBe(123);
    const sub = tree[0]?.children.find((c) => c.name === 'sub');
    expect(sub?.size).toBe(23);
  });

  it('sorts directories before files, each alphabetically', () => {
    const tree = buildArchiveTree([
      file('zebra.txt'),
      file('apple.txt'),
      file('beta/x.txt'),
      file('alpha/y.txt'),
    ]);
    expect(tree.map((n) => n.name)).toEqual(['alpha', 'beta', 'apple.txt', 'zebra.txt']);
  });

  it('strips the trailing slash zip puts on directory names', () => {
    const tree = buildArchiveTree([dir('docs/')]);
    expect(tree[0]?.name).toBe('docs');
    expect(tree[0]?.isDir).toBe(true);
  });

  it('normalises leading ./ and / so they do not become empty levels', () => {
    const tree = buildArchiveTree([file('./a/x.txt', 1), file('/b/y.txt', 2)]);
    expect(tree.map((n) => n.name)).toEqual(['a', 'b']);
  });

  it('collapses repeated separators', () => {
    const tree = buildArchiveTree([file('a//b.txt', 7)]);
    expect(shape(tree)).toBe('a(7)[b.txt(7)]');
  });

  it('marks a node with children as a directory even if listed as a file', () => {
    const tree = buildArchiveTree([file('a'), file('a/b.txt', 3)]);
    expect(tree[0]?.isDir).toBe(true);
  });

  it('records the full path so nodes stay addressable', () => {
    const tree = buildArchiveTree([file('a/b/c.txt', 1)]);
    expect(tree[0]?.path).toBe('a');
    expect(tree[0]?.children[0]?.path).toBe('a/b');
    expect(tree[0]?.children[0]?.children[0]?.path).toBe('a/b/c.txt');
  });

  it('ignores blank paths', () => {
    expect(buildArchiveTree([file(''), file('   ')])).toEqual([]);
  });

  it('returns nothing for an empty archive', () => {
    expect(buildArchiveTree([])).toEqual([]);
  });

  describe('sorting', () => {
    const MIXED = [
      file('small.txt', 10),
      file('huge.txt', 9000),
      file('adir/inner.txt', 500),
      file('zdir/inner.txt', 3000),
    ];

    it('defaults to directories first, then alphabetical', () => {
      expect(buildArchiveTree(MIXED).map((n) => n.name)).toEqual([
        'adir',
        'zdir',
        'huge.txt',
        'small.txt',
      ]);
    });

    // sorting by size is for finding what is big; grouping directories first
    // would hide the largest entries behind them
    it('sorts purely by descending size when asked, without grouping', () => {
      expect(buildArchiveTree(MIXED, 'size').map((n) => n.name)).toEqual([
        'huge.txt',
        'zdir',
        'adir',
        'small.txt',
      ]);
    });

    it('sorts nested levels by size too', () => {
      const tree = buildArchiveTree(
        [file('p/a.txt', 1), file('p/b.txt', 999), file('p/c.txt', 50)],
        'size',
      );
      expect(tree[0]?.children.map((c) => c.name)).toEqual(['b.txt', 'c.txt', 'a.txt']);
    });

    it('falls back to name for entries of equal size, keeping order stable', () => {
      const tree = buildArchiveTree([file('b.txt', 5), file('a.txt', 5), file('c.txt', 5)], 'size');
      expect(tree.map((n) => n.name)).toEqual(['a.txt', 'b.txt', 'c.txt']);
    });
  });

  it('keeps an empty directory visible with zero size', () => {
    const tree = buildArchiveTree([dir('empty/')]);
    expect(shape(tree)).toBe('empty(0)');
    expect(tree[0]?.isDir).toBe(true);
  });
});
