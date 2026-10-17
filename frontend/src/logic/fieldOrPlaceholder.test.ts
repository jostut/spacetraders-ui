import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  FIELD_PLACEHOLDER,
  fieldOrPlaceholder,
} from './fieldOrPlaceholder';
import type { AgentDetails } from '../types';

/**
 * The six Agent_Details fields rendered in the UI (Requirement 3.3). Each is
 * passed through {@link fieldOrPlaceholder} for display.
 */
const AGENT_FIELDS = [
  'accountId',
  'symbol',
  'headquarters',
  'credits',
  'startingFaction',
  'shipCount',
] as const satisfies readonly (keyof AgentDetails)[];

/**
 * Arbitrary that produces a *present* value appropriate for each field: strings
 * for the textual fields, integers for credits/shipCount. These are the kinds of
 * values a real Agent_Details carries, and none of them is null/undefined.
 */
function presentValueArb(
  field: keyof AgentDetails,
): fc.Arbitrary<string | number> {
  if (field === 'credits' || field === 'shipCount') {
    return fc.integer();
  }
  return fc.string();
}

/**
 * Builds an arbitrary Agent_Details-shaped record where each field is either a
 * present value or null, chosen independently so we exercise every random subset
 * of absent fields (all present, all null, and everything in between). Also
 * records which fields were made absent so the property can assert per field.
 */
const agentDetailsWithAbsenceArb: fc.Arbitrary<{
  record: Record<keyof AgentDetails, string | number | null>;
  absent: Record<keyof AgentDetails, boolean>;
}> = fc
  .record(
    Object.fromEntries(
      AGENT_FIELDS.map((field) => [
        field,
        fc.option(presentValueArb(field), { nil: null }),
      ]),
    ) as {
      [K in keyof AgentDetails]: fc.Arbitrary<string | number | null>;
    },
  )
  .map((record) => ({
    record: record as Record<keyof AgentDetails, string | number | null>,
    absent: Object.fromEntries(
      AGENT_FIELDS.map((field) => [field, record[field] === null]),
    ) as Record<keyof AgentDetails, boolean>,
  }));

describe('fieldOrPlaceholder (Property 5)', () => {
  // Feature: agent-login, Property 5: Missing fields render placeholders, present fields render values
  it('renders the placeholder for null/absent fields and the value for present fields', () => {
    fc.assert(
      fc.property(agentDetailsWithAbsenceArb, ({ record, absent }) => {
        for (const field of AGENT_FIELDS) {
          const value = record[field];
          const rendered = fieldOrPlaceholder(value);

          if (absent[field]) {
            // Null/absent fields render the placeholder indicator.
            expect(rendered).toBe(FIELD_PLACEHOLDER);
          } else {
            // Present fields render their own display value, never the placeholder.
            expect(rendered).toBe(String(value));
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
