import { describe, expect, it } from 'vitest';
import { moveCursor } from '../../../src/tui/components/scrollCursor';

const PAGE = 10;

describe('moveCursor', () => {
  it('steps one row at a time', () => {
    expect(moveCursor(5, 100, 'down', PAGE)).toBe(6);
    expect(moveCursor(5, 100, 'up', PAGE)).toBe(4);
  });

  it('clamps at the top and bottom instead of wrapping', () => {
    expect(moveCursor(0, 100, 'up', PAGE)).toBe(0);
    expect(moveCursor(99, 100, 'down', PAGE)).toBe(99);
  });

  it('jumps a full page', () => {
    expect(moveCursor(50, 100, 'pageDown', PAGE)).toBe(60);
    expect(moveCursor(50, 100, 'pageUp', PAGE)).toBe(40);
  });

  it('clamps a page jump that would overshoot', () => {
    expect(moveCursor(95, 100, 'pageDown', PAGE)).toBe(99);
    expect(moveCursor(4, 100, 'pageUp', PAGE)).toBe(0);
  });

  it('jumps to the first and last row', () => {
    expect(moveCursor(42, 100, 'home', PAGE)).toBe(0);
    expect(moveCursor(42, 100, 'end', PAGE)).toBe(99);
  });

  it('stays at 0 for an empty list', () => {
    for (const action of ['up', 'down', 'pageUp', 'pageDown', 'home', 'end'] as const) {
      expect(moveCursor(0, 0, action, PAGE)).toBe(0);
    }
  });

  it('pulls an out-of-range cursor back inside the list', () => {
    expect(moveCursor(500, 10, 'down', PAGE)).toBe(9);
    expect(moveCursor(-5, 10, 'up', PAGE)).toBe(0);
  });
});
