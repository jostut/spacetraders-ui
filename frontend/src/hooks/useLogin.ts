import { useCallback, useRef, useState } from "react";
import type { AgentDetails, LoginError, LoginStatus } from "../types";
import { submitEnabled as computeSubmitEnabled } from "../logic/submitEnabled";
import { classifyResponse } from "../logic/classifyResponse";

/**
 * Session state owner for the login flow. See design.md "useLogin hook".
 *
 * All state is held in volatile in-memory React state only; no storage API
 * (localStorage, sessionStorage, cookies, IndexedDB) is ever touched.
 */
export interface UseLogin {
  token: string; // controlled input value (preserved on failure)
  status: LoginStatus;
  agent: AgentDetails | null;
  error: LoginError | null;
  setToken(next: string): void;
  submitEnabled: boolean; // derived via the pure predicate
  submit(): Promise<void>; // sends the trimmed token exactly once per call
  retry(): Promise<void>;
  logout(): void; // clears token + agent from memory
}

/** Endpoint the Login_Request is POSTed to. */
const LOGIN_ENDPOINT = "/api/login";

/** Client-side request deadline (Requirement 3.4), independent of the backend. */
const CLIENT_TIMEOUT_MS = 10_000;

/**
 * React hook owning all login session state in volatile memory.
 *
 * `submit` trims the current token, issues exactly one Login_Request, enforces
 * a 10-second client timeout via `AbortController`, and maps the response or
 * failure to a `LoginError` via `classifyResponse`. On any failure the loading
 * state is cleared and submit is re-enabled for non-empty tokens (Requirement
 * 4.6), while the entered token is preserved (Requirements 4.3, 4.4, 4.5).
 *
 * Requirements: 1.4, 1.5, 3.4, 4.3, 4.4, 4.5, 4.6, 5.3, 5.4.
 */
export function useLogin(): UseLogin {
  const [token, setTokenState] = useState<string>("");
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [error, setError] = useState<LoginError | null>(null);

  // Holds the token actually submitted so `retry` can re-issue the same
  // request even if the controlled input has not changed. Kept in a ref so it
  // never participates in render and never leaks into storage.
  const submittedTokenRef = useRef<string>("");

  const setToken = useCallback((next: string): void => {
    setTokenState(next);
  }, []);

  /**
   * Core request routine. Sends exactly one Login_Request with the given
   * trimmed token under a 10-second client timeout and updates state from the
   * outcome.
   */
  const sendRequest = useCallback(
    async (trimmedToken: string): Promise<void> => {
      submittedTokenRef.current = trimmedToken;

      setStatus("loading");
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

      try {
        const response = await fetch(LOGIN_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: trimmedToken }),
          signal: controller.signal,
        });

        if (response.ok) {
          const data = (await response.json()) as AgentDetails;
          setAgent(data);
          setError(null);
          setStatus("success");
          return;
        }

        // Non-2xx: map the HTTP status to a user-facing error. Preserve token.
        setAgent(null);
        setError(classifyResponse(response.status, false));
        setStatus("error");
      } catch (err) {
        // Two distinct no-response outcomes land here. Preserve token in both.
        setAgent(null);
        if (controller.signal.aborted) {
          // Client-side 10s deadline fired (AbortController). Surface the
          // could-not-retrieve message with a retry control (Requirement 3.4).
          // Mirror a 504 so classifyResponse yields the could-not-retrieve kind.
          setError(classifyResponse(504, false));
        } else {
          // Backend genuinely unreachable (network failure): the service is
          // unavailable (Requirement 4.5).
          void err;
          setError(classifyResponse(null, true));
        }
        setStatus("error");
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [],
  );

  const submit = useCallback(async (): Promise<void> => {
    const trimmed = token.trim();
    // Guard against empty submissions; the submit control is disabled for
    // these but defend here so a programmatic call cannot send an empty token.
    if (trimmed.length === 0) {
      return;
    }
    await sendRequest(trimmed);
  }, [token, sendRequest]);

  const retry = useCallback(async (): Promise<void> => {
    const tokenToRetry = submittedTokenRef.current || token.trim();
    if (tokenToRetry.length === 0) {
      return;
    }
    await sendRequest(tokenToRetry);
  }, [token, sendRequest]);

  const logout = useCallback((): void => {
    submittedTokenRef.current = "";
    setTokenState("");
    setAgent(null);
    setError(null);
    setStatus("idle");
  }, []);

  return {
    token,
    status,
    agent,
    error,
    setToken,
    submitEnabled: computeSubmitEnabled(token),
    submit,
    retry,
    logout,
  };
}
