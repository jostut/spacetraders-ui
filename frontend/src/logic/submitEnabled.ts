/**
 * Pure predicate controlling the submit control's enabled state.
 *
 * The submit control is enabled if and only if the input contains at least one
 * non-whitespace character and the total length of the raw input does not
 * exceed the 4096-character maximum.
 *
 * - Requirement 1.2: zero non-whitespace characters -> disabled.
 * - Requirement 1.3: 1..4096 non-whitespace characters -> enabled.
 * - Requirement 1.6: token exceeding 4096 characters -> disabled.
 *
 * @param raw The current, untrimmed value of the token input field.
 * @returns `true` when the submit control should be enabled.
 */
export function submitEnabled(raw: string): boolean {
  return raw.trim().length >= 1 && raw.length <= 4096;
}
