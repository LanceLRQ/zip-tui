import { describe, expect, it } from 'vitest';
import { matchesKey } from '../../../../src/tui/browser/keymap';

const NONE = {};

describe('matchesKey', () => {
  it('matches a plain character against the typed input', () => {
    expect(matchesKey('a', 'a', NONE)).toBe(true);
    expect(matchesKey('a', 'x', NONE)).toBe(false);
  });

  it('is case sensitive, so E and e stay distinct', () => {
    expect(matchesKey('e', 'E', NONE)).toBe(false);
  });

  // the action list spells these as display text, not as Ink's flag names
  it('maps the Enter label onto the return flag', () => {
    expect(matchesKey('Enter', '', { return: true })).toBe(true);
    expect(matchesKey('Enter', '', NONE)).toBe(false);
  });

  it('maps the arrow glyphs onto their flags', () => {
    expect(matchesKey('←', '', { leftArrow: true })).toBe(true);
    expect(matchesKey('→', '', { rightArrow: true })).toBe(true);
    expect(matchesKey('←', '', { rightArrow: true })).toBe(false);
  });

  // a stray character arriving alongside a special key must not match it
  it('ignores the input string for special keys', () => {
    expect(matchesKey('Enter', 'a', { return: true })).toBe(true);
  });

  it('does not match a special label against typed text of the same name', () => {
    expect(matchesKey('Enter', 'Enter', NONE)).toBe(false);
  });
});
