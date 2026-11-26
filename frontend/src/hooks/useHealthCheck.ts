import { useEffect, useState } from "react";

export type HealthState = "checking" | "connected" | "unavailable";

/** Client-side request deadline (Requirements 2.6, 3.6). */
const CLIENT_TIMEOUT_MS = 5_000;

/**
 * Issues a single GET to `url` on mount and reports the outcome.
 *
 * `connected` on a 2xx response; `unavailable` on a non-2xx response, network
 * failure, or the 5-second timeout. No retries or polling (Requirements 5.1,
 * 5.2). Cleanup aborts the in-flight request and ignores its late result.
 *
 * Requirements: 2.2-2.6, 3.2-3.6, 5.1, 5.2.
 */
export function useHealthCheck(url: string): HealthState {
  const [state, setState] = useState<HealthState>("checking");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    setState("checking");
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!cancelled) setState(response.ok ? "connected" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [url]);

  return state;
}
