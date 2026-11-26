import { describe, expect, it } from 'vitest';
import { sortWaypointsBySymbol } from './sortWaypoints';

/**
 * Unit tests for list ordering (task 7.9).
 *
 * Validates: Requirements 3.8
 */
describe('sortWaypointsBySymbol', () => {
  it('orders numerically-aware: A2 before A10', () => {
    const sorted = sortWaypointsBySymbol([
      { symbol: 'X1-AB-A10' },
      { symbol: 'X1-AB-A2' },
      { symbol: 'X1-AB-A1' },
    ]);
    expect(sorted.map((w) => w.symbol)).toEqual(['X1-AB-A1', 'X1-AB-A2', 'X1-AB-A10']);
  });

  it('does not mutate the input array', () => {
    const input = [{ symbol: 'B' }, { symbol: 'A' }];
    const snapshot = [...input];
    const sorted = sortWaypointsBySymbol(input);
    expect(input).toEqual(snapshot);
    expect(input[0]).toBe(snapshot[0]);
    expect(sorted).not.toBe(input);
  });

  it('returns the same rows (same objects, same count)', () => {
    const a = { symbol: 'C', type: 'PLANET' };
    const b = { symbol: 'A', type: 'MOON' };
    const c = { symbol: 'B', type: 'ASTEROID' };
    const sorted = sortWaypointsBySymbol([a, b, c]);
    expect(sorted).toHaveLength(3);
    expect(sorted).toEqual([b, c, a]);
    expect(sorted[0]).toBe(b);
    expect(sorted[2]).toBe(a);
  });
});
