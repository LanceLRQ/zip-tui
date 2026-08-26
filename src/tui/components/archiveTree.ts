import { detectFormatFromExtension } from '../../engine/detector.js';
import type { RunResult } from '../../engine/executor.js';
import type { FormatRegistry } from '../../engine/registry.js';
import type { ArchiveEntry, BuiltCommand } from '../../engine/types.js';
import type { TreeNode } from './VirtualTree.js';

const UNITS = ['B', 'K', 'M', 'G'] as const;

export function formatSize(bytes: number): string {
  let value = bytes;
  let unit = 0;
  // stop at the largest known unit so petabyte-scale archives read as "1024.0 G"
  // rather than falling off the end of the table
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return unit === 0 ? `${value} B` : `${value.toFixed(1)} ${UNITS[unit]}`;
}

/**
 * Flat listing: one node per archive entry, showing the full stored path.
 * Archive order is preserved — it reflects how the tool laid the entries out.
 */
export function entriesToFlatNodes(entries: ArchiveEntry[]): TreeNode[] {
  const out: TreeNode[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    const p = e.path.trim();
    if (p === '' || seen.has(p)) continue;
    seen.add(p);
    out.push({
      id: p,
      label: p,
      isDir: e.isDir,
      size: e.size,
      depth: 0,
      // a directory's own byte count is always 0 and says nothing useful
      sizeLabel: e.isDir ? '-' : formatSize(e.size),
    });
  }
  return out;
}

export interface ArchiveTreeNode {
  /** Full path inside the archive; unique, and used as the node's id. */
  path: string;
  /** Last path segment — what the tree view shows. */
  name: string;
  isDir: boolean;
  /** Own size for a file; the sum of the subtree for a directory. */
  size: number;
  children: ArchiveTreeNode[];
}

interface MutableNode extends ArchiveTreeNode {
  children: MutableNode[];
  childIndex: Map<string, MutableNode>;
}

function makeNode(path: string, name: string, isDir: boolean): MutableNode {
  return { path, name, isDir, size: 0, children: [], childIndex: new Map() };
}

/**
 * Splits an archive path into clean segments.
 *
 * Tools are inconsistent about how they render paths: zip suffixes directories
 * with a slash, some tars prefix `./`, and absolute inputs can leave a leading
 * slash behind. Empty segments from any of these would otherwise become
 * nameless tree levels.
 */
function segmentsOf(rawPath: string): string[] {
  return rawPath
    .trim()
    .split('/')
    .filter((s) => s !== '' && s !== '.');
}

/** Directories first, then files; alphabetical within each group. */
function sortTree(nodes: MutableNode[]): void {
  nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const n of nodes) sortTree(n.children);
}

/** Rolls file sizes up into every ancestor directory, returning the subtotal. */
function accumulateSizes(nodes: MutableNode[]): number {
  let total = 0;
  for (const n of nodes) {
    if (n.children.length > 0) {
      // a directory's own reported size is always 0, so the subtree is the
      // only meaningful figure
      n.size = accumulateSizes(n.children);
    }
    total += n.size;
  }
  return total;
}

function strip(node: MutableNode): ArchiveTreeNode {
  return {
    path: node.path,
    name: node.name,
    isDir: node.isDir,
    size: node.size,
    children: node.children.map(strip),
  };
}

/**
 * Turns a flat entry list into a directory tree.
 *
 * Intermediate directories are inferred from the paths themselves, because an
 * archive is not obliged to contain entries for them — `zip -D` omits them
 * entirely, and relying on them would silently drop whole branches.
 */
export function buildArchiveTree(entries: ArchiveEntry[]): ArchiveTreeNode[] {
  const roots: MutableNode[] = [];
  const rootIndex = new Map<string, MutableNode>();

  for (const entry of entries) {
    const segments = segmentsOf(entry.path);
    if (segments.length === 0) continue;

    let siblings = roots;
    let index = rootIndex;
    let prefix = '';

    segments.forEach((segment, depth) => {
      const isLast = depth === segments.length - 1;
      prefix = prefix === '' ? segment : `${prefix}/${segment}`;
      let node = index.get(segment);
      if (!node) {
        // anything that still has a path below it is a directory, whatever the
        // entry claimed to be
        node = makeNode(prefix, segment, !isLast || entry.isDir);
        index.set(segment, node);
        siblings.push(node);
      } else if (!isLast) {
        node.isDir = true;
      }
      if (isLast && !entry.isDir) node.size = entry.size;
      siblings = node.children;
      index = node.childIndex;
    });
  }

  accumulateSizes(roots);
  sortTree(roots);
  return roots.map(strip);
}

