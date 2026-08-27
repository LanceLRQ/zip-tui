import { describe, expect, it } from 'vitest';
import {
  count,
  EMPTY_DOMAINS,
  EMPTY_SELECTION,
  forLocation,
  paths,
  remove,
  resetArchiveDomain,
  type SelectionItem,
  setDomain,
  toggle,
  totalSize,
} from '../../../../src/tui/browser/selection';

function item(path: string, size = 0, isDir = false): SelectionItem {
  return { path, size, isDir };
}

describe('toggle', () => {
  it('adds an unmarked row', () => {
    const sel = toggle(EMPTY_SELECTION, item('/a', 10));
    expect(paths(sel)).toEqual(['/a']);
    expect(sel.ids.has('/a')).toBe(true);
  });

  it('removes a row that is already marked', () => {
    const once = toggle(EMPTY_SELECTION, item('/a', 10));
    expect(paths(toggle(once, item('/a', 10)))).toEqual([]);
  });

  // the popup lists them in this order, and users expect what they marked
  // first to sit at the top
  it('keeps insertion order rather than sorting', () => {
    let sel = EMPTY_SELECTION;
    for (const p of ['/z', '/a', '/m']) sel = toggle(sel, item(p));
    expect(paths(sel)).toEqual(['/z', '/a', '/m']);
  });

  it('does not mutate the input', () => {
    const before = toggle(EMPTY_SELECTION, item('/a'));
    toggle(before, item('/b'));
    expect(paths(before)).toEqual(['/a']);
  });

  // EMPTY_SELECTION is a shared module-level constant; if toggle ever mutated
  // it in place, every later selection in the process would start dirty
  it('leaves the shared empty constant untouched', () => {
    toggle(EMPTY_SELECTION, item('/a'));
    toggle(EMPTY_SELECTION, item('/b'));
    expect(count(EMPTY_SELECTION)).toBe(0);
    expect(EMPTY_SELECTION.ids.size).toBe(0);
  });
});

describe('remove', () => {
  it('drops the named row', () => {
    let sel = EMPTY_SELECTION;
    for (const p of ['/a', '/b']) sel = toggle(sel, item(p));
    expect(paths(remove(sel, '/a'))).toEqual(['/b']);
  });

  it('returns the same object when there is nothing to remove', () => {
    const sel = toggle(EMPTY_SELECTION, item('/a'));
    expect(remove(sel, '/nope')).toBe(sel);
  });
});

describe('totalSize and count', () => {
  it('sums the marked rows', () => {
    let sel = EMPTY_SELECTION;
    sel = toggle(sel, item('/a', 100));
    sel = toggle(sel, item('/b', 23));
    expect(totalSize(sel)).toBe(123);
    expect(count(sel)).toBe(2);
  });

  it('is zero when nothing is marked', () => {
    expect(totalSize(EMPTY_SELECTION)).toBe(0);
    expect(count(EMPTY_SELECTION)).toBe(0);
  });
});

describe('domains', () => {
  it('hands back the selection belonging to the location kind', () => {
    const d = setDomain(EMPTY_DOMAINS, 'fs', toggle(EMPTY_SELECTION, item('/a')));
    expect(paths(forLocation(d, 'fs'))).toEqual(['/a']);
    expect(paths(forLocation(d, 'archive'))).toEqual([]);
  });

  it('leaves the other domain untouched when one is written', () => {
    let d = setDomain(EMPTY_DOMAINS, 'fs', toggle(EMPTY_SELECTION, item('/a')));
    d = setDomain(d, 'archive', toggle(EMPTY_SELECTION, item('app/x.js')));
    expect(paths(forLocation(d, 'fs'))).toEqual(['/a']);
    expect(paths(forLocation(d, 'archive'))).toEqual(['app/x.js']);
  });

  // archive-internal paths mean nothing on the filesystem, so carrying them
  // across would produce a set that cannot be acted on
  it('clears only the archive domain on reset', () => {
    let d = setDomain(EMPTY_DOMAINS, 'fs', toggle(EMPTY_SELECTION, item('/a')));
    d = setDomain(d, 'archive', toggle(EMPTY_SELECTION, item('app/x.js')));
    const after = resetArchiveDomain(d);
    expect(paths(forLocation(after, 'archive'))).toEqual([]);
    expect(paths(forLocation(after, 'fs'))).toEqual(['/a']);
  });

  it('does not mutate the shared empty domains constant', () => {
    setDomain(EMPTY_DOMAINS, 'fs', toggle(EMPTY_SELECTION, item('/a')));
    expect(count(forLocation(EMPTY_DOMAINS, 'fs'))).toBe(0);
  });
});
