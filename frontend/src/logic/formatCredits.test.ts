import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatCredits } from './formatCredits';

// Feature: agent-login, Property 3: Credits formatting round-trip
//
// Property 3: For any integer `n` in -999,999,999,999..999,999,999,999,
// `formatCredits(n)` produces a base-10 string with no fractional separator,
// and parsing it back yields exactly `n`.
//
// Validates: Requirements 3.2

const MIN_CREDITS = -999_999_999_999;
const MAX_CREDITS = 999_999_999_999;

describe('formatCredits round-trip (Property 3)', () => {
  it('produces a base-10 string with no fractional separator that parses back to n', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_CREDITS, max: MAX_CREDITS }),
        (n) => {
          const formatted = formatCredits(n);

          // Base-10 integer string: optional leading '-' then digits only.
          expect(formatted).toMatch(/^-?\d+$/);

          // No fractional separator (neither '.' nor ',').
          expect(formatted).not.toMatch(/[.,]/);

          // Round-trips exactly back to n.
          expect(Number(formatted)).toBe(n);
          expect(Number.parseInt(formatted, 10)).toBe(n);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('round-trips exactly at the supported range boundaries', () => {
    for (const n of [MIN_CREDITS, MAX_CREDITS, 0, -1, 1]) {
      const formatted = formatCredits(n);
      expect(formatted).toMatch(/^-?\d+$/);
      expect(formatted).not.toMatch(/[.,]/);
      expect(Number(formatted)).toBe(n);
    }
  });
});
