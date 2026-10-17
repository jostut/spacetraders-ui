import type { FormEvent } from 'react';
import type { UseLogin } from '../hooks/useLogin';

export interface LoginFormProps {
  login: UseLogin;
}

/** Maximum allowed token length (Requirement 1.6). */
const MAX_TOKEN_LENGTH = 4096;

/** Exact validation message shown when the token exceeds the maximum length. */
export const MAX_LENGTH_MESSAGE =
  'Token exceeds the maximum allowed length of 4096 characters.';

/**
 * Login form: a single token input plus a submit control.
 *
 * Behavior (design.md "LoginForm", Requirements 1.1-1.6, 4.3-4.5):
 * - Renders exactly one text input for the Agent_Token and one submit control
 *   (Requirement 1.1).
 * - The submit control's enabled state is derived from the hook's
 *   `submitEnabled` predicate: disabled for whitespace-only input and for
 *   tokens beyond 4096 characters, enabled for 1..4096 non-whitespace
 *   characters (Requirements 1.2, 1.3, 1.6).
 * - Shows a max-length validation message when the entered token exceeds 4096
 *   characters (Requirement 1.6).
 * - While a Login_Request is in flight (`status === 'loading'`), shows a
 *   loading indicator and disables the submit control (Requirement 1.5).
 * - On submit, passes the (hook-trimmed) token to `useLogin.submit`
 *   (Requirement 1.4).
 * - The controlled input value lives in hook state, so the entered token is
 *   preserved across failures (Requirements 4.3, 4.4, 4.5).
 */
export function LoginForm({ login }: LoginFormProps) {
  const { token, setToken, submitEnabled, submit, status } = login;

  const isLoading = status === 'loading';
  const exceedsMaxLength = token.length > MAX_TOKEN_LENGTH;
  // Guard against double submission while a request is already in flight.
  const canSubmit = submitEnabled && !isLoading;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    void submit();
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Agent login">
      <label htmlFor="agent-token">Agent token</label>
      <input
        id="agent-token"
        name="agent-token"
        type="text"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        disabled={isLoading}
        aria-invalid={exceedsMaxLength}
        aria-describedby={exceedsMaxLength ? 'agent-token-error' : undefined}
        autoComplete="off"
      />

      {exceedsMaxLength && (
        <p id="agent-token-error" role="alert">
          {MAX_LENGTH_MESSAGE}
        </p>
      )}

      <button type="submit" disabled={!canSubmit}>
        Log in
      </button>

      {isLoading && (
        <span role="status" aria-live="polite">
          Logging in…
        </span>
      )}
    </form>
  );
}
