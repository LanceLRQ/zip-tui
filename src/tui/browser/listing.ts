import { detectFormatFromExtension } from '../../engine/detector.js';
import { type ArchiveTreeNode, formatSize, type SortBy } from '../components/archiveTree.js';
import type { TreeNode } from '../components/VirtualTree.js';

/**
 * Row id of the ".." entry.
 *
 * Filesystem rows are keyed by absolute path so they can never collide with
 * this. Archive rows are keyed by the archive-internal path, so a package
 * holding a top-level entry named exactly `__parent__` would — the sentinel is
 * kept deliberately unlikely rather than made impossible, because a real id
 * has to survive being rendered and compared as a plain string.
 */
export const PARENT_ID = '__parent__';

export interface BrowserRow extends TreeNode {
  /** True when pressing Enter here opens a package rather than a directory. */
  isArchive: boolean;
}

function parentRow(): BrowserRow {
  return {
    id: PARENT_ID,
    label: '..',
    isDir: true,
    size: 0,
    depth: 0,
    sizeLabel: '-',
    isArchive: false,
  };
}

/**
 * The nodes directly under `innerDir`, one level deep.
 *
 * An unknown path yields nothing rather than throwing, because this runs in a
 * render path: a stale inner directory should show an empty listing, not crash
 * the app.
 */
export function childrenOf(
  tree: readonly ArchiveTreeNode[],
  innerDir: string,
): readonly ArchiveTreeNode[] {
  if (innerDir === '') return tree;
  let level: readonly ArchiveTreeNode[] = tree;
  for (const segment of innerDir.split('/').filter((s) => s !== '')) {
    const next = level.find((n) => n.name === segment);
    if (!next) return [];
    level = next.children;
  }
  return level;
}

/**
 * Rows for an archive's interior, one directory at a time.
 *
 * The `..` row is what makes this identical to the filesystem side — the point
 * of per-directory navigation is that the arrow keys mean the same thing
 * wherever you are.
 */
export function archiveRows(
  tree: readonly ArchiveTreeNode[],
  innerDir: string,
  withParent: boolean,
): BrowserRow[] {
  const rows: BrowserRow[] = withParent ? [parentRow()] : [];
  for (const n of childrenOf(tree, innerDir)) {
    rows.push({
      id: n.path,
      label: n.name,
      isDir: n.isDir,
      size: n.size,
      depth: 0,
      // a directory's size here is the rolled-up subtree, which is worth showing
      sizeLabel: formatSize(n.size),
      // an archive nested inside another archive cannot be opened in place
      isArchive: false,
    });
  }
  return rows;
}

/**
 * Decorates filesystem entries with whether they can be opened as archives.
 *
 * The IO stays in the caller — this takes whatever `listDirectoryAsNodes`
 * produced — so the decision logic remains pure and testable.
 */
export function fsRows(nodes: readonly TreeNode[], withParent: boolean): BrowserRow[] {
  const rows: BrowserRow[] = withParent ? [parentRow()] : [];
  for (const n of nodes) {
    rows.push({
      ...n,
      // a directory's own byte count is always 0 and says nothing useful
      sizeLabel: n.isDir ? '-' : formatSize(n.size),
      isArchive: !n.isDir && Boolean(detectFormatFromExtension(n.label)),
    });
  }
  return rows;
}

/**
 * Reorders a listing.
 *
 * `default` keeps whatever order the producer chose — directories first by
 * name on the filesystem, the tree's own order inside an archive — and returns
 * the array unchanged, so a caller holding it in React state sees no new
 * identity on a re-render that did not reorder anything.
 *
 * `size` abandons that grouping: the reason to sort by size is to find what is
 * taking up room, and pinning directories to the top would bury exactly that.
 *
 * The parent row is navigation rather than content, so it stays at the top
 * however the rest is ordered.
 */
export function sortRows(rows: readonly BrowserRow[], by: SortBy): readonly BrowserRow[] {
  if (by === 'default') return rows;
  const parent = rows.filter((r) => r.id === PARENT_ID);
  const rest = rows
    .filter((r) => r.id !== PARENT_ID)
    .sort((a, b) => (a.size !== b.size ? b.size - a.size : a.label.localeCompare(b.label)));
  return [...parent, ...rest];
}
