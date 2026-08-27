import type { Location } from './location.js';

/** Which domain a selection belongs to — mirrors `Location`'s two kinds. */
export type LocationKind = Location['kind'];

export interface SelectionItem {
  path: string;
  isDir: boolean;
  size: number;
}

/**
 * The browser's marked rows.
 *
 * Insertion order is kept because the popup lists them and users expect what
 * they marked first to sit at the top. The Set alongside exists so the row
 * renderer can test membership in O(1) while drawing a long directory.
 */
export interface Selection {
  items: readonly SelectionItem[];
  ids: ReadonlySet<string>;
}

/**
 * The starting point for any selection.
 *
 * This is a single shared instance rather than a factory, which is only safe
 * because every operation here returns a new object and both fields are typed
 * readonly. Nothing may mutate it in place.
 */
export const EMPTY_SELECTION: Selection = { items: [], ids: new Set() };

/** Marks an unmarked row, or unmarks one already marked. */
export function toggle(sel: Selection, item: SelectionItem): Selection {
  if (sel.ids.has(item.path)) return remove(sel, item.path);
  const ids = new Set(sel.ids);
  ids.add(item.path);
  return { items: [...sel.items, item], ids };
}

/** Unmarks a row by path. */
export function remove(sel: Selection, path: string): Selection {
  // returning the same object lets React skip a re-render on a no-op key press
  if (!sel.ids.has(path)) return sel;
  const ids = new Set(sel.ids);
  ids.delete(path);
  return { items: sel.items.filter((i) => i.path !== path), ids };
}

/** How many rows are marked. */
export function count(sel: Selection): number {
  return sel.items.length;
}

/** Marked paths in the order they were marked, ready to hand to a command. */
export function paths(sel: Selection): string[] {
  return sel.items.map((i) => i.path);
}

/** Combined size of the marked rows, for the selection popup's header. */
export function totalSize(sel: Selection): number {
  return sel.items.reduce((sum, i) => sum + i.size, 0);
}

/**
 * One selection per location kind.
 *
 * The filesystem domain holds material to compress, the archive domain holds
 * entries to extract. Their paths live in different namespaces — an
 * archive-internal path cannot be acted on once you are back outside — so they
 * are never merged and never shown together.
 */
export interface DomainSelections {
  fs: Selection;
  archive: Selection;
}

/** Both domains empty. Shared instance; see `EMPTY_SELECTION` on why that is safe. */
export const EMPTY_DOMAINS: DomainSelections = {
  fs: EMPTY_SELECTION,
  archive: EMPTY_SELECTION,
};

/** The selection matching the current location's kind. */
export function forLocation(d: DomainSelections, kind: LocationKind): Selection {
  return kind === 'fs' ? d.fs : d.archive;
}

/** Replaces one domain, leaving the other exactly as it was. */
export function setDomain(
  d: DomainSelections,
  kind: LocationKind,
  sel: Selection,
): DomainSelections {
  return kind === 'fs' ? { ...d, fs: sel } : { ...d, archive: sel };
}

/**
 * Clears the archive domain.
 *
 * Called on entering and on leaving a package: archive-internal paths cannot
 * be acted on once you are back outside, and carrying a previous package's
 * marks into a new one would be actively wrong.
 */
export function resetArchiveDomain(d: DomainSelections): DomainSelections {
  return { ...d, archive: EMPTY_SELECTION };
}
