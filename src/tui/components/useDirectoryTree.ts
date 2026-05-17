import fs from 'node:fs';
import path from 'node:path';
import type { TreeNode } from './VirtualTree.js';

export interface ListOpts {
  depth: number;
  showHidden: boolean;
}

export function listDirectoryAsNodes(dir: string, opts: ListOpts): TreeNode[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out: TreeNode[] = [];
  for (const e of entries) {
    if (!opts.showHidden && e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    let size = 0;
    try {
      size = e.isFile() ? fs.statSync(full).size : 0;
    } catch {
      // ignore
    }
    out.push({
      id: full,
      label: e.name,
      isDir: e.isDirectory(),
      size,
      depth: opts.depth,
    });
  }
  out.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
  return out;
}
