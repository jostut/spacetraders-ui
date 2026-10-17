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
  | 'token-invalid'
  | 'could-not-retrieve'
  | 'service-unavailable';

export interface LoginError {
  kind: LoginErrorKind;
  message: string;
}

export type LoginStatus = 'idle' | 'loading' | 'success' | 'error';
