import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  fitPageSize,
  MIN_PAGE_SIZE,
} from '../../../src/tui/components/fitPageSize';

describe('fitPageSize', () => {
  it('fills the terminal minus the surrounding chrome', () => {
    expect(fitPageSize(40, 8)).toBe(32);
    expect(fitPageSize(24, 8)).toBe(16);
  });

  it('grows with a taller terminal', () => {
    expect(fitPageSize(100, 8)).toBeGreaterThan(fitPageSize(50, 8));
  });

  it('never drops below the floor on a short terminal', () => {
    expect(fitPageSize(10, 8)).toBe(MIN_PAGE_SIZE);
    expect(fitPageSize(4, 8)).toBe(MIN_PAGE_SIZE);
  });

  // An unknown height means a non-TTY stdout or a test stub, not a tiny
  // terminal — falling back to the fixed size keeps behaviour predictable
  it('falls back to the fixed size when the height is unknown', () => {
    expect(fitPageSize(0, 8)).toBe(DEFAULT_PAGE_SIZE);
    expect(fitPageSize(-5, 8)).toBe(DEFAULT_PAGE_SIZE);
    expect(fitPageSize(Number.NaN, 8)).toBe(DEFAULT_PAGE_SIZE);
    expect(fitPageSize(undefined as unknown as number, 8)).toBe(DEFAULT_PAGE_SIZE);
  });

  it('treats chrome larger than the screen as leaving nothing', () => {
    expect(fitPageSize(20, 50)).toBe(MIN_PAGE_SIZE);
  });

  it('rejects a negative chrome instead of inflating the page', () => {
    expect(fitPageSize(40, -10)).toBe(40);
  });

  it('honours a caller-supplied floor', () => {
    expect(fitPageSize(10, 8, 6)).toBe(6);
  });

  it('returns whole rows only', () => {
    expect(Number.isInteger(fitPageSize(40.7, 8))).toBe(true);
  });
});
