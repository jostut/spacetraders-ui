import type { Page, Route } from '@playwright/test';
import type { AgentDetails } from '../../src/types';

/**
 * Shared end-to-end test helpers for the agent-login feature.
 *
 * The SpaceTraders_API is mocked at the network boundary. In the frontend the
 * `useLogin` hook POSTs the Login_Request to the backend at the relative URL
 * `/api/login` (which, under the Playwright webServer, resolves to the Vite dev
 * server origin). These helpers intercept that call with `page.route` so e2e
 * specs can drive the full user-facing flow against a controllable fake backend
 * without a live SpaceTraders_API.
 *
 * This module is intentionally reusable: multiple e2e specs (successful login,
 * logout/reload, invalid token, upstream/timeout failures, backend unreachable)
 * import these helpers rather than redefining their own route plumbing.
 */

/** Glob the frontend's Login_Request endpoint, regardless of origin. */
export const LOGIN_ROUTE = '**/api/login';

/**
 * A representative, fully-populated Agent_Details fixture. All six fields are
 * present so a successful-login flow can assert each one renders its value.
 */
export const SAMPLE_AGENT: AgentDetails = {
  accountId: 'acct_01HZX8CHECKEDIN',
  symbol: 'CAPTAIN-NOVA',
  headquarters: 'X1-DF55-20250Z',
  credits: 175000,
  startingFaction: 'COSMIC',
  shipCount: 2,
};

/**
 * Mock the backend `/api/login` endpoint to return a successful (HTTP 200)
 * Agent_Details JSON body.
 *
 * @param page  The Playwright page to install the route on.
 * @param agent The Agent_Details payload to return (defaults to {@link SAMPLE_AGENT}).
 */
export async function mockLoginSuccess(
  page: Page,
  agent: AgentDetails = SAMPLE_AGENT,
): Promise<void> {
  await page.route(LOGIN_ROUTE, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(agent),
    });
  });
}

/**
 * Mock the backend `/api/login` endpoint to return a classified error envelope
 * with the given HTTP status (e.g. 401, 502, 504).
 *
 * @param page    The Playwright page to install the route on.
 * @param status  The HTTP status code to return.
 * @param kind    The error kind the backend would report in its envelope.
 * @param message A redacted, human-readable error message (never the token).
 */
export async function mockLoginError(
  page: Page,
  status: number,
  kind: 'authentication' | 'timeout' | 'upstream',
  message: string,
): Promise<void> {
  await page.route(LOGIN_ROUTE, async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: { kind, message } }),
    });
  });
}

/**
 * Mock the backend `/api/login` endpoint as unreachable by aborting the request
 * at the network layer, mirroring a backend the client cannot reach.
 *
 * @param page The Playwright page to install the route on.
 */
export async function mockLoginUnreachable(page: Page): Promise<void> {
  await page.route(LOGIN_ROUTE, async (route: Route) => {
    await route.abort('failed');
  });
}

/**
 * Drive the login form: type the given token into the Agent_Token input and
 * activate the submit control.
 *
 * @param page  The Playwright page.
 * @param token The raw token text to type into the input.
 */
export async function submitLogin(page: Page, token: string): Promise<void> {
  await page.getByLabel('Agent token').fill(token);
  await page.getByRole('button', { name: 'Log in' }).click();
}
