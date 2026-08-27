import { describe, expect, it } from 'vitest';
import {
  archiveLocation,
  enterArchive,
  enterDir,
  fsLocation,
  goUp,
  isFsRoot,
  locationLabel,
} from '../../../../src/tui/browser/location';

describe('enterDir', () => {
  it('takes the row id as the new filesystem directory', () => {
    expect(enterDir(fsLocation('/a'), '/a/b')).toEqual({ kind: 'fs', dir: '/a/b' });
  });

  it('takes the row id as the new inner directory, keeping the archive', () => {
    expect(enterDir(archiveLocation('/a/x.zip', 'app'), 'app/vendor')).toEqual({
      kind: 'archive',
      archivePath: '/a/x.zip',
      innerDir: 'app/vendor',
    });
  });
});

describe('archiveLocation', () => {
  // every other call site passes innerDir explicitly, so the default would
  // otherwise go unexercised — and coverage does not flag it
  it('defaults to the archive root', () => {
    expect(archiveLocation('/a/x.zip')).toEqual({
      kind: 'archive',
      archivePath: '/a/x.zip',
      innerDir: '',
    });
  });
});

describe('enterArchive', () => {
  it('lands at the archive root', () => {
    expect(enterArchive('/a/x.zip')).toEqual({
      kind: 'archive',
      archivePath: '/a/x.zip',
      innerDir: '',
    });
  });
});

describe('goUp', () => {
  it('steps out of a filesystem directory and focuses where it came from', () => {
    expect(goUp(fsLocation('/a/b/c'))).toEqual({
      location: { kind: 'fs', dir: '/a/b' },
      focusId: '/a/b/c',
    });
  });

  it('returns null at the filesystem root, leaving the key unhandled', () => {
    expect(goUp(fsLocation('/'))).toBeNull();
  });

  it('steps out of a nested inner directory', () => {
    expect(goUp(archiveLocation('/a/x.zip', 'app/vendor'))).toEqual({
      location: { kind: 'archive', archivePath: '/a/x.zip', innerDir: 'app' },
      focusId: 'app/vendor',
    });
  });

  it('steps from a top-level inner directory back to the archive root', () => {
    expect(goUp(archiveLocation('/a/x.zip', 'app'))).toEqual({
      location: { kind: 'archive', archivePath: '/a/x.zip', innerDir: '' },
      focusId: 'app',
    });
  });

  // leaving the package must put the cursor back on it, or the user loses
  // their bearings entirely
  it('leaves the archive and focuses the package itself', () => {
    expect(goUp(archiveLocation('/a/x.zip', ''))).toEqual({
      location: { kind: 'fs', dir: '/a' },
      focusId: '/a/x.zip',
    });
  });
});

describe('isFsRoot', () => {
  it('recognises the root', () => {
    expect(isFsRoot('/')).toBe(true);
  });

  it('rejects anything below it', () => {
    expect(isFsRoot('/a')).toBe(false);
  });
});

describe('locationLabel', () => {
  it('shows the plain directory on the filesystem', () => {
    expect(locationLabel(fsLocation('/a/b'))).toBe('/a/b');
  });

  it('shows only the archive at its root', () => {
    expect(locationLabel(archiveLocation('/a/x.zip', ''))).toBe('/a/x.zip');
  });

  it('appends the inner path with a separator that reads as a descent', () => {
    expect(locationLabel(archiveLocation('/a/x.zip', 'app/vendor'))).toBe('/a/x.zip › app/vendor');
  });
});
