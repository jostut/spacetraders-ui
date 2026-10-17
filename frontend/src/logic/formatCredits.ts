/**
 * Pure formatter for the credits value.
 *
 * Produces a base-10 integer string with no fractional separator across the
 * supported display range -999,999,999,999 .. 999,999,999,999 (Requirement 3.2).
 *
 * The output round-trips: parsing the returned string back with Number()/
 * parseInt(..., 10) yields exactly `n`. The supported range is well within
 * Number.MAX_SAFE_INTEGER, so no precision or exponent-notation concerns arise.
 *
 * @param n a signed integer in the supported display range
 * @returns the base-10 integer string representation of `n`
 */
export function formatCredits(n: number): string {
  if (!Number.isInteger(n)) {
    throw new Error(`formatCredits expects an integer, received: ${n}`);
  }
  // String() on a safe integer yields a base-10 representation with no
  // fractional separator and no exponent notation, preserving the sign.
  return String(n);
}
