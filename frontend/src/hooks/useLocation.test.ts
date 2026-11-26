import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useLocation } from './useLocation';

const HQ = 'X1-DF55-20250Z';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const detailBody = { symbol: HQ, type: 'PLANET', systemSymbol: 'X1-DF55', x: 0, y: 0 };

describe('useLocation', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retry repeats the failed detail request', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/waypoints')) return jsonResponse(200, { waypoints: [] });
      return fetchMock.mock.calls.filter((c) => !String(c[0]).endsWith('/waypoints')).length === 1
        ? jsonResponse(502, { error: { message: 'Upstream failed' } })
        : jsonResponse(200, detailBody);
    });
    const { result } = renderHook(() => useLocation(HQ));
    await waitFor(() => expect(result.current.list.status).toBe('success'));

    act(() => result.current.select(HQ));
    await waitFor(() => expect(result.current.detail.status).toBe('error'));
    expect(result.current.detail).toMatchObject({ message: 'Upstream failed', notFound: false });

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.detail.status).toBe('success'));

    const detailUrl = `/api/systems/X1-DF55/waypoints/${HQ}`;
    const detailCalls = fetchMock.mock.calls.filter((c) => c[0] === detailUrl);
    expect(detailCalls).toHaveLength(2);
  });

  it('retry repeats the failed list request', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(502, { error: { message: 'boom' } }))
      .mockResolvedValueOnce(jsonResponse(200, { waypoints: [] }));
    const { result } = renderHook(() => useLocation(HQ));
    await waitFor(() => expect(result.current.list.status).toBe('error'));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.list.status).toBe('success'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/systems/X1-DF55/waypoints');
  });

  it('flags a 404 detail response as notFound', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/waypoints')
        ? jsonResponse(200, { waypoints: [] })
        : jsonResponse(404, { error: { message: 'Waypoint missing' } }),
    );
    const { result } = renderHook(() => useLocation(HQ));
    await waitFor(() => expect(result.current.list.status).toBe('success'));

    act(() => result.current.select(HQ));
    await waitFor(() => expect(result.current.detail.status).toBe('error'));
    expect(result.current.detail).toMatchObject({ status: 'error', notFound: true });
  });

  it('sends requests without an Authorization header', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/waypoints')
        ? jsonResponse(200, { waypoints: [] })
        : jsonResponse(200, detailBody),
    );
    const { result } = renderHook(() => useLocation(HQ));
    await waitFor(() => expect(result.current.list.status).toBe('success'));
    act(() => result.current.select(HQ));
    await waitFor(() => expect(result.current.detail.status).toBe('success'));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      const headers = new Headers((init as RequestInit | undefined)?.headers);
      expect(headers.has('Authorization')).toBe(false);
    }
  });

  it('does not use localStorage or sessionStorage', async () => {
    const spies = [
      vi.spyOn(Storage.prototype, 'getItem'),
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(Storage.prototype, 'removeItem'),
      vi.spyOn(Storage.prototype, 'clear'),
    ];
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/waypoints')
        ? jsonResponse(200, { waypoints: [] })
        : jsonResponse(200, detailBody),
    );
    const { result } = renderHook(() => useLocation(HQ));
    await waitFor(() => expect(result.current.list.status).toBe('success'));
    act(() => result.current.select(HQ));
    await waitFor(() => expect(result.current.detail.status).toBe('success'));
    act(() => result.current.select(null));

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
