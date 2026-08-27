import path from 'node:path';
import { FORMAT_EXTENSIONS, type FormatId } from '../../engine/types.js';
import { type ArchiveTreeNode, hasSingleRootDir } from '../components/archiveTree.js';
import type { SelectionItem } from './selection.js';

// longest first, so ".tar.gz" is matched before the ".gz" it ends with
const KNOWN_EXTENSIONS: readonly string[] = Object.values(FORMAT_EXTENSIONS)
  .flat()
  .sort((a, b) => b.length - a.length);

/**
 * Removes a trailing archive extension, including two-part ones.
 *
 * An unknown extension is trimmed by the ordinary last-dot rule, so `notes.md`
 * still yields `notes`. A name that is nothing but an extension is left alone
 * rather than reduced to an empty string.
 */
export function stripArchiveExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  for (const ext of KNOWN_EXTENSIONS) {
    // length is measured on the original throughout: lower-casing can change
    // it for some scripts, and a mismatched index would slice the wrong place
    if (lower.endsWith(ext) && fileName.length > ext.length) {
      return fileName.slice(0, fileName.length - ext.length);
    }
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
  return `${raw === '' ? 'archive' : raw}${ext}`;
}
