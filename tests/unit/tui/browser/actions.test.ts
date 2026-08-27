import { describe, expect, it } from 'vitest';
import { type ActionContext, availableActions } from '../../../../src/tui/browser/actions';
import { archiveLocation, fsLocation } from '../../../../src/tui/browser/location';

function ids(ctx: ActionContext): string[] {
  return availableActions(ctx).map((a) => a.id);
}

const NO_CURSOR = null;

describe('availableActions on the filesystem', () => {
  it('offers compression once something is marked', () => {
    const out = availableActions({
      location: fsLocation('/w'),
      cursor: { id: '/w/src', isDir: true, isArchive: false },
      selectionCount: 2,
    });
    const compress = out.find((a) => a.id === 'compress');
    expect(compress?.key).toBe('a');
    expect(compress?.labelCount).toBe(2);
  });

  it('offers nothing to compress when nothing is marked', () => {
    expect(
      ids({
        location: fsLocation('/w'),
        cursor: { id: '/w/src', isDir: true, isArchive: false },
        selectionCount: 0,
      }),
    ).not.toContain('compress');
  });

  // an archive under the cursor can be opened, unpacked or checked without
  // ever being marked
  it('offers enter, extract and test on an archive under the cursor', () => {
    expect(
      ids({
        location: fsLocation('/w'),
        cursor: { id: '/w/a.zip', isDir: false, isArchive: true },
        selectionCount: 0,
      }),
    ).toEqual(['enter', 'extract', 'test']);
  });

  // marking things and then resting the cursor on an archive is a normal
  // state — both sets of actions have to be offered at once
  it('offers compression alongside the archive actions when both apply', () => {
    expect(
      ids({
        location: fsLocation('/w'),
        cursor: { id: '/w/a.zip', isDir: false, isArchive: true },
        selectionCount: 3,
      }),
    ).toEqual(['compress', 'enter', 'extract', 'test']);
  });

  it('offers only enter on a plain directory', () => {
    expect(
      ids({
        location: fsLocation('/w'),
        cursor: { id: '/w/src', isDir: true, isArchive: false },
        selectionCount: 0,
      }),
    ).toEqual(['enter']);
  });

  // a directory named "stuff.zip" is still a directory, so the real producer
  // never sets both flags — but the precedence must not be silently reorderable
  it('treats an entry flagged both ways as an archive', () => {
    expect(
      ids({
        location: fsLocation('/w'),
        cursor: { id: '/w/stuff.zip', isDir: true, isArchive: true },
        selectionCount: 0,
      }),
    ).toEqual(['enter', 'extract', 'test']);
  });

  it('offers nothing on a plain file', () => {
    expect(
      ids({
        location: fsLocation('/w'),
        cursor: { id: '/w/a.txt', isDir: false, isArchive: false },
        selectionCount: 0,
      }),
    ).toEqual([]);
  });

  it('copes with an empty directory', () => {
    expect(ids({ location: fsLocation('/w'), cursor: NO_CURSOR, selectionCount: 0 })).toEqual([]);
  });
});

describe('availableActions inside an archive', () => {
  // one key, two readings — the label says which, so no second key is needed
  it('extracts everything when nothing is marked', () => {
    const out = availableActions({
      location: archiveLocation('/w/a.zip', ''),
      cursor: { id: 'app', isDir: true, isArchive: false },
      selectionCount: 0,
    });
    const extract = out.find((a) => a.id === 'extract');
    expect(extract?.key).toBe('x');
    expect(extract?.labelKey).toBe('action.extractAll');
    expect(extract?.labelCount).toBeUndefined();
  });

  it('extracts the marked rows when there are any, under the same key', () => {
    const out = availableActions({
      location: archiveLocation('/w/a.zip', ''),
      cursor: { id: 'app', isDir: true, isArchive: false },
      selectionCount: 3,
    });
    const extract = out.find((a) => a.id === 'extract');
    expect(extract?.key).toBe('x');
    expect(extract?.labelKey).toBe('action.extractSelected');
    expect(extract?.labelCount).toBe(3);
  });

  it('always offers test and a way back out', () => {
    const out = ids({
      location: archiveLocation('/w/a.zip', 'app'),
      cursor: NO_CURSOR,
      selectionCount: 0,
    });
    expect(out).toContain('test');
    expect(out).toContain('leave');
  });

  // compression material lives on the filesystem, never inside a package
  it('never offers compression inside an archive', () => {
    expect(
      ids({
        location: archiveLocation('/w/a.zip', ''),
        cursor: { id: 'app', isDir: true, isArchive: false },
        selectionCount: 5,
      }),
    ).not.toContain('compress');
  });

  // entering is a filesystem-only action: an archive nested inside another
  // archive cannot be opened in place
  it('never offers enter inside an archive', () => {
    expect(
      ids({
        location: archiveLocation('/w/a.zip', ''),
        cursor: { id: 'inner.zip', isDir: false, isArchive: false },
        selectionCount: 0,
      }),
    ).not.toContain('enter');
  });
});
