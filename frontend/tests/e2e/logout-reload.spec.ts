import { test, expect } from "@playwright/test";
import { mockLoginSuccess, SAMPLE_AGENT, submitLogin } from "./helpers";

/**
 * End-to-end: logout and reload clearing state (task 9.2).
 *
 * Activating logout returns to an empty login form (Requirement 5.4), and a
 * fresh page load also shows an empty form with no agent data, with no
 * previously entered token or Agent_Details repopulated (Requirement 5.5).
 *
 * The SpaceTraders_API is mocked at the network boundary by intercepting the
 * frontend's backend `/api/login` call and returning a 200 Agent_Details body.
 *
 * Requirements: 5.4 (logout discards token + agent and shows an empty login
 * form), 5.5 (reload shows an empty login form with no repopulated token or
 * agent data).
 */
test("logout returns to an empty login form and a reload keeps it empty", async ({
  page,
}) => {
  await mockLoginSuccess(page);

  await page.goto("/");

  // Log in with a valid token so agent details are shown first.
  const tokenInput = page.getByLabel("Agent token");
  await expect(tokenInput).toHaveValue("");

  await submitLogin(page, "valid-agent-token");

  // The agent details region appears with the authenticated agent's call sign,
  // confirming an active session is established before we log out.
  const details = page.getByRole("region", { name: "Agent details" });
  await expect(details).toBeVisible();
  await expect(details).toContainText(SAMPLE_AGENT.symbol!);

  const logoutButton = details.getByRole("button", { name: "Log out" });
  await expect(logoutButton).toBeVisible();

  // Requirement 5.4: activating logout discards the token + Agent_Details from
  // memory and returns to the login form with an empty token input.
  await logoutButton.click();

  // Agent details are gone and the login form is back.
  await expect(
    page.getByRole("region", { name: "Agent details" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();

  // The token input is present and empty (no previously entered token).
  const tokenInputAfterLogout = page.getByLabel("Agent token");
  await expect(tokenInputAfterLogout).toHaveValue("");

  // Requirement 5.5: a fresh page load shows the empty login form with no
  // repopulated token or agent data.
  await page.reload();

  await expect(
    page.getByRole("region", { name: "Agent details" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  await expect(page.getByLabel("Agent token")).toHaveValue("");
});
