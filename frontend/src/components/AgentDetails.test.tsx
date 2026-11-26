import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentDetails } from './AgentDetails';
import { FIELD_PLACEHOLDER } from '../logic/fieldOrPlaceholder';
import type { AgentDetails as AgentDetailsModel } from '../types';

/**
 * Unit tests for the headquarters button in AgentDetails (task 7.6).
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

const agent: AgentDetailsModel = {
  accountId: 'acc-1',
  symbol: 'TESTER',
  headquarters: 'X1-AB12-A1',
  credits: 100000,
  startingFaction: 'COSMIC',
  shipCount: 2,
};

describe('AgentDetails headquarters button', () => {
  it('renders the headquarters symbol as a button (Requirement 1.1)', () => {
    render(<AgentDetails agent={agent} onLogout={() => {}} />);
    expect(screen.getByRole('button', { name: 'X1-AB12-A1' })).toBeInTheDocument();
  });

  it('calls onSelectHeadquarters with the symbol on click (Requirement 1.2)', async () => {
    const onSelect = vi.fn();
    render(
      <AgentDetails agent={agent} onLogout={() => {}} onSelectHeadquarters={onSelect} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'X1-AB12-A1' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('X1-AB12-A1');
  });

  it('activates with Enter and Space via keyboard (Requirement 1.3)', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <AgentDetails agent={agent} onLogout={() => {}} onSelectHeadquarters={onSelect} />,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'X1-AB12-A1' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenNthCalledWith(1, 'X1-AB12-A1');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'X1-AB12-A1');
  });

  it('renders the placeholder and no button when headquarters is null (Requirement 1.4)', () => {
    render(
      <AgentDetails
        agent={{ ...agent, headquarters: null }}
        onLogout={() => {}}
        onSelectHeadquarters={() => {}}
      />,
    );
    const term = screen.getByText('Headquarters');
    const value = term.nextElementSibling as HTMLElement;
    expect(value).toHaveTextContent(FIELD_PLACEHOLDER);
    expect(within(value).queryByRole('button')).toBeNull();
  });
});
