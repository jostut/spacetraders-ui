import type { HealthState } from '../hooks/useHealthCheck';
import './ConnectionStatus.css';

export interface ConnectionStatusProps {
  label: string;
  state: HealthState;
}

const DOT_COLOR: Record<Exclude<HealthState, 'checking'>, string> = {
  connected: 'green',
  unavailable: 'red',
};

/**
 * Shows the connection state of one service: a spinner while checking, a
 * green dot when connected, a red dot when unavailable, next to the visible
 * service name. The accessible name is "{label}: {state}"; the spinner and
 * dots are hidden from assistive technology (Requirements 4.1-4.5).
 */
export function ConnectionStatus({ label, state }: ConnectionStatusProps) {
  return (
    <div
      className="connection-status"
      role="status"
      aria-label={`${label}: ${state}`}
    >
      {state === 'checking' ? (
        <span className="status-spinner" aria-hidden="true" />
      ) : (
        <span
          className={`status-dot status-dot--${state}`}
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '0.75em',
            height: '0.75em',
            borderRadius: '50%',
            marginRight: '0.5em',
            backgroundColor: DOT_COLOR[state],
          }}
        />
      )}
      <span>{label}</span>
    </div>
  );
}
