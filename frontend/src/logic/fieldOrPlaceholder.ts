/**
 * Placeholder indicator rendered in place of an absent/null Agent_Details field
 * (Requirement 3.3). An em dash is a conventional "no value" marker.
 */
export const FIELD_PLACEHOLDER = "—";

/**
 * Pure helper for rendering an Agent_Details field.
 *
 * Returns the value's display string, or the placeholder indicator when the
 * value is null or absent (undefined). Requirement 3.3: a missing field renders
 * the placeholder indicator while present fields render their value.
 *
 * A present value is converted to its display string via String():
 * - strings are returned as-is,
 * - numbers (e.g. credits already formatted upstream, or ship count) render
 *   their base-10 representation.
 *
 * Note: only `null` and `undefined` are treated as absent. Other falsy values
 * such as the empty string or the number 0 are present values and render as
 * `""` and `"0"` respectively.
 *
 * @param value The field value, or null/undefined when absent.
 * @returns The value's display string, or {@link FIELD_PLACEHOLDER} when absent.
 */
export function fieldOrPlaceholder(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) {
    return FIELD_PLACEHOLDER;
  }
  return String(value);
}
