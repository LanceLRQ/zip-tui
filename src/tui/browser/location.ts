import path from 'node:path';
import { parentPathOf } from '../components/archiveTree.js';

/**
 * Where the browser currently is.
 *
 * These two kinds are what the whole UI derives from: the filesystem holds
 * material to compress, an archive's interior is a source to extract from.
 * There is deliberately no "compress mode" or "extract mode" — the address
 * decides what the situation is, and the address bar shows it.
 */
export type Location =
  | { kind: 'fs'; dir: string }
  | { kind: 'archive'; archivePath: string; innerDir: string };

export function fsLocation(dir: string): Location {
  return { kind: 'fs', dir };
}

export function archiveLocation(archivePath: string, innerDir = ''): Location {
  return { kind: 'archive', archivePath, innerDir };
}

/** True at the filesystem root, where there is no parent left to step out to. */
export function isFsRoot(dir: string): boolean {
  return path.parse(dir).root === dir;
}

/**
 * Descends into a child directory.
 *
 * `nodeId` is whatever the highlighted row carries: an absolute path on the
 * filesystem side, an archive-internal path inside a package. Either way it is
 * already the full identifier of the new location, so nothing needs joining.
 */
export function enterDir(loc: Location, nodeId: string): Location {
  if (loc.kind === 'fs') return { kind: 'fs', dir: nodeId };
  return { kind: 'archive', archivePath: loc.archivePath, innerDir: nodeId };
}

/** Opens an archive found on the filesystem, landing at its root. */
export function enterArchive(archivePath: string): Location {
  return { kind: 'archive', archivePath, innerDir: '' };
}

export interface GoUpResult {
  location: Location;
  /** Row to put the cursor on — always whatever we just came out of. */
  focusId: string;
}

/**
 * Steps out one level.
 *
 * Leaving an archive's root lands back on the filesystem with the cursor on
 * the package itself, so the user keeps their bearings instead of being
 * dropped at the top of an unfamiliar directory.
 *
 * Returns null only at the filesystem root, so the caller can leave the key
 * press unhandled rather than doing something arbitrary.
 */
export function goUp(loc: Location): GoUpResult | null {
  if (loc.kind === 'fs') {
    if (isFsRoot(loc.dir)) return null;
    return { location: { kind: 'fs', dir: path.dirname(loc.dir) }, focusId: loc.dir };
  }
  if (loc.innerDir !== '') {
    return {
      location: {
        kind: 'archive',
        archivePath: loc.archivePath,
        innerDir: parentPathOf(loc.innerDir) ?? '',
      },
      focusId: loc.innerDir,
    };
  }
  return {
    location: { kind: 'fs', dir: path.dirname(loc.archivePath) },
    focusId: loc.archivePath,
  };
}

/** Path text for the address bar; the caller prepends the icon. */
export function locationLabel(loc: Location): string {
  if (loc.kind === 'fs') return loc.dir;
  return loc.innerDir === '' ? loc.archivePath : `${loc.archivePath} › ${loc.innerDir}`;
}
