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

export interface ArchiveListing {
  ok: boolean;
  nodes: TreeNode[];
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
    return { ok: false, nodes: [], error: `cannot detect archive format: ${archive}` };
  }
  try {
    const adapter = registry.get(fmt);
    const res = await run(adapter.buildList(archive));
    if (res.exitCode !== 0) {
      const detail = res.stderr.trim() || `exit code ${res.exitCode}`;
      return { ok: false, nodes: [], error: detail };
    }
    return { ok: true, nodes: entriesToFlatNodes(adapter.parseList(res.stdout)) };
  } catch (err) {
    return { ok: false, nodes: [], error: String(err) };
  }
}
