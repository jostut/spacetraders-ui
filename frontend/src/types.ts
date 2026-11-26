/**
 * Shared data models for the agent-login feature.
 * See design.md "Data Models".
 */

export interface AgentDetails {
  accountId: string | null;
  symbol: string | null;
  headquarters: string | null;
  credits: number | null;
  startingFaction: string | null;
  shipCount: number; // >= 0
}

export interface LoginRequest {
  token: string; // trimmed, 1..4096 non-whitespace chars
}

export type LoginErrorKind =
  | "token-invalid"
  | "could-not-retrieve"
  | "service-unavailable";

export interface LoginError {
  kind: LoginErrorKind;
  message: string;
}

export type LoginStatus = "idle" | "loading" | "success" | "error";

/**
 * Shared data models for the location-details-panel feature.
 * See location-details-panel design.md "Data Models".
 */

export interface WaypointSummary {
  symbol: string;
  type: string;
  x: number;
  y: number;
}

export interface WaypointDetail {
  symbol: string;
  type: string;
  systemSymbol: string;
  x: number;
  y: number;
  orbits: string | null;
  orbitals: string[];
  faction: string | null;
  traits: { symbol: string; name: string }[];
  modifiers: { symbol: string; name: string }[];
  isUnderConstruction: boolean;
}

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string; notFound: boolean };
