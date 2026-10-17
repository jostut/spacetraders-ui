import { useLogin } from './hooks/useLogin';
import { LoginForm } from './components/LoginForm';
import { AgentDetails } from './components/AgentDetails';
import { ErrorBanner } from './components/ErrorBanner';

/**
 * App shell. Wires the `useLogin` hook to the UI components (task 7.7).
 *
 * All session state lives in volatile in-memory React state owned by
 * `useLogin`, so the app renders:
 * - the login form when there is no active session (Requirement 1.1),
 * - the agent details plus logout control on a successful login
 *   (Requirements 3.1, 3.5),
 * - an error banner whenever a Login_Request fails, alongside the preserved
 *   login form (Requirements 4.3, 4.4, 4.5).
 *
 * Because nothing is persisted to any storage API, a page reload drops the
 * in-memory state and the app shows an empty login form with no repopulated
 * token or agent data (Requirement 5.5).
 */
export function App() {
  const login = useLogin();
  const showAgentDetails = login.status === 'success' && login.agent !== null;

  return (
    <main>
      <h1>SpaceTraders</h1>
      {login.error !== null && (
        <ErrorBanner error={login.error} onRetry={login.retry} />
      )}
      {showAgentDetails ? (
        <AgentDetails agent={login.agent!} onLogout={login.logout} />
      ) : (
        <LoginForm login={login} />
      )}
    </main>
  );
}
