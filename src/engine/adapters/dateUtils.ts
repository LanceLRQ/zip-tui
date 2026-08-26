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
