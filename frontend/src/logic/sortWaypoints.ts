import type { WaypointSummary } from '../types';

/**
 * Returns a new array sorted ascending by symbol (natural, case-insensitive
 * order). The input is not mutated (Requirement 3.8).
 */
export function sortWaypointsBySymbol<T extends Pick<WaypointSummary, 'symbol'>>(
  waypoints: readonly T[],
): T[] {
  return [...waypoints].sort((a, b) =>
    a.symbol.localeCompare(b.symbol, 'en', { numeric: true, sensitivity: 'base' }),
  );
}
