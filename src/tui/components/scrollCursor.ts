export type ScrollAction = 'up' | 'down' | 'pageUp' | 'pageDown' | 'home' | 'end';

/**
 * Cursor movement for a windowed list. Always returns an index inside
 * [0, total-1], so an out-of-range starting point is pulled back in rather
 * than propagated.
 */
export function moveCursor(
  current: number,
  total: number,
  action: ScrollAction,
  pageSize: number,
): number {
  if (total <= 0) return 0;
  const last = total - 1;
  const clamp = (n: number) => Math.min(last, Math.max(0, n));
  const from = clamp(current);
  switch (action) {
    case 'up':
      return clamp(from - 1);
    case 'down':
      return clamp(from + 1);
    case 'pageUp':
      return clamp(from - pageSize);
    case 'pageDown':
      return clamp(from + pageSize);
    case 'home':
      return 0;
    case 'end':
      return last;
  }
}
