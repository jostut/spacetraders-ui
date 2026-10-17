import type { LoginError } from '../types';

export interface ErrorBannerProps {
  error: LoginError;
  onRetry?: () => void;
}

/**
 * Displays the current login error message and, for the client-side timeout
 * case, a retry control.
 *
 * Per design.md "Error Handling", the client-side 10s timeout surfaces the
 * "Agent details could not be retrieved." message (the `could-not-retrieve`
 * kind) with a retry control available (Requirement 3.4). The other error
 * kinds — `token-invalid` (Requirement 4.3) and `service-unavailable`
 * (Requirement 4.5) — display their message with no retry control.
 *
 * The retry control is only rendered when both the error is of the
 * `could-not-retrieve` kind and an `onRetry` handler is supplied.
 */
export function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  const showRetry = error.kind === 'could-not-retrieve' && onRetry != null;

  return (
    <div className="error-banner" role="alert">
      <p className="error-banner__message">{error.message}</p>
      {showRetry && (
        <button
          type="button"
          className="error-banner__retry"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}
