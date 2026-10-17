import type { AgentDetails as AgentDetailsModel } from '../types';
import { formatCredits } from '../logic/formatCredits';
import { fieldOrPlaceholder } from '../logic/fieldOrPlaceholder';

export interface AgentDetailsProps {
  agent: AgentDetailsModel;
  onLogout(): void;
}

/**
 * Renders the six agent fields (account identifier, call sign, headquarters,
 * credits, starting faction, ship count) and the logout control while the
 * details are displayed (Requirements 3.1, 3.2, 3.3, 3.5).
 *
 * Each field substitutes a placeholder indicator when its value is null/absent
 * via `fieldOrPlaceholder` (Requirement 3.3). The credits value is formatted
 * with `formatCredits` as a base-10 integer string (Requirement 3.2); because
 * credits may be null, the placeholder semantics are applied first and the
 * formatter runs only when a value is present.
 */
export function AgentDetails({ agent, onLogout }: AgentDetailsProps) {
  const creditsDisplay =
    agent.credits === null || agent.credits === undefined
      ? fieldOrPlaceholder(agent.credits)
      : formatCredits(agent.credits);

  return (
    <section aria-label="Agent details">
      <dl>
        <div>
          <dt>Account ID</dt>
          <dd>{fieldOrPlaceholder(agent.accountId)}</dd>
        </div>
        <div>
          <dt>Call sign</dt>
          <dd>{fieldOrPlaceholder(agent.symbol)}</dd>
        </div>
        <div>
          <dt>Headquarters</dt>
          <dd>{fieldOrPlaceholder(agent.headquarters)}</dd>
        </div>
        <div>
          <dt>Credits</dt>
          <dd>{creditsDisplay}</dd>
        </div>
        <div>
          <dt>Starting faction</dt>
          <dd>{fieldOrPlaceholder(agent.startingFaction)}</dd>
        </div>
        <div>
          <dt>Ship count</dt>
          <dd>{fieldOrPlaceholder(agent.shipCount)}</dd>
        </div>
      </dl>
      <button type="button" onClick={onLogout}>
        Log out
      </button>
    </section>
  );
}
