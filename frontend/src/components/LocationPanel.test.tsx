import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationPanel, type LocationPanelProps } from './LocationPanel';

/**
 * Unit tests for LocationPanel (task 7.4).
 *
 * Validates: Requirements 3.4, 3.6, 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 6.5
 */

function makeProps(overrides: Partial<LocationPanelProps> = {}): LocationPanelProps {
  return {
    systemSymbol: 'X1-AB12',
    selected: null,
    list: { status: 'success', data: [] },
    detail: { status: 'idle' },
    select: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  };
}

describe('LocationPanel', () => {
  it('selects a location when its list row is clicked (3.4)', async () => {
    const select = vi.fn();
    render(
      <LocationPanel
        {...makeProps({
          select,
          list: {
            status: 'success',
            data: [
              { symbol: 'X1-AB12-A1', type: 'PLANET', x: 1, y: 2 },
              { symbol: 'X1-AB12-B2', type: 'MOON', x: 3, y: 4 },
            ],
          },
        })}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /X1-AB12-B2/ }));
    expect(select).toHaveBeenCalledWith('X1-AB12-B2');
  });

  it('renders an unsorted list in alphabetical order (3.8)', () => {
    render(
      <LocationPanel
        {...makeProps({
          list: {
            status: 'success',
            data: [
              { symbol: 'X1-AB12-A10', type: 'PLANET', x: 1, y: 2 },
              { symbol: 'X1-AB12-B1', type: 'MOON', x: 3, y: 4 },
              { symbol: 'X1-AB12-A2', type: 'MOON', x: 5, y: 6 },
            ],
          },
        })}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const rows = screen
      .getAllByRole('listitem')
      .filter((li) => !nav.contains(li))
      .map((li) => li.textContent ?? '');
    expect(rows[0]).toContain('X1-AB12-A2');
    expect(rows[1]).toContain('X1-AB12-A10');
    expect(rows[2]).toContain('X1-AB12-B1');
  });

  it('shows "No locations found" for an empty list (3.6)', () => {
    render(<LocationPanel {...makeProps()} />);
    expect(screen.getByText('No locations found')).toBeInTheDocument();
  });

  it('shows a loading label for the list (6.1) in the live region (6.5)', () => {
    render(<LocationPanel {...makeProps({ list: { status: 'loading' } })} />);
    expect(screen.getAllByText('Loading locations')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('Loading locations');
  });

  it('shows a loading label for details (6.2)', () => {
    render(
      <LocationPanel
        {...makeProps({ selected: 'X1-AB12-A1', detail: { status: 'loading' } })}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading location details');
  });

  it('shows list error with Retry that calls retry (6.3)', async () => {
    const retry = vi.fn();
    render(
      <LocationPanel
        {...makeProps({
          retry,
          list: { status: 'error', message: 'Boom', notFound: false },
        })}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Boom');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows the system as the current crumb in list view (3.5)', () => {
    render(<LocationPanel {...makeProps()} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav.querySelector('ol')).not.toBeNull();
    expect(within(nav).getByText('X1-AB12')).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('button')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('shows "Location not found" with a system crumb link on 404 (6.4)', async () => {
    const select = vi.fn();
    render(
      <LocationPanel
        {...makeProps({
          select,
          selected: 'X1-AB12-A1',
          detail: { status: 'error', message: 'x', notFound: true },
        })}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Location not found');
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.getByText('X1-AB12-A1')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: 'Back to locations' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'X1-AB12' }));
    expect(select).toHaveBeenCalledWith(null);
  });

  it('system crumb link in loaded details deselects (5.1, 5.2)', async () => {
    const select = vi.fn();
    render(
      <LocationPanel
        {...makeProps({
          select,
          selected: 'X1-AB12-A1',
          detail: {
            status: 'success',
            data: {
              symbol: 'X1-AB12-A1',
              type: 'PLANET',
              systemSymbol: 'X1-AB12',
              x: 1,
              y: 2,
              orbits: null,
              orbitals: [],
              faction: null,
              traits: [],
              modifiers: [],
              isUnderConstruction: false,
            },
          },
        })}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByText('X1-AB12-A1')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: 'Back to locations' })).toBeNull();
    await userEvent.click(within(nav).getByRole('button', { name: 'X1-AB12' }));
    expect(select).toHaveBeenCalledWith(null);
  });

  it('renders a polite live region (6.5)', () => {
    render(<LocationPanel {...makeProps()} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
