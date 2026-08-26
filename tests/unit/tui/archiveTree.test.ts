import { describe, expect, it } from 'vitest';
import type { ArchiveEntry } from '../../../src/engine/types';
import { entriesToFlatNodes, formatSize } from '../../../src/tui/components/archiveTree';

function entry(path: string, size = 0, isDir = false): ArchiveEntry {
  return { path, size, isDir };
}

describe('formatSize', () => {
  it('renders bytes under 1 KiB verbatim', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(1)).toBe('1 B');
    expect(formatSize(1023)).toBe('1023 B');
  });

  it('scales to KiB / MiB / GiB with one decimal', () => {
    expect(formatSize(1024)).toBe('1.0 K');
    expect(formatSize(1536)).toBe('1.5 K');
    expect(formatSize(1024 * 1024)).toBe('1.0 M');
    expect(formatSize(1024 * 1024 * 1024)).toBe('1.0 G');
  });

  it('keeps large values in the largest unit rather than overflowing', () => {
    expect(formatSize(1024 ** 4)).toBe('1024.0 G');
  });
});

describe('entriesToFlatNodes', () => {
  it('maps each entry to a node keyed by its path', () => {
    const nodes = entriesToFlatNodes([entry('a.txt', 10), entry('b/c.txt', 20)]);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ id: 'a.txt', label: 'a.txt', size: 10, isDir: false });
    expect(nodes[1]).toMatchObject({ id: 'b/c.txt', label: 'b/c.txt', size: 20 });
  });

  it('preserves the archive ordering rather than sorting', () => {
    const nodes = entriesToFlatNodes([entry('z.txt'), entry('a.txt'), entry('m.txt')]);
    expect(nodes.map((n) => n.label)).toEqual(['z.txt', 'a.txt', 'm.txt']);
  });

  it('flags directory entries and keeps their trailing slash visible', () => {
    const nodes = entriesToFlatNodes([entry('docs/', 0, true)]);
    expect(nodes[0]?.isDir).toBe(true);
    expect(nodes[0]?.label).toBe('docs/');
  });

  it('renders every node at depth 0 so the flat view stays unindented', () => {
    const nodes = entriesToFlatNodes([entry('a/b/c/d.txt')]);
    expect(nodes[0]?.depth).toBe(0);
  });

  it('drops duplicate paths so VirtualTree keys stay unique', () => {
    const nodes = entriesToFlatNodes([entry('dup.txt', 1), entry('dup.txt', 2)]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.size).toBe(1);
  });

  it('skips entries with an empty path', () => {
    expect(entriesToFlatNodes([entry(''), entry('  ')])).toEqual([]);
  });

  it('returns an empty list for an empty archive', () => {
    expect(entriesToFlatNodes([])).toEqual([]);
  });

  it('sorts by descending size when asked', () => {
    const nodes = entriesToFlatNodes(
      [entry('small.txt', 10), entry('huge.txt', 9000), entry('mid.txt', 500)],
      'size',
    );
    expect(nodes.map((n) => n.label)).toEqual(['huge.txt', 'mid.txt', 'small.txt']);
  });

  it('keeps the archive order under the default sort', () => {
    const nodes = entriesToFlatNodes([entry('z.txt', 1), entry('a.txt', 9000)], 'default');
    expect(nodes.map((n) => n.label)).toEqual(['z.txt', 'a.txt']);
  });

  it('attaches a formatted size label to files', () => {
    const nodes = entriesToFlatNodes([entry('a.txt', 2048)]);
    expect(nodes[0]?.sizeLabel).toBe('2.0 K');
  });

  it('labels directories with a dash instead of a meaningless zero', () => {
    const nodes = entriesToFlatNodes([entry('docs/', 0, true)]);
    expect(nodes[0]?.sizeLabel).toBe('-');
  });
});
