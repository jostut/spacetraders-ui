import type { LoginError } from "../types";

/**
 * Exact user-facing messages per design.md "Error Handling".
 * Kept as named constants so the UI and tests share a single source of truth.
 */
export const LOGIN_ERROR_MESSAGES = {
  "token-invalid": "Your token is invalid.",
  "could-not-retrieve": "Agent details could not be retrieved.",
  "service-unavailable": "The service is unavailable.",
} as const;

/**
 * Pure classifier mapping a transport result to a user-facing LoginError.
 *
 * Mapping (design.md "Error Handling", Requirements 4.3, 4.4, 4.5):
 *   HTTP 401                 -> token-invalid       ("Your token is invalid.")
 *   HTTP 502 / 504           -> could-not-retrieve  ("Agent details could not be retrieved.")
 *   network / client-timeout -> service-unavailable ("The service is unavailable.")
 *
 * A network error (backend unreachable or the client-side 10s timeout aborting
 * the request) is signalled via `networkError = true`; in that case `status`
 * carries no meaningful value and is ignored.
 *
 * @param status The HTTP status code from the backend, or `null` when no
 *   response was received (e.g. a network failure or client-side timeout).
 * @param networkError `true` when the backend could not be reached or the
 *   client aborted the request before a response arrived.
 * @returns the LoginError whose kind and exact message match the outcome.
 */
export function classifyResponse(
  status: number | null,
  networkError: boolean,
): LoginError {
  // Backend unreachable or client-side timeout: no usable status code.
  if (networkError) {
    return {
      kind: "service-unavailable",
      message: LOGIN_ERROR_MESSAGES["service-unavailable"],
    };
  }

  switch (status) {
    case 401:
      return {
        kind: "token-invalid",
        message: LOGIN_ERROR_MESSAGES["token-invalid"],
      };
    case 502:
    case 504:
      return {
        kind: "could-not-retrieve",
        message: LOGIN_ERROR_MESSAGES["could-not-retrieve"],
      };
    default:
      // Any other transport outcome without a recognized status (including a
      // missing status) is treated as the service being unavailable.
      return {
        kind: "service-unavailable",
        message: LOGIN_ERROR_MESSAGES["service-unavailable"],
      };
  }
}
