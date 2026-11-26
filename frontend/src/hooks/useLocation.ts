import { useCallback, useEffect, useRef, useState } from "react";
import { deriveSystemSymbol } from "../logic/deriveSystemSymbol";
import type { AsyncState, WaypointDetail, WaypointSummary } from "../types";

export interface UseLocation {
  systemSymbol: string | null;
  selected: string | null;
  list: AsyncState<WaypointSummary[]>;
  detail: AsyncState<WaypointDetail>;
  select(symbol: string | null): void;
  retry(): void;
}

const NO_SYSTEM_MESSAGE = "The system could not be determined.";
const GENERIC_MESSAGE = "Could not load location data.";

class HttpFailure extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    let message = GENERIC_MESSAGE;
    try {
      const body = await response.json();
      if (typeof body?.error?.message === "string") message = body.error.message;
    } catch {
      /* keep generic message */
    }
    throw new HttpFailure(message, response.status);
  }
  return (await response.json()) as T;
}

function toError(e: unknown): AsyncState<never> {
  if (e instanceof HttpFailure) {
    return { status: "error", message: e.message, notFound: e.status === 404 };
  }
  return { status: "error", message: GENERIC_MESSAGE, notFound: false };
}

/**
 * Holds the selected location and an in-memory Location_List for the agent's
 * system. No storage, no Authorization header.
 */
export function useLocation(headquarters: string | null): UseLocation {
  const systemSymbol = headquarters === null ? null : deriveSystemSymbol(headquarters);

  const [selected, setSelected] = useState<string | null>(null);
  const [list, setList] = useState<AsyncState<WaypointSummary[]>>(
    systemSymbol === null
      ? { status: "error", message: NO_SYSTEM_MESSAGE, notFound: false }
      : { status: "loading" },
  );
  const [detail, setDetail] = useState<AsyncState<WaypointDetail>>({ status: "idle" });

  const listAbort = useRef<AbortController | null>(null);
  const detailAbort = useRef<AbortController | null>(null);
  const detailRequestId = useRef(0);

  const loadList = useCallback(() => {
    listAbort.current?.abort();
    if (systemSymbol === null) {
      setList({ status: "error", message: NO_SYSTEM_MESSAGE, notFound: false });
      return;
    }
    const controller = new AbortController();
    listAbort.current = controller;
    setList({ status: "loading" });
    getJson<{ waypoints: WaypointSummary[] }>(
      `/api/systems/${encodeURIComponent(systemSymbol)}/waypoints`,
      controller.signal,
    ).then(
      (body) => {
        if (!controller.signal.aborted) setList({ status: "success", data: body.waypoints });
      },
      (e) => {
        if (!controller.signal.aborted) setList(toError(e));
      },
    );
  }, [systemSymbol]);

  const loadDetail = useCallback(
    (symbol: string) => {
      detailAbort.current?.abort();
      const id = ++detailRequestId.current;
      if (systemSymbol === null) {
        setDetail({ status: "error", message: NO_SYSTEM_MESSAGE, notFound: false });
        return;
      }
      const controller = new AbortController();
      detailAbort.current = controller;
      setDetail({ status: "loading" });
      getJson<WaypointDetail>(
        `/api/systems/${encodeURIComponent(systemSymbol)}/waypoints/${encodeURIComponent(symbol)}`,
        controller.signal,
      ).then(
        (data) => {
          if (id === detailRequestId.current) setDetail({ status: "success", data });
        },
        (e) => {
          if (id === detailRequestId.current && !controller.signal.aborted) setDetail(toError(e));
        },
      );
    },
    [systemSymbol],
  );

  // Fetch the list once on mount (per derived system); cached in state after.
  useEffect(() => {
    loadList();
    return () => {
      listAbort.current?.abort();
      detailAbort.current?.abort();
      detailRequestId.current++;
    };
  }, [loadList]);

  const select = useCallback(
    (symbol: string | null) => {
      setSelected(symbol);
      if (symbol === null) {
        detailAbort.current?.abort();
        detailRequestId.current++;
        setDetail({ status: "idle" });
        return;
      }
      loadDetail(symbol);
    },
    [loadDetail],
  );

  const retry = useCallback(() => {
    if (selected !== null && detail.status === "error") {
      loadDetail(selected);
    } else if (list.status === "error") {
      loadList();
    }
  }, [selected, detail.status, list.status, loadDetail, loadList]);

  return { systemSymbol, selected, list, detail, select, retry };
}
