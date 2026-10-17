import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLogin } from './useLogin';

// Feature: agent-login, Property 2: Submission sends the trimmed token exactly once
//
// Property 2: For any valid token (1..4096 non-whitespace chars, possibly
// surrounded by whitespace), submitting sends exactly one Login_Request whose
// body equals the whitespace-trimmed token.
//
// Validates: Requirements 1.4

/** Whitespace characters used to pad a core token on either side. */
const WHITESPACE_CHARS = [' ', '\t', '\n', '\r', '\f', '\v'];

/** A run of arbitrary whitespace (possibly empty) to surround the token. */
const whitespacePadding = fc.stringOf(fc.constantFrom(...WHITESPACE_CHARS), {
  minLength: 0,
  maxLength: 8,
});

/**
 * A valid core token: 1..4096 non-whitespace characters. Because the core
 * contains no whitespace, trimming any whitespace-padded form of it yields
 * exactly the core, so it doubles as the expected trimmed body.
 */
const coreToken = fc
  .string({ minLength: 1, maxLength: 4096 })
  // Drop any whitespace the generator produced so the core is purely
  // non-whitespace and bounded surrounding whitespace defines the only
  // trimmable region.
  .map((s) => s.replace(/\s/g, 'x'))
  // The replacement above can never empty the string (min length 1), but guard
  // the invariant explicitly for clarity.
  .filter((s) => s.length >= 1 && s.length <= 4096 && /^\S+$/.test(s));

/** A raw input: the valid core token surrounded by arbitrary whitespace. */
const paddedToken = fc
  .tuple(whitespacePadding, coreToken, whitespacePadding)
  .map(([lead, core, trail]) => ({ raw: `${lead}${core}${trail}`, core }));

/** Extract the JSON `token` field from a captured fetch call's body. */
function tokenFromCall(call: Parameters<typeof fetch>): string {
  const init = call[1] as RequestInit;
  const body = JSON.parse(init.body as string) as { token: string };
  return body.token;
}

describe('useLogin - Property 2: Submission sends the trimmed token exactly once', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends exactly one request whose body token equals the trimmed input', async () => {
    await fc.assert(
      fc.asyncProperty(paddedToken, async ({ raw, core }) => {
        // Fresh transport spy per run so call counts are isolated.
        const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(
          new Response(
            JSON.stringify({
              accountId: null,
              symbol: null,
              headquarters: null,
              credits: null,
              startingFaction: null,
              shipCount: 0,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
        vi.stubGlobal('fetch', fetchSpy);

        try {
          const { result } = renderHook(() => useLogin());

          act(() => {
            result.current.setToken(raw);
          });

          await act(async () => {
            await result.current.submit();
          });

          // Exactly one Login_Request was issued.
          expect(fetchSpy).toHaveBeenCalledTimes(1);

          // Its body carries the whitespace-trimmed token.
          const sentToken = tokenFromCall(fetchSpy.mock.calls[0]);
          expect(sentToken).toBe(core);
          expect(sentToken).toBe(raw.trim());
        } finally {
          vi.unstubAllGlobals();
        }
      }),
      { numRuns: 100 },
    );
  });
});