/**
 * Flattens the tree into the rows the view renders, descending only into
 * directories present in `expanded`.
 *
 * A node under a closed ancestor stays hidden regardless of its own state, so
 * reopening a directory restores whatever was expanded inside it.
 */
export function flattenTree(
  tree: readonly ArchiveTreeNode[],
  expanded: ReadonlySet<string>,
  depth = 0,
): TreeNode[] {
  const out: TreeNode[] = [];
  for (const node of tree) {
    const isOpen = node.isDir && expanded.has(node.path);
    out.push({
      id: node.path,
      label: node.name,
      isDir: node.isDir,
      size: node.size,
      depth,
      expanded: isOpen,
      sizeLabel: formatSize(node.size),
    });
    if (isOpen) out.push(...flattenTree(node.children, expanded, depth + 1));
  }
  return out;
}

/**
 * Which directories start out open.
 *
 * Archives usually wrap their contents in a single folder; leaving that shut
 * would show the user one useless row, so it opens by default. Anything with a
 * broader root stays closed to keep the first screen readable.
 */
export function initialExpanded(tree: readonly ArchiveTreeNode[]): Set<string> {
  const only = tree.length === 1 ? tree[0] : undefined;
  return only?.isDir ? new Set([only.path]) : new Set();
}

/** Enclosing directory of an archive path, or null for a top-level entry. */
export function parentPathOf(nodePath: string): string | null {
  const cut = nodePath.lastIndexOf('/');
  return cut <= 0 ? null : nodePath.slice(0, cut);
}

export interface CollapseParentResult {
  expanded: Set<string>;
  cursor: number;
}

/**
 * Closes the directory containing the cursor and moves the cursor onto it.
 *
 * Deep inside a long directory you would otherwise have to scroll all the way
 * back up to the folder row before you could close it. Repeated calls walk up
 * one level at a time.
 *
 * Returns null when there is nothing to do — a top-level row has no parent —
 * so the caller can leave the key press unhandled.
 *
 * The parent's row index is unaffected by the collapse (nothing above it
 * changes), so the index found here stays correct once the list re-renders.
 */
export function collapseParent(
  nodes: readonly TreeNode[],
  cursor: number,
  expanded: ReadonlySet<string>,
): CollapseParentResult | null {
  const node = nodes[cursor];
  if (!node) return null;
  const parent = parentPathOf(node.id);
  if (parent === null) return null;
  const parentIndex = nodes.findIndex((n) => n.id === parent);
  if (parentIndex < 0) return null;
  const next = new Set(expanded);
  next.delete(parent);
  return { expanded: next, cursor: parentIndex };
}

export interface ArchiveListing {
  ok: boolean;
  /** Raw entries; the caller decides whether to show them flat or as a tree. */
  entries: ArchiveEntry[];
  error?: string;
}

/**
 * Runs the archive's list command and turns the output into nodes.
 *
 * Never throws: a bad extension, a non-zero exit, or a failed spawn all come
 * back as `ok: false` with a message, because the caller is a render path.
 * The runner is injected so this stays testable without spawning anything.
 */
export async function loadArchiveListing(
  archive: string,
  registry: FormatRegistry,
  run: (c: BuiltCommand) => Promise<RunResult>,
): Promise<ArchiveListing> {
  const fmt = detectFormatFromExtension(archive);
  if (!fmt) {
    return { ok: false, entries: [], error: `cannot detect archive format: ${archive}` };
  }
  try {
    const adapter = registry.get(fmt);
    const res = await run(adapter.buildList(archive));
    if (res.exitCode !== 0) {
      const detail = res.stderr.trim() || `exit code ${res.exitCode}`;
      return { ok: false, entries: [], error: detail };
    }
    return { ok: true, entries: adapter.parseList(res.stdout) };
  } catch (err) {
    return { ok: false, entries: [], error: String(err) };
  }
}
