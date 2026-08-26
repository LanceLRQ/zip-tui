/**
 * Timestamp parsing for archive listings.
 *
 * Archive tools print modification times in their own formats and in local
 * time. These build local `Date` values so the displayed time matches what the
 * tool showed. Anything that cannot be read confidently yields undefined —
 * a wrong date is worse than none, so nothing is guessed.
 */

/** Rejects rollovers like "2026-02-30" that the Date constructor would accept. */
function makeLocalDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  if (hour > 23 || minute > 59 || second > 59) return undefined;
  const d = new Date(year, month - 1, day, hour, minute, second);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return undefined;
  }
  return d;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** Reads "2026-08-26 14:55" / "2026-08-26 14:55:03" — 7z and GNU tar. */
export function parseIsoDateTime(text: string): Date | undefined {
  const m = text.trim().match(ISO);
  if (!m) return undefined;
  return makeLocalDate(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6] ?? 0),
  );
}

const US_DATE = /^(\d{2})-(\d{2})-(\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Reads Info-ZIP's "08-26-2026" plus "14:55". ISO dates are accepted too,
 * since the listing regex tolerates builds that emit them.
 */
export function parseUsDateTime(datePart: string, timePart: string): Date | undefined {
  const time = timePart.trim().match(TIME);
  if (!time) return undefined;
  const date = datePart.trim();

  const us = date.match(US_DATE);
  const iso = us ? null : date.match(ISO_DATE);
  if (!us && !iso) return undefined;

  const [year, month, day] = us
    ? [Number(us[3]), Number(us[1]), Number(us[2])]
    : [Number(iso?.[1]), Number(iso?.[2]), Number(iso?.[3])];

  return makeLocalDate(year, month, day, Number(time[1]), Number(time[2]), Number(time[3] ?? 0));
}

const EN_MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

/** Month number from "Aug" or from the CJK "8月" form; 0 when unrecognised. */
function monthFrom(token: string): number {
  const cjk = token.match(/^(\d{1,2})月$/);
  if (cjk) return Number(cjk[1]);
  const idx = EN_MONTHS.indexOf(token.toLowerCase().slice(0, 3));
  // only accept an exact abbreviation, so "Ago" or "août" are not coerced
  return idx >= 0 && token.length <= 3 ? idx + 1 : 0;
}

const BSD = /^(\S+)\s+(\d{1,2})\s+(?:(\d{1,2}):(\d{2})|(\d{4}))$/;

/**
 * Reads BSD tar's "Aug 26 15:03" and "Jan  1  2024" forms.
 *
 * The output is lossy: it carries a clock or a year, never both. BSD switches
 * to the year form once a file is roughly six months old, so a clock means the
 * date falls within the last few months — the year is taken as the most recent
 * one that does not put the date in the future. The year form has no time of
 * day, so midnight is used.
 *
 * Month names follow the locale. English abbreviations and the CJK "N月" form
 * are understood; anything else yields undefined rather than a wrong date.
 */
export function parseBsdDateTime(text: string, now: Date = new Date()): Date | undefined {
  const m = text.trim().replace(/\s+/g, ' ').match(BSD);
  if (!m) return undefined;

  const month = monthFrom(m[1] ?? '');
  if (month === 0) return undefined;
  const day = Number(m[2]);

  if (m[5]) return makeLocalDate(Number(m[5]), month, day, 0, 0, 0);

  const candidate = makeLocalDate(now.getFullYear(), month, day, Number(m[3]), Number(m[4]), 0);
  if (!candidate) return undefined;
  if (candidate.getTime() <= now.getTime()) return candidate;
  // a future timestamp means the clock form refers to last year
  return makeLocalDate(now.getFullYear() - 1, month, day, Number(m[3]), Number(m[4]), 0);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Renders a timestamp as "2026-08-26 14:55" — sortable and unambiguous. */
export function formatDateTime(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * What to show for an entry's modification time.
 *
 * A parsed date is normalised; otherwise the tool's own text is passed through
 * verbatim, which is all BSD tar's lossy output allows. Null means the tool
 * reported no time, and the caller should omit the field rather than show a
 * placeholder.
 */
export function displayTimestamp(
  modified: Date | undefined,
  modifiedText: string | undefined,
): string | null {
  if (modified) return formatDateTime(modified);
  const text = modifiedText?.trim();
  return text ? text : null;
}
