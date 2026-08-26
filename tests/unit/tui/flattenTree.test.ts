import { describe, expect, it } from 'vitest';
import type { ArchiveEntry } from '../../../src/engine/types';
import {
  allDirPaths,
  buildArchiveTree,
  flattenTree,
  initialExpanded,
  parentPathOf,
} from '../../../src/tui/components/archiveTree';

function file(path: string, size = 0): ArchiveEntry {
  return { path, size, isDir: false };
}

const SAMPLE = buildArchiveTree([
  file('proj/readme.md', 10),
  file('proj/src/index.ts', 100),
  file('proj/src/deep/util.ts', 5),
  file('top.txt', 1),
]);

function labels(nodes: ReturnType<typeof flattenTree>): string[] {
  return nodes.map((n) => n.label);
}

describe('flattenTree', () => {
  it('shows only the root level when nothing is expanded', () => {
    expect(labels(flattenTree(SAMPLE, new Set()))).toEqual(['proj', 'top.txt']);
  });

  it('reveals the direct children of an expanded directory', () => {
    expect(labels(flattenTree(SAMPLE, new Set(['proj'])))).toEqual([
      'proj',
      'src',
      'readme.md',
      'top.txt',
    ]);
  });

  it('descends through nested expansions', () => {
    const out = labels(flattenTree(SAMPLE, new Set(['proj', 'proj/src'])));
    expect(out).toEqual(['proj', 'src', 'deep', 'index.ts', 'readme.md', 'top.txt']);
  });

  // a child's expanded flag is irrelevant while its parent is closed
  it('hides descendants of a collapsed ancestor even if they are expanded', () => {
    expect(labels(flattenTree(SAMPLE, new Set(['proj/src'])))).toEqual(['proj', 'top.txt']);
  });

  it('reports depth so the view can indent', () => {
    const out = flattenTree(SAMPLE, new Set(['proj', 'proj/src']));
    const byLabel = Object.fromEntries(out.map((n) => [n.label, n.depth]));
    expect(byLabel.proj).toBe(0);
    expect(byLabel.src).toBe(1);
    expect(byLabel.deep).toBe(2);
  });

  it('flags which directories are open', () => {
    const out = flattenTree(SAMPLE, new Set(['proj']));
    expect(out.find((n) => n.label === 'proj')?.expanded).toBe(true);
    expect(out.find((n) => n.label === 'src')?.expanded).toBe(false);
  });

  it('labels a directory with its rolled-up size rather than a dash', () => {
    const out = flattenTree(SAMPLE, new Set());
    expect(out.find((n) => n.label === 'proj')?.sizeLabel).toBe('115 B');
  });

  it('uses the full path as the id so ids stay unique across levels', () => {
    const out = flattenTree(SAMPLE, new Set(['proj', 'proj/src']));
    expect(out.map((n) => n.id)).toContain('proj/src/deep');
    expect(new Set(out.map((n) => n.id)).size).toBe(out.length);
  });

  it('returns nothing for an empty tree', () => {
    expect(flattenTree([], new Set())).toEqual([]);
  });
});

describe('initialExpanded', () => {
  // most archives wrap everything in one folder; leaving it shut would greet
  // the user with a single useless row
  it('opens a lone root directory', () => {
    expect(initialExpanded(buildArchiveTree([file('proj/a.txt'), file('proj/b.txt')]))).toEqual(
      new Set(['proj']),
    );
  });

  it('leaves things shut when the root holds several entries', () => {
    expect(initialExpanded(SAMPLE)).toEqual(new Set());
  });

  it('does not try to open a lone root file', () => {
    expect(initialExpanded(buildArchiveTree([file('only.txt')]))).toEqual(new Set());
  });

  it('handles an empty tree', () => {
    expect(initialExpanded([])).toEqual(new Set());
  });
});

describe('allDirPaths', () => {
  it('collects every directory at every depth', () => {
    expect(allDirPaths(SAMPLE)).toEqual(new Set(['proj', 'proj/src', 'proj/src/deep']));
  });

  it('ignores files', () => {
    expect(allDirPaths(buildArchiveTree([file('a.txt'), file('b.txt')]))).toEqual(new Set());
  });

  it('handles an empty tree', () => {
    expect(allDirPaths([])).toEqual(new Set());
  });

  it('expands the whole tree when used as the expanded set', () => {
    const rows = flattenTree(SAMPLE, allDirPaths(SAMPLE));
    expect(rows.map((n) => n.label)).toEqual([
      'proj',
      'src',
      'deep',
      'util.ts',
      'index.ts',
      'readme.md',
      'top.txt',
    ]);
  });
});

describe('parentPathOf', () => {
  it('drops the last segment', () => {
    expect(parentPathOf('a/b/c.txt')).toBe('a/b');
    expect(parentPathOf('a/b')).toBe('a');
  });

  it('returns null at the top level, where there is no parent to step out to', () => {
    expect(parentPathOf('a')).toBeNull();
    expect(parentPathOf('')).toBeNull();
  });
});
