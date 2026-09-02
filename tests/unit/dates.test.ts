import { describe, expect, it } from 'vitest';

import {
  formatDateRange,
  sortByRecency,
  yearsSince,
} from '../../src/lib/dates.ts';

/** Helper: build a UTC date from an ISO day string. */
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('formatDateRange', () => {
  it('renders a current role as "<year> — Present" (§6)', () => {
    expect(
      formatDateRange({ startDate: d('2026-03-01'), current: true }),
    ).toBe('2026 — Present');
  });

  it('ignores endDate when current is true', () => {
    // Schema forbids this combination, but the helper must not produce a
    // nonsense label like "2023 — 2026 — Present" if it ever slips through.
    expect(
      formatDateRange({
        startDate: d('2023-01-01'),
        endDate: d('2026-01-01'),
        current: true,
      }),
    ).toBe('2023 — Present');
  });

  it('renders a closed multi-year range as "<start> — <end>" (§6)', () => {
    expect(
      formatDateRange({
        startDate: d('2023-01-01'),
        endDate: d('2026-02-01'),
        current: false,
      }),
    ).toBe('2023 — 2026');
  });

  it('collapses a same-year range to a single year', () => {
    expect(
      formatDateRange({
        startDate: d('2023-04-01'),
        endDate: d('2023-09-01'),
        current: false,
      }),
    ).toBe('2023');
  });

  it('degrades to the start year when endDate is missing and not current', () => {
    expect(
      formatDateRange({ startDate: d('2023-04-01'), current: false }),
    ).toBe('2023');
  });
});

describe('sortByRecency', () => {
  it('places current entries before past ones regardless of date (§14)', () => {
    const entries = [
      { id: 'old-but-recent', startDate: d('2025-01-01'), endDate: d('2026-01-01'), current: false },
      { id: 'current', startDate: d('2020-01-01'), current: true },
    ];

    expect(sortByRecency(entries).map((e) => e.id)).toEqual([
      'current',
      'old-but-recent',
    ]);
  });

  it('orders past entries by most recent start date', () => {
    const entries = [
      { id: 'a', startDate: d('2020-01-01'), endDate: d('2021-01-01'), current: false },
      { id: 'c', startDate: d('2024-01-01'), endDate: d('2025-01-01'), current: false },
      { id: 'b', startDate: d('2022-01-01'), endDate: d('2023-01-01'), current: false },
    ];

    expect(sortByRecency(entries).map((e) => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('falls back to `order` when start dates tie', () => {
    const entries = [
      { id: 'second', startDate: d('2023-01-01'), endDate: d('2024-01-01'), current: false, order: 2 },
      { id: 'first', startDate: d('2023-01-01'), endDate: d('2024-01-01'), current: false, order: 1 },
    ];

    expect(sortByRecency(entries).map((e) => e.id)).toEqual(['first', 'second']);
  });

  it('does not mutate the input array', () => {
    const entries = [
      { id: 'a', startDate: d('2020-01-01'), current: true },
      { id: 'b', startDate: d('2024-01-01'), endDate: d('2025-01-01'), current: false },
    ];
    const snapshot = entries.map((e) => e.id);

    sortByRecency(entries);

    expect(entries.map((e) => e.id)).toEqual(snapshot);
  });
});

describe('yearsSince', () => {
  it('counts whole elapsed years', () => {
    expect(yearsSince(d('2023-01-01'), d('2026-01-01'))).toBe(3);
  });

  it('does not count the current year before the anniversary', () => {
    expect(yearsSince(d('2023-06-01'), d('2026-05-31'))).toBe(2);
  });

  it('counts the year on the anniversary itself', () => {
    expect(yearsSince(d('2023-06-01'), d('2026-06-01'))).toBe(3);
  });

  it('never returns a negative value for a future date', () => {
    expect(yearsSince(d('2030-01-01'), d('2026-01-01'))).toBe(0);
  });
});
