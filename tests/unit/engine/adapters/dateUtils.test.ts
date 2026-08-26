import { describe, expect, it } from 'vitest';
import {
  displayTimestamp,
  formatDateTime,
  parseBsdDateTime,
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

describe('parseBsdDateTime', () => {
  // BSD tar shows a clock for files under ~6 months old and a year for older
  // ones, so a clock implies the date is within the last few months
  const NOW = new Date(2026, 7, 26, 15, 30); // 2026-08-26 15:30

  it('reads an English month with a clock, inferring the current year', () => {
    const d = parseBsdDateTime('Aug 26 15:03', NOW);
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(7);
    expect(d?.getDate()).toBe(26);
    expect(d?.getHours()).toBe(15);
    expect(d?.getMinutes()).toBe(3);
  });

  it('reads a CJK numeric month with a clock', () => {
    const d = parseBsdDateTime('8月 26 15:03', NOW);
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(7);
    expect(d?.getDate()).toBe(26);
  });

  // a clock-form date that would land in the future must belong to last year
  it('rolls back a year when the inferred date would be in the future', () => {
    const d = parseBsdDateTime('Dec 25 09:00', NOW);
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getMonth()).toBe(11);
  });

  it('does not roll back for a date earlier today', () => {
    const d = parseBsdDateTime('Aug 26 09:00', NOW);
    expect(d?.getFullYear()).toBe(2026);
  });

  it('reads the year form, with no time of day available', () => {
    const d = parseBsdDateTime('Jan  1  2024', NOW);
    expect(d?.getFullYear()).toBe(2024);
    expect(d?.getMonth()).toBe(0);
    expect(d?.getDate()).toBe(1);
    expect(d?.getHours()).toBe(0);
    expect(d?.getMinutes()).toBe(0);
  });

  it('reads a CJK month in the year form', () => {
    const d = parseBsdDateTime('1月  1  2024', NOW);
    expect(d?.getFullYear()).toBe(2024);
    expect(d?.getMonth()).toBe(0);
  });

  it('accepts every English month abbreviation', () => {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    months.forEach((mon, idx) => {
      expect(parseBsdDateTime(`${mon} 15  2020`, NOW)?.getMonth(), mon).toBe(idx);
    });
  });

  // an unrecognised locale must not become a wrong date
  it('gives up on month names it does not know', () => {
    expect(parseBsdDateTime('août 26 15:03', NOW)).toBeUndefined();
    expect(parseBsdDateTime('Ago 26 15:03', NOW)).toBeUndefined();
  });

  it('rejects malformed input', () => {
    expect(parseBsdDateTime('', NOW)).toBeUndefined();
    expect(parseBsdDateTime('2026-08-26 15:03', NOW)).toBeUndefined();
    expect(parseBsdDateTime('Aug 26', NOW)).toBeUndefined();
  });

  it('rejects an impossible day', () => {
    expect(parseBsdDateTime('Feb 30 10:00', NOW)).toBeUndefined();
    expect(parseBsdDateTime('Jan 32  2024', NOW)).toBeUndefined();
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
