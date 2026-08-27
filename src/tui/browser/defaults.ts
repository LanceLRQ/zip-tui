import path from 'node:path';
import { defaultArchiveName, FORMAT_EXTENSIONS, type FormatId } from '../../engine/types.js';
import { type ArchiveTreeNode, hasSingleRootDir } from '../components/archiveTree.js';
import type { SelectionItem } from './selection.js';

const dotCount = (ext: string): number => ext.split('.').length;

// most specific first: more segments beats fewer, so ".tar.gz" is tried before
// the ".gz" it ends with. Length only breaks ties within the same depth.
const KNOWN_EXTENSIONS: readonly string[] = Object.values(FORMAT_EXTENSIONS)
  .flat()
  .sort((a, b) => dotCount(b) - dotCount(a) || b.length - a.length);

/**
 * Removes a trailing archive extension, including two-part ones.
 *
 * The longest matching extension wins and the decision is made once — falling
 * through to a shorter one would slice `.tar.gz` against its `.gz` tail and
 * leave a stray `.tar`.
 *
 * An unknown extension is trimmed by the ordinary last-dot rule, so `notes.md`
 * still yields `notes`. A name that is nothing but an extension is left alone
 * rather than reduced to an empty string.
 */
export function stripArchiveExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  // KNOWN_EXTENSIONS is most-specific-first, so the first hit is the answer
  const match = KNOWN_EXTENSIONS.find((ext) => lower.endsWith(ext));
  if (match) {
    return fileName.length > match.length
      ? fileName.slice(0, fileName.length - match.length)
      : fileName;
  }
  const parsed = path.parse(fileName);
  return parsed.name === '' ? fileName : parsed.name;
}

/**
 * Where extracting `archivePath` should put its contents.
 *
 * An archive that already wraps everything in one directory extracts straight
 * into the archive's own folder — adding a wrapper would only bury it a level
 * deeper. Anything else gets a folder named after the archive, so loose files
 * do not scatter over whatever is already sitting there.
 *
 * Because the answer depends on the contents, the caller has to list the
 * archive first, and must show the resulting path before running anything.
 *
 * The returned directory may already exist, and this does not check. Extraction
 * runs `unzip -o` and its equivalents, which overwrite colliding files without
 * prompting, so the caller must stat the path and confirm with the user before
 * running anything.
 *
 * `tree` must come from a listing that succeeded. A failed listing also yields
 * an empty entry list, and this cannot tell the two apart — it would report
 * loose contents for an archive it could not read.
 */
export function defaultExtractDir(archivePath: string, tree: readonly ArchiveTreeNode[]): string {
  const dir = path.dirname(archivePath);
  if (hasSingleRootDir(tree)) return dir;
  return path.join(dir, stripArchiveExtension(path.basename(archivePath)));
}

/**
 * Default name for a new archive.
 *
 * One selected item lends its own name; several take the name of the directory
 * being browsed. This is what GUI archivers do, and it beats a generic
 * "archive.7z" that says nothing about the contents.
 *
 * A lone file loses its own extension first, so a Markdown file becomes
 * `README.zip` rather than `README.md.zip`. A lone directory keeps its name
 * whole, since a dot in a directory name is not an extension.
 *
 * Returns a bare filename, not a path — the caller joins it to a directory.
 * The name may collide with an existing archive, and this does not check:
 * `zip -r` merges into an existing file rather than replacing it, so a stale
 * archive would silently absorb the new entries. The caller must stat first.
 */
export function suggestArchiveName(
  selection: readonly SelectionItem[],
  browseDir: string,
  format: FormatId,
): string {
  const ext = FORMAT_EXTENSIONS[format][0] ?? '';
  const only = selection.length === 1 ? selection[0] : undefined;
  const raw = only
    ? only.isDir
      ? path.basename(only.path)
      : stripArchiveExtension(path.basename(only.path))
    : path.basename(browseDir);
  // the filesystem root has no basename to borrow
  return raw === '' ? defaultArchiveName(format) : `${raw}${ext}`;
}
