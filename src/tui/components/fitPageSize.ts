/** Fewest rows a list stays usable at, however cramped the terminal is. */
export const MIN_PAGE_SIZE = 3;

/** Used when the terminal height is unknown, e.g. a non-TTY stdout. */
export const DEFAULT_PAGE_SIZE = 15;

/**
 * How many rows a windowed list may occupy on a terminal `terminalRows` tall,
 * once `chromeRows` of titles, hints, borders and padding are accounted for.
 *
 * An unknown height means we are not attached to a real terminal rather than
 * that the terminal is tiny, so it yields the fixed default instead of the
 * floor — shrinking the list to three rows there would be misleading.
 */
export function fitPageSize(
  terminalRows: number,
  chromeRows: number,
  min: number = MIN_PAGE_SIZE,
): number {
  if (!Number.isFinite(terminalRows) || terminalRows <= 0) return DEFAULT_PAGE_SIZE;
  const chrome = Number.isFinite(chromeRows) ? Math.max(0, chromeRows) : 0;
  return Math.max(min, Math.floor(terminalRows) - Math.floor(chrome));
}
