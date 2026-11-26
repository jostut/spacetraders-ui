import { useLogin } from './hooks/useLogin';
import { LoginForm } from './components/LoginForm';
import { AgentDetails } from './components/AgentDetails';
import { ErrorBanner } from './components/ErrorBanner';
import { ConnectionStatus } from './components/ConnectionStatus';
import { useHealthCheck } from './hooks/useHealthCheck';
import { useLocation } from './hooks/useLocation';
import { LocationPanel } from './components/LocationPanel';
import type { AgentDetails as AgentDetailsModel } from './types';
import './App.css';

/**
 * Two-column layout shown only while agent details are displayed. `useLocation`
 * lives here so that logging out unmounts this component and clears all
 * location state.
 */
function AgentWithLocation({
  agent,
  onLogout,
}: {
  agent: AgentDetailsModel;
  onLogout(): void;
}) {
  const location = useLocation(agent.headquarters ?? null);
  return (
    <div className="agent-layout">
      <div className="agent-layout__details">
        <AgentDetails
          agent={agent}
          onLogout={onLogout}
          onSelectHeadquarters={location.select}
        />
      </div>
      <div className="agent-layout__panel">
        <LocationPanel {...location} />
      </div>
    </div>
  );
}

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
  const backendHealth = useHealthCheck('/health');
  const spacetradersHealth = useHealthCheck('/health/spacetraders');
  const showAgentDetails = login.status === 'success' && login.agent !== null;

  return (
    <main>
      <h1>SpaceTraders</h1>
      {!showAgentDetails && (
        <>
          <ConnectionStatus label="Backend API" state={backendHealth} />
          <ConnectionStatus label="SpaceTraders v2 API" state={spacetradersHealth} />
        </>
      )}
      {login.error !== null && (
        <ErrorBanner error={login.error} onRetry={login.retry} />
      )}
      {showAgentDetails ? (
        <AgentWithLocation agent={login.agent!} onLogout={login.logout} />
      ) : (
        <LoginForm login={login} />
      )}
    </main>
  );
}
