import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLogin } from './useLogin';

// Feature: agent-login, Property 8: Any failure restores a usable form
//
// Property 8: For any failure outcome, after the Login_Request settles the
// loading indicator is cleared and the submit control is re-enabled for any
// non-empty token.
//
// Validates: Requirements 4.6

/**
 * A non-empty token: at least one non-whitespace character within the length
 * bound, so `submitEnabled` is expected to be true once the request settles.
 * The core is purely non-whitespace so trimming never empties it.
 */
const nonEmptyToken = fc
  .string({ minLength: 1, maxLength: 4096 })
  .map((s) => s.replace(/\s/g, 'x'))
  .filter((s) => s.length >= 1 && s.length <= 4096 && /^\S+$/.test(s));

/**
 * The two shapes a failure outcome can take from the hook's perspective:
 *  - 'reject': the transport (fetch) rejects, modeling a network error or the
 *    client-side timeout abort.
 *  - 'status': the request resolves with a non-ok HTTP status (401/502/504).
 */
type FailureOutcome =
  | { kind: 'reject' }
  | { kind: 'status'; status: number };

/** Arbitrary failure kinds: rejection, plus assorted non-ok HTTP statuses. */
const failureOutcome: fc.Arbitrary<FailureOutcome> = fc.oneof(
  fc.constant<FailureOutcome>({ kind: 'reject' }),
  fc
    .constantFrom(400, 401, 403, 404, 500, 502, 503, 504)
    .map<FailureOutcome>((status) => ({ kind: 'status', status })),
);

/** Build a fetch spy that produces the given failure outcome. */
function failingFetch(outcome: FailureOutcome): ReturnType<typeof vi.fn<typeof fetch>> {
  const spy = vi.fn<typeof fetch>();
  if (outcome.kind === 'reject') {
    spy.mockRejectedValue(new Error('network error'));
  } else {
    spy.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { kind: 'upstream', message: 'failed' } }),
        {
          status: outcome.status,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
  }
  return spy;
}

describe('useLogin - Property 8: Any failure restores a usable form', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clears loading and re-enables submit for any non-empty token after any failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyToken,
        failureOutcome,
        async (token, outcome) => {
          const fetchSpy = failingFetch(outcome);
          vi.stubGlobal('fetch', fetchSpy);

          try {
            const { result } = renderHook(() => useLogin());

            act(() => {
              result.current.setToken(token);
            });

            await act(async () => {
              await result.current.submit();
            });

            // The request was issued exactly once and has now settled.
            expect(fetchSpy).toHaveBeenCalledTimes(1);

            // Loading indicator is cleared: status left 'loading' and landed
            // on the failure state.
            expect(result.current.status).not.toBe('loading');
            expect(result.current.status).toBe('error');

            // Submit control is re-enabled for the non-empty token.
            expect(result.current.submitEnabled).toBe(true);
          } finally {
            vi.unstubAllGlobals();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
