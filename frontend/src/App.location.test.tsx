import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

// Validates: Requirements 2.2, 2.3

const AGENT = {
  accountId: 'acct-123',
  symbol: 'CALLSIGN',
  headquarters: 'X1-DF55-20250Z',
  credits: 1000,
  startingFaction: 'COSMIC',
  shipCount: 1,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetch(): ReturnType<typeof vi.fn> {
  const spy = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.startsWith('/health')) return Promise.resolve(json({ status: 'ok' }));
    if (url.startsWith('/api/systems/')) {
      return Promise.resolve(
        json({ waypoints: [{ symbol: 'X1-DF55-20250Z', type: 'PLANET', x: 1, y: 2 }] }),
      );
    }
    return Promise.resolve(json(AGENT));
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('App location panel wiring', () => {
  it('hides the location panel and makes no location request before login', () => {
    const spy = stubFetch();
    render(<App />);
    expect(screen.queryByRole('region', { name: 'Location panel' })).toBeNull();
    expect(spy.mock.calls.some(([u]) => String(u).startsWith('/api/systems/'))).toBe(false);
  });

  it('shows the panel after login and clears it on logout', async () => {
    const user = userEvent.setup();
    const spy = stubFetch();
    render(<App />);

    await user.type(screen.getByLabelText('Agent token'), 'tok');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('region', { name: 'Location panel' })).toBeInTheDocument();
    expect(await screen.findByText('X1-DF55', { selector: '[aria-current="page"]' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(screen.queryByRole('region', { name: 'Location panel' })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
    expect(screen.getByLabelText('Agent token')).toBeInTheDocument();

    // Logging in again fetches the list afresh (state was cleared).
    const before = spy.mock.calls.filter(([u]) => String(u) === '/api/systems/X1-DF55/waypoints').length;
    await user.type(screen.getByLabelText('Agent token'), 'tok');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    await screen.findByText('X1-DF55', { selector: '[aria-current="page"]' });
    const after = spy.mock.calls.filter(([u]) => String(u) === '/api/systems/X1-DF55/waypoints').length;
    expect(after).toBe(before + 1);
  });
});
