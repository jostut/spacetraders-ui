import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { submitEnabled } from './submitEnabled';

// Feature: agent-login, Property 1: Submit-enable predicate
//
// Property 1: For any input string `s`, the submit control is enabled iff `s`
// contains at least one non-whitespace character and the total length of `s`
// is at most 4096.
//
// Validates: Requirements 1.2, 1.3, 1.6

/**
 * Independent reference oracle for the enable condition, derived directly from
 * the property statement rather than reusing the implementation under test.
 */
function expectedEnabled(s: string): boolean {
  const hasNonWhitespace = /\S/.test(s);
  const withinMaxLength = s.length <= 4096;
  return hasNonWhitespace && withinMaxLength;
}

describe('submitEnabled - Property 1: Submit-enable predicate', () => {
  it('is enabled iff the input has a non-whitespace char and length <= 4096', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(submitEnabled(s)).toBe(expectedEnabled(s));
      }),
      { numRuns: 100 },
    );
  });

  it('holds for whitespace-only inputs (always disabled)', () => {
    const whitespace = fc.stringOf(
      fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'),
      { minLength: 0, maxLength: 50 },
    );
    fc.assert(
      fc.property(whitespace, (s) => {
        expect(submitEnabled(s)).toBe(false);
        expect(submitEnabled(s)).toBe(expectedEnabled(s));
      }),
      { numRuns: 100 },
    );
  });

  it('holds for inputs with lengths around the 4096 boundary', () => {
    // Lengths spanning just below, at, and just above the 4096 maximum.
    const lengthAroundBoundary = fc.integer({ min: 4093, max: 4100 });
    fc.assert(
      fc.property(lengthAroundBoundary, (len) => {
        const s = 'a'.repeat(len);
        expect(submitEnabled(s)).toBe(expectedEnabled(s));
        // Explicit boundary semantics: enabled through 4096, disabled beyond.
        expect(submitEnabled(s)).toBe(len <= 4096);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects empty input', () => {
    expect(submitEnabled('')).toBe(false);
  });
});
