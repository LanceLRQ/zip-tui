import type { ArchiveEntry } from '../types.js';

export function parseTarVerboseListing(stdout: string): ArchiveEntry[] {
  const out: ArchiveEntry[] = [];
  for (const line of stdout.split('\n')) {
    const m = line.match(/^([dlrwx-]{10})\s+\S+\s+(\d+)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.+)$/);
    if (!m) continue;
    const perm = m[1] ?? '';
    const size = Number.parseInt(m[2] ?? '0', 10);
    const filePath = (m[3] ?? '').trim();
    out.push({ path: filePath, size, isDir: perm.startsWith('d') });
  }
  return out;
}
