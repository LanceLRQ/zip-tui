/**
 * The subset of Ink's key flags this needs.
 *
 * Declared structurally rather than importing Ink's `Key`, so the matcher stays
 * a plain function that tests can call with an object literal.
 */
export interface KeyFlags {
  return?: boolean | undefined;
  leftArrow?: boolean | undefined;
  rightArrow?: boolean | undefined;
}

/**
 * Whether a key press triggers an action.
 *
 * `Action.key` carries display text — `Enter`, `←` — because it is also what
 * the hint line renders. This translates that text into Ink's flags, so the
 * binding itself lives in exactly one place. Without it the input handler would
 * hardcode the same keys a second time and the hint line would drift out of
 * step with what actually happens.
 */
export function matchesKey(actionKey: string, input: string, key: KeyFlags): boolean {
  switch (actionKey) {
    case 'Enter':
      return key.return === true;
    case '←':
      return key.leftArrow === true;
    case '→':
      return key.rightArrow === true;
    default:
      return input === actionKey;
  }
}
