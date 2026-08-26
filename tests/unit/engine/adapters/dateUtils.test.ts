import { describe, expect, it } from 'vitest';
import {
  displayTimestamp,
  formatDateTime,
  parseIsoDateTime,
  parseUsDateTime,
} from '../../../../src/engine/adapters/dateUtils';

describe('parseIsoDateTime', () => {
  // 7z prints "2026-08-26 14:55:03"; GNU tar prints "2026-08-26 14:55"
  it('reads an ISO timestamp with seconds', () => {
    const d = parseIsoDateTime('2026-08-26 14:55:03');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(7); // zero-based
    expect(d?.getDate()).toBe(26);
    expect(d?.getHours()).toBe(14);
    expect(d?.getMinutes()).toBe(55);
    expect(d?.getSeconds()).toBe(3);
  });

  it('reads an ISO timestamp without seconds', () => {
    const d = parseIsoDateTime('2026-08-26 14:55');
    expect(d?.getHours()).toBe(14);
    expect(d?.getSeconds()).toBe(0);
  });

  it('interprets the timestamp in local time, as the tools print it', () => {
    const d = parseIsoDateTime('2026-08-26 14:55');
    // constructing the same instant locally must round-trip
    expect(d?.getTime()).toBe(new Date(2026, 7, 26, 14, 55, 0).getTime());
  });

  it('rejects anything that is not an ISO timestamp', () => {
    expect(parseIsoDateTime('08-26-2026 14:55')).toBeUndefined();
    expect(parseIsoDateTime('Aug 26 14:55')).toBeUndefined();
    expect(parseIsoDateTime('')).toBeUndefined();
    expect(parseIsoDateTime('not a date')).toBeUndefined();
  });

  it('rejects an impossible date rather than rolling it over', () => {
    expect(parseIsoDateTime('2026-13-01 00:00')).toBeUndefined();
    expect(parseIsoDateTime('2026-02-30 00:00')).toBeUndefined();
  });
});

describe('parseUsDateTime', () => {
  // Info-ZIP's unzip prints MM-DD-YYYY
  it('reads the MM-DD-YYYY form unzip emits', () => {
    const d = parseUsDateTime('08-26-2026', '14:55');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(7);
    expect(d?.getDate()).toBe(26);
    expect(d?.getHours()).toBe(14);
    expect(d?.getMinutes()).toBe(55);
  });

  it('also accepts an ISO date, since some unzip builds emit that', () => {
    const d = parseUsDateTime('2026-08-26', '14:55');
    expect(d?.getMonth()).toBe(7);
    expect(d?.getDate()).toBe(26);
  });

  it('rejects an impossible date', () => {
    expect(parseUsDateTime('13-01-2026', '00:00')).toBeUndefined();
    expect(parseUsDateTime('02-30-2026', '00:00')).toBeUndefined();
  });

  it('rejects malformed input', () => {
    expect(parseUsDateTime('', '14:55')).toBeUndefined();
    expect(parseUsDateTime('08-26-2026', 'oops')).toBeUndefined();
  });
});

describe('formatDateTime', () => {
  it('renders a stable, sortable form', () => {
    expect(formatDateTime(new Date(2026, 7, 26, 14, 55))).toBe('2026-08-26 14:55');
  });

  it('pads single-digit parts', () => {
    expect(formatDateTime(new Date(2026, 0, 1, 9, 5))).toBe('2026-01-01 09:05');
  });
});

describe('displayTimestamp', () => {
  it('prefers the parsed date, normalised', () => {
    expect(displayTimestamp(new Date(2026, 7, 26, 14, 55), '08-26-2026 14:55')).toBe(
      '2026-08-26 14:55',
    );
  });

  // BSD tar timestamps cannot be parsed, but showing them beats showing nothing
  it('falls back to the tool text when there is no parsed date', () => {
    expect(displayTimestamp(undefined, 'Aug 26 11:02')).toBe('Aug 26 11:02');
    expect(displayTimestamp(undefined, '8月 26 11:02')).toBe('8月 26 11:02');
  });

  it('returns null when the tool reported no time at all', () => {
    expect(displayTimestamp(undefined, undefined)).toBeNull();
    expect(displayTimestamp(undefined, '   ')).toBeNull();
  });
});
