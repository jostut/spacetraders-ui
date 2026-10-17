import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { LOGIN_ERROR_MESSAGES } from './logic/classifyResponse';

/**
 * Example / unit tests for frontend UI behavior (task 7.8).
 *
 * These drive the full app shell with the real `useLogin` hook and a mocked
 * `fetch`, asserting the user-visible behavior of the wired components
 * (LoginForm, AgentDetails, ErrorBanner).
 *
 * Coverage:
 * - Login form renders a single token input and submit control with no active
 *   session (Requirement 1.1).
 * - Loading indicator shown and submit disabled while a request is pending
 *   (Requirement 1.5).
 * - Client timeout at 10s surfaces the could-not-retrieve message plus a retry
 *   control (Requirement 3.4).
 * - Each LoginError kind maps to its exact message string and preserves the
 *   entered token (Requirements 4.3, 4.4, 4.5).
 */

/** A representative success agent payload returned by the backend. */
const SUCCESS_AGENT = {
  accountId: 'acct-123',
  symbol: 'CALLSIGN',
  headquarters: 'X1-HQ',
  credits: 150000,
  startingFaction: 'COSMIC',
  shipCount: 2,
};

/** A token value typed into the form across scenarios. */
const TOKEN = 'super-secret-agent-token';

/** Build a JSON `Response` with the given body and status. */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('UI behavior - initial render with no active session (Requirement 1.1)', () => {
  it('renders a single token input and a submit control, and no agent details', () => {
    // No request will be made, but stub fetch so an accidental call is visible.
    const fetchSpy = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchSpy);

    render(<App />);

    // Exactly one textbox: the Agent_Token input.
    const textboxes = screen.getAllByRole('textbox');
    expect(textboxes).toHaveLength(1);
    const input = screen.getByLabelText('Agent token');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('');

    // A submit control is present (and disabled while the input is empty).
    const submit = screen.getByRole('button', { name: 'Log in' });
    expect(submit).toBeInTheDocument();
    expect(submit).toBeDisabled();

    // No agent details and no error are shown without an active session.
    expect(screen.queryByRole('region', { name: 'Agent details' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();

    // No request was issued just by rendering the empty form.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('UI behavior - loading state while a request is pending (Requirement 1.5)', () => {
  it('shows a loading indicator and disables submit while the request is in flight', async () => {
    const user = userEvent.setup();

    // A fetch whose promise we resolve manually so we can observe the pending
    // (loading) state deterministically.
    let resolveFetch: (value: Response) => void = () => { };
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchSpy = vi.fn<typeof fetch>().mockReturnValue(pending);
    vi.stubGlobal('fetch', fetchSpy);

    render(<App />);

    const input = screen.getByLabelText('Agent token');
    await user.type(input, TOKEN);

    const submit = screen.getByRole('button', { name: 'Log in' });
    expect(submit).toBeEnabled();

    await user.click(submit);

    // While the request is pending: loading indicator visible, submit disabled.
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Logging in…');
    expect(submit).toBeDisabled();

    // Resolve the request to let the hook settle and avoid an open handle.
    await act(async () => {
      resolveFetch(jsonResponse(SUCCESS_AGENT, 200));
      await pending;
    });

    // After settling, the loading indicator is gone.
    await waitFor(() => {
      expect(screen.queryByRole('status')).toBeNull();
    });
  });
});

describe('UI behavior - client timeout at 10s (Requirement 3.4)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('surfaces the could-not-retrieve message plus a retry control after 10s', async () => {
    // A fetch that never resolves on its own; it rejects only when the hook's
    // AbortController fires at the 10s client deadline.
    const fetchSpy = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = (init as RequestInit | undefined)?.signal;
          signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    render(<App />);

    // Populate the token and submit via fireEvent so we don't depend on
    // userEvent's internal timers while fake timers are installed.
    const input = screen.getByLabelText('Agent token') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: TOKEN } });
    });

    const submit = screen.getByRole('button', { name: 'Log in' });
    expect(submit).toBeEnabled();
    act(() => {
      fireEvent.submit(input.closest('form')!);
    });

    // The request is in flight; nothing has timed out yet.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();

    // Advance to the 10s client deadline, triggering the AbortController. Flush
    // the microtask queue so the rejected fetch and the resulting state updates
    // settle inside act().
    await act(async () => {
      vi.advanceTimersByTime(10_000);
      // Let the aborted fetch rejection and ensuing state updates flush.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // The could-not-retrieve message is shown...
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent(
      LOGIN_ERROR_MESSAGES['could-not-retrieve'],
    );

    // ...alongside a retry control.
    const retry = within(banner).getByRole('button', { name: 'Retry' });
    expect(retry).toBeInTheDocument();

    // The entered token remains in the input for the retry.
    expect(
      (screen.getByLabelText('Agent token') as HTMLInputElement).value,
    ).toBe(TOKEN);
  });
});

