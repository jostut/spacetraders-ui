import type { CSSProperties } from 'react';
import type { UseLocation } from '../hooks/useLocation';
import { sortWaypointsBySymbol } from '../logic/sortWaypoints';
import './LocationPanel.css';

export type LocationPanelProps = Pick<
  UseLocation,
  'systemSymbol' | 'selected' | 'list' | 'detail' | 'select' | 'retry'
>;

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const LOADING_LIST = 'Loading locations';
const LOADING_DETAIL = 'Loading location details';
const NOT_FOUND = 'Location not found';

/**
 * Shows the Location_List, the Location_Details, a loading state, or an error
 * state (Requirements 3, 4, 5, 6). Driven entirely by `useLocation` results,
 * so it can be rendered with plain data.
 *
 * Loading and error text is mirrored into a visually hidden polite live
 * region (Requirement 6.5); the visible copy is aria-hidden to avoid double
 * announcements.
 */
export function LocationPanel({
  systemSymbol,
  selected,
  list,
  detail,
  select,
  retry,
}: LocationPanelProps) {
  const breadcrumb =
    systemSymbol === null ? null : (
      <nav aria-label="Breadcrumb" className="location-breadcrumb">
        <ol>
          <li>
            {selected === null ? (
              <span aria-current="page">{systemSymbol}</span>
            ) : (
              <button type="button" onClick={() => select(null)}>
                {systemSymbol}
              </button>
            )}
          </li>
          {selected !== null && <li aria-current="page">{selected}</li>}
        </ol>
      </nav>
    );
  const retryButton = (
    <button type="button" onClick={retry}>
      Retry
    </button>
  );

  let announcement = '';
  let body: React.ReactNode;

  if (selected === null) {
    if (list.status === 'loading' || list.status === 'idle') {
      announcement = LOADING_LIST;
      body = <p aria-hidden="true">{LOADING_LIST}</p>;
    } else if (list.status === 'error') {
      announcement = list.message;
      body = (
        <div>
          <p aria-hidden="true">{list.message}</p>
          {systemSymbol !== null && retryButton}
        </div>
      );
    } else {
      body = (
        <div>
          {list.data.length === 0 ? (
            <p>No locations found</p>
          ) : (
            <ul>
              {sortWaypointsBySymbol(list.data).map((w) => (
                <li key={w.symbol}>
                  <button type="button" onClick={() => select(w.symbol)}>
                    <span>{w.symbol}</span> <span>{w.type}</span>{' '}
                    <span>{w.x}</span> <span>{w.y}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
  } else if (detail.status === 'loading' || detail.status === 'idle') {
    announcement = LOADING_DETAIL;
    body = <p aria-hidden="true">{LOADING_DETAIL}</p>;
  } else if (detail.status === 'error') {
    if (detail.notFound) {
      announcement = NOT_FOUND;
      body = (
        <div>
          <p aria-hidden="true">{NOT_FOUND}</p>
        </div>
      );
    } else {
      announcement = detail.message;
      body = (
        <div>
          <p aria-hidden="true">{detail.message}</p>
          {retryButton}
        </div>
      );
    }
  } else {
    const d = detail.data;
    body = (
      <div>
        <dl>
          <dt>Symbol</dt>
          <dd>{d.symbol}</dd>
          <dt>Type</dt>
          <dd>{d.type}</dd>
          <dt>System</dt>
          <dd>{d.systemSymbol}</dd>
          <dt>X</dt>
          <dd>{d.x}</dd>
          <dt>Y</dt>
          <dd>{d.y}</dd>
          {d.orbits !== null && d.orbits !== undefined && (
            <>
              <dt>Orbital parent</dt>
              <dd>{d.orbits}</dd>
            </>
          )}
          <dt>Orbitals</dt>
          <dd>{d.orbitals.length > 0 ? d.orbitals.join(', ') : 'None'}</dd>
          {d.faction !== null && d.faction !== undefined && (
            <>
              <dt>Faction</dt>
              <dd>{d.faction}</dd>
            </>
          )}
          <dt>Traits</dt>
          <dd>
            {d.traits.length > 0 ? (
              <ul>
                {d.traits.map((t) => (
                  <li key={t.symbol}>{t.name}</li>
                ))}
              </ul>
            ) : (
              'None'
            )}
          </dd>
          <dt>Modifiers</dt>
          <dd>
            {d.modifiers.length > 0 ? (
              <ul>
                {d.modifiers.map((m) => (
                  <li key={m.symbol}>{m.name}</li>
                ))}
              </ul>
            ) : (
              'None'
            )}
          </dd>
          <dt>Under construction</dt>
          <dd>{d.isUnderConstruction ? 'Yes' : 'No'}</dd>
        </dl>
      </div>
    );
  }

  return (
    <section aria-label="Location panel">
      <div role="status" aria-live="polite" style={visuallyHidden}>
        {announcement}
      </div>
      {breadcrumb}
      {body}
    </section>
  );
}
