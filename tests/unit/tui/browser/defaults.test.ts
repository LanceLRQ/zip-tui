import { describe, expect, it } from 'vitest';
import type { ArchiveEntry } from '../../../../src/engine/types';
import {
  defaultExtractDir,
  stripArchiveExtension,
  suggestArchiveName,
} from '../../../../src/tui/browser/defaults';
import type { SelectionItem } from '../../../../src/tui/browser/selection';
import { buildArchiveTree } from '../../../../src/tui/components/archiveTree';

function file(path: string, size = 0): ArchiveEntry {
  return { path, size, isDir: false };
}

function item(path: string, isDir: boolean): SelectionItem {
  return { path, isDir, size: 0 };
}

describe('stripArchiveExtension', () => {
  it('strips a single extension', () => {
    expect(stripArchiveExtension('release.zip')).toBe('release');
    expect(stripArchiveExtension('release.7z')).toBe('release');
  });

  // ".tar.gz" must win over ".gz", or the result keeps a stray ".tar"
  it('strips a two-part extension whole', () => {
    expect(stripArchiveExtension('release.tar.gz')).toBe('release');
    expect(stripArchiveExtension('release.tar.zst')).toBe('release');
  });

  it('strips the short aliases too', () => {
    expect(stripArchiveExtension('release.tgz')).toBe('release');
  });

  it('is case-insensitive about the extension but preserves the stem', () => {
    expect(stripArchiveExtension('Release.ZIP')).toBe('Release');
  });

  it('falls back to the ordinary last-dot rule for an unknown extension', () => {
    expect(stripArchiveExtension('notes.md')).toBe('notes');
  });

  it('leaves a name with no extension alone', () => {
    expect(stripArchiveExtension('README')).toBe('README');
  });

  // a dotfile named exactly like an extension must not become an empty string
  it('refuses to strip a name down to nothing', () => {
    expect(stripArchiveExtension('.gz')).toBe('.gz');
  });
});

describe('defaultExtractDir', () => {
  // the package already provides the wrapper; adding another only buries it
  it('extracts beside the archive when it wraps everything in one folder', () => {
    const tree = buildArchiveTree([file('app/index.js'), file('app/style.css')]);
    expect(defaultExtractDir('/dl/release.zip', tree)).toBe('/dl');
  });

  it('creates a folder named after the archive when the contents are loose', () => {
    const tree = buildArchiveTree([file('a.jpg'), file('b.jpg')]);
    expect(defaultExtractDir('/dl/photos.zip', tree)).toBe('/dl/photos');
  });

  it('strips a two-part extension when naming that folder', () => {
    const tree = buildArchiveTree([file('a.txt'), file('b.txt')]);
    expect(defaultExtractDir('/dl/backup.tar.gz', tree)).toBe('/dl/backup');
  });

  // a lone top-level file is not a wrapper — it still needs somewhere to land
  it('creates a folder for an archive holding a single loose file', () => {
    const tree = buildArchiveTree([file('only.txt')]);
    expect(defaultExtractDir('/dl/single.zip', tree)).toBe('/dl/single');
  });

  it('treats an empty archive as loose contents', () => {
    expect(defaultExtractDir('/dl/empty.zip', [])).toBe('/dl/empty');
  });
});

describe('suggestArchiveName', () => {
  it('uses a lone selected directory name as-is', () => {
    expect(suggestArchiveName([item('/work/proj/src', true)], '/work/proj', '7z')).toBe('src.7z');
  });

  // a file's own extension would otherwise survive into "README.md.7z"
  it('drops a lone selected file extension', () => {
    expect(suggestArchiveName([item('/work/proj/README.md', false)], '/work/proj', 'zip')).toBe(
      'README.zip',
    );
  });

  it('falls back to the browsed directory name when several are selected', () => {
    const sel = [item('/work/proj/src', true), item('/work/proj/docs', true)];
    expect(suggestArchiveName(sel, '/work/proj', '7z')).toBe('proj.7z');
  });

  it('falls back to the browsed directory name when nothing is selected', () => {
    expect(suggestArchiveName([], '/work/proj', 'tar.gz')).toBe('proj.tar.gz');
  });

  it('uses a generic stem at the filesystem root, which has no name', () => {
    expect(suggestArchiveName([], '/', '7z')).toBe('archive.7z');
  });
});
