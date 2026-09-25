/**
 * Date derivation for timeline content.
 *
 * PLAN.md section 6: "The UI should automatically determine whether to display
 * '2026 - Present' or '2023 - 2026' based on the content. Do not hardcode
 * dates into components."
 *
 * PLAN.md section 14: "Current employment should be visually distinguishable. Do not
 * hardcode the current company. Use `current: true` and let the UI determine
 * presentation."
 *
 * Every date label on the site resolves through this module, so there is
 * exactly one place where the rules live and exactly one place to test them.
 */

/** Separator for rendered ranges. Kept here so it is changed in one place. */
export const RANGE_SEPARATOR = ' — ';

export const PRESENT_LABEL = 'Present';

export interface DateRange {
  startDate: Date;
  endDate?: Date | undefined;
  current: boolean;
}

/**
 * Render a range as a display label.
 *
 *   { start: 2026-03, current: true }        -> "2026 — Present"
 *   { start: 2023-01, end: 2026-02 }         -> "2023 — 2026"
 *   { start: 2023-04, end: 2023-09 }         -> "2023"
 *
 * A single-year range collapses to one year rather than rendering
 * "2023 — 2023", which reads as a data-entry mistake.
 */
export function formatDateRange(range: DateRange): string {
  const startYear = range.startDate.getUTCFullYear();

  if (range.current) {
    return `${startYear}${RANGE_SEPARATOR}${PRESENT_LABEL}`;
  }

  // Schema validation guarantees endDate exists when current is false, but
  // this module must not assume its caller validated. Degrade, don't throw:
  // a missing label is a cosmetic bug, a build-time crash is an outage.
  if (!range.endDate) {
    return String(startYear);
  }

  const endYear = range.endDate.getUTCFullYear();
  return startYear === endYear
    ? String(startYear)
    : `${startYear}${RANGE_SEPARATOR}${endYear}`;
}

/**
 * Display ordering for timeline entries: current roles first, then most recent
 * start date, then the manual `order` tiebreak.
 *
 * Exported as a bare comparator so callers holding Astro collection entries can
 * sort on `entry.data` without first mapping the whole collection into a
 * different shape.
 */
export function compareByRecency(
  a: DateRange & { order?: number | undefined },
  b: DateRange & { order?: number | undefined },
): number {
  if (a.current !== b.current) return a.current ? -1 : 1;

  const byStart = b.startDate.getTime() - a.startDate.getTime();
  if (byStart !== 0) return byStart;

  return (a.order ?? 0) - (b.order ?? 0);
}

/**
 * Sort timeline entries for display.
 *
 * Returns a new array — callers frequently hold Astro collection results that
 * should not be mutated in place.
 */
export function sortByRecency<T extends DateRange & { order?: number | undefined }>(
  entries: readonly T[],
): T[] {
  return [...entries].sort(compareByRecency);
}

/**
 * Whole years elapsed since a date, for skill longevity (section 8 prefers derived
 * evidence over authored prose that goes stale).
 *
 * `now` is injectable so behavior is deterministic under test.
 */
export function yearsSince(since: Date, now: Date = new Date()): number {
  let years = now.getUTCFullYear() - since.getUTCFullYear();

  const monthDelta = now.getUTCMonth() - since.getUTCMonth();
  const beforeAnniversary =
    monthDelta < 0 ||
    (monthDelta === 0 && now.getUTCDate() < since.getUTCDate());

  if (beforeAnniversary) years -= 1;

  return Math.max(0, years);
}