describe('UI behavior - error kind message mapping and token preservation (Requirements 4.3, 4.4, 4.5)', () => {
  /**
   * Each case drives the form with a backend outcome and asserts the exact
   * user-facing message plus that the entered token is preserved in the input.
   */
  const cases = [
    {
      name: 'HTTP 401 -> token invalid, no retry (4.3)',
      makeFetch: () =>
        vi.fn<typeof fetch>().mockResolvedValue(
          jsonResponse({ error: { kind: 'authentication' } }, 401),
        ),
      expectedMessage: LOGIN_ERROR_MESSAGES['token-invalid'],
      expectRetry: false,
    },
    {
      name: 'HTTP 502 -> could not be retrieved, retry shown (4.4)',
      makeFetch: () =>
        vi.fn<typeof fetch>().mockResolvedValue(
          jsonResponse({ error: { kind: 'upstream' } }, 502),
        ),
      expectedMessage: LOGIN_ERROR_MESSAGES['could-not-retrieve'],
      expectRetry: true,
    },
    {
      name: 'HTTP 504 -> could not be retrieved, retry shown (4.4)',
      makeFetch: () =>
        vi.fn<typeof fetch>().mockResolvedValue(
          jsonResponse({ error: { kind: 'timeout' } }, 504),
        ),
      expectedMessage: LOGIN_ERROR_MESSAGES['could-not-retrieve'],
      expectRetry: true,
    },
    {
      name: 'network failure (backend unreachable) -> service unavailable (4.5)',
      makeFetch: () =>
        vi
          .fn<typeof fetch>()
          .mockRejectedValue(new TypeError('Failed to fetch')),
      expectedMessage: LOGIN_ERROR_MESSAGES['service-unavailable'],
      expectRetry: false,
    },
  ] as const;

  for (const testCase of cases) {
    it(testCase.name, async () => {
      const user = userEvent.setup();
      const fetchSpy = testCase.makeFetch();
      vi.stubGlobal('fetch', fetchSpy);

      render(<App />);

      const input = screen.getByLabelText('Agent token');
      await user.type(input, TOKEN);
      await user.click(screen.getByRole('button', { name: 'Log in' }));

      // The exact user-facing message is displayed.
      const banner = await screen.findByRole('alert');
      expect(banner).toHaveTextContent(testCase.expectedMessage);

      // The retry control is present only for the could-not-retrieve kind.
      const retry = within(banner).queryByRole('button', { name: 'Retry' });
      if (testCase.expectRetry) {
        expect(retry).toBeInTheDocument();
      } else {
        expect(retry).toBeNull();
      }

      // The entered token is preserved in the input across the failure, and the
      // form is still shown (no agent details).
      expect(screen.getByLabelText('Agent token')).toHaveValue(TOKEN);
      expect(
        screen.queryByRole('region', { name: 'Agent details' }),
      ).toBeNull();

      // The submit control is re-enabled for the non-empty token.
      expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    });
  }
});
