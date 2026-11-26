/**
 * Returns the system symbol (first two dash-separated segments) of a waypoint
 * symbol when it has exactly three non-empty segments, otherwise null.
 */
export function deriveSystemSymbol(waypointSymbol: string): string | null {
  const parts = waypointSymbol.split('-');
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
    return null;
  }
  return `${parts[0]}-${parts[1]}`;
}

/** Joins a system symbol and a waypoint suffix into a full waypoint symbol. */
export function joinWaypointSymbol(systemSymbol: string, suffix: string): string {
  return `${systemSymbol}-${suffix}`;
}
