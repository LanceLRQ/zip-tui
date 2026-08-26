import type { ArchiveEntry } from '../types.js';
import { parseBsdDateTime, parseIsoDateTime } from './dateUtils.js';

/**
 * `tar -tvf` has no stable output format across implementations:
 *
 *   GNU        drwxr-xr-x user/group    0 2026-08-26 11:02 d/
 *   BSD        drwxr-xr-x  0 user group 0 Aug 26 11:02 d/
 *   BSD (zh)   drwxr-xr-x  0 user group 0  8月 26 11:02 d/
 *   BSD (old)  -rw-r--r--  0 user group 4 Jan  1  2024 d/old.txt
 *
 * The owner/group columns and the date rendering both vary, so the parser
 * anchors on what is invariant: a mode string, then a size immediately before
 * a timestamp, then the name. BSD swaps the clock for a year on files older
 * than roughly six months, hence the time-or-year alternation.
 */
const ENTRY = new RegExp(
  [
    '^([dlbcps-][rwxsStT-]{9})', // mode
    '\\s+.*?', // owner / group / link count — layout varies
    '(\\d+)', // size, always just before the timestamp
    '\\s+(',
    '\\d{4}-\\d{2}-\\d{2}\\s+\\d{1,2}:\\d{2}', // GNU: ISO date + time
    '|',
    '\\S+\\s+\\d{1,2}\\s+(?:\\d{1,2}:\\d{2}|\\d{4})', // BSD: month day, then time or year
    ')\\s+',
    '(.+)$', // name, may contain spaces
  ].join(''),
);

export function parseTarVerboseListing(stdout: string): ArchiveEntry[] {
  const out: ArchiveEntry[] = [];
  for (const line of stdout.split('\n')) {
    const m = line.match(ENTRY);
    if (!m) continue;
    const mode = m[1] ?? '';
    const size = Number.parseInt(m[2] ?? '0', 10);
    const stamp = (m[3] ?? '').trim();
    let filePath = (m[4] ?? '').trim();
    if (filePath === '') continue;

    // symlink rows read "name -> target"; only split them, so an arrow inside
    // an ordinary file name survives untouched
    let linkTarget: string | undefined;
    if (mode.startsWith('l')) {
      const arrow = filePath.indexOf(' -> ');
      if (arrow > 0) {
        linkTarget = filePath.slice(arrow + 4).trim();
        filePath = filePath.slice(0, arrow).trim();
      }
    }
    // GNU's ISO form is exact; BSD's is lossy but still recoverable for the
    // locales we know, and falls back to raw text otherwise
    const modified = parseIsoDateTime(stamp) ?? parseBsdDateTime(stamp);
    out.push({
      path: filePath,
      size,
      isDir: mode.startsWith('d'),
      ...(modified ? { modified } : {}),
      ...(stamp ? { modifiedText: stamp } : {}),
      ...(linkTarget ? { linkTarget } : {}),
    });
  }
  return out;
}
