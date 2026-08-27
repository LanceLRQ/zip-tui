import { detectFormatFromExtension } from '../../engine/detector.js';
import { type ArchiveTreeNode, formatSize, type SortBy } from '../components/archiveTree.js';
import type { TreeNode } from '../components/VirtualTree.js';

/**
 * Row id of the ".." entry.
 *
 * A doubled slash cannot occur in any real id: archive paths are rebuilt from
 * filtered segments joined singly, and `path.join` collapses separators. That
 * makes this collision-proof rather than merely improbable, which matters
 * because a collision would be silent — the duplicate row would navigate out
 * instead of descending, and would lose its checkbox in the list.
 *
 * The id is never displayed; the row renders its own `..` label.
 */
export const PARENT_ID = '//parent';

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
 * Returns null when the path does not resolve, so a caller can tell a stale
 * inner directory from a genuinely empty one — the same `null`-means-nothing-
 * to-do idiom `goUp` and `collapseParent` use. Both cases look identical
 * otherwise, and a stale path is a state bug worth surfacing rather than
 * rendering as an empty listing.
 */
export function childrenOf(
  tree: readonly ArchiveTreeNode[],
  innerDir: string,
): readonly ArchiveTreeNode[] | null {
  if (innerDir === '') return tree;
  let level: readonly ArchiveTreeNode[] = tree;
  for (const segment of innerDir.split('/').filter((s) => s !== '')) {
    const next = level.find((n) => n.name === segment);
    if (!next) return null;
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
  const children = childrenOf(tree, innerDir);
  // a stale inner path still offers the way out rather than a bare empty screen
  if (children === null) return rows;
  for (const n of children) {
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
      // this is a flat one-level listing whatever the input carried
      depth: 0,
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
 * the array unchanged rather than copying it. No consumer depends on that
 * identity yet; it costs nothing and keeps the door open for a memoised list.
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
