import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

/**
 * Unit tests for the connection status indicators wired into App (task 4.4).
 *
 * Validates: Requirements 2.1, 2.2, 3.1, 3.2, 5.1
 */

function okResponse(): Response {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function urlOf(input: RequestInfo | URL): string {
  return typeof input === 'string' ? input : input.toString();
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('App connection status indicators', () => {
  it('renders both labelled indicators on mount (Requirements 2.1, 3.1)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(okResponse())),
    );

    render(<App />);

    const indicators = screen.getAllByRole('status');
    const names = indicators.map((el) => el.getAttribute('aria-label'));
    expect(names.some((n) => n?.startsWith('Backend API:'))).toBe(true);
    expect(names.some((n) => n?.startsWith('SpaceTraders v2 API:'))).toBe(true);
    expect(screen.getByText('Backend API')).toBeInTheDocument();
    expect(screen.getByText('SpaceTraders v2 API')).toBeInTheDocument();

    // Let the health checks settle so no state updates occur after the test.
    await waitFor(() => {
      expect(screen.getByRole('status', { name: 'Backend API: connected' })).toBeInTheDocument();
      expect(
        screen.getByRole('status', { name: 'SpaceTraders v2 API: connected' }),
      ).toBeInTheDocument();
    });
  });

  it('issues exactly one fetch to each health endpoint on mount (Requirements 2.2, 3.2, 5.1)', async () => {
    const fetchSpy = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(okResponse()));
    vi.stubGlobal('fetch', fetchSpy);

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole('status', { name: 'SpaceTraders v2 API: connected' }),
      ).toBeInTheDocument();
    });

    const urls = fetchSpy.mock.calls.map(([input]) => urlOf(input));
    expect(urls.filter((u) => u === '/health')).toHaveLength(1);
    expect(urls.filter((u) => u === '/health/spacetraders')).toHaveLength(1);
    expect(urls).toHaveLength(2);
  });
});

describe('App indicators after login (Requirements 5.2, 5.4)', () => {
  it('hides both indicators and sends no further health request after a successful login', async () => {
    const user = userEvent.setup();
    const agent = {
      accountId: 'acct-123',
      symbol: 'CALLSIGN',
      headquarters: 'X1-HQ',
      credits: 150000,
      startingFaction: 'COSMIC',
      shipCount: 2,
    };
    const fetchSpy = vi.fn<typeof fetch>().mockImplementation((input) => {
      if (urlOf(input).startsWith('/health')) return Promise.resolve(okResponse());
      return Promise.resolve(
        new Response(JSON.stringify(agent), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    vi.stubGlobal('fetch', fetchSpy);

    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByRole('status', { name: 'SpaceTraders v2 API: connected' }),
      ).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Agent token'), 'some-token');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('Agent token')).not.toBeInTheDocument();
    });

    expect(screen.queryByText('Backend API')).not.toBeInTheDocument();
    expect(screen.queryByText('SpaceTraders v2 API')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('status', { name: /API:/ })).toHaveLength(0);

    const healthUrls = fetchSpy.mock.calls
      .map(([input]) => urlOf(input))
      .filter((u) => u.startsWith('/health'));
    expect(healthUrls).toHaveLength(2);
  });
});
