import { test, expect } from "@playwright/test";
import { formatCredits } from "../../src/logic/formatCredits";
import { mockLoginSuccess, SAMPLE_AGENT, submitLogin } from "./helpers";

/**
 * End-to-end: successful login (task 9.1).
 *
 * A valid token leads to the agent details rendering with all six fields and a
 * logout control. The SpaceTraders_API is mocked at the network boundary by
 * intercepting the frontend's backend `/api/login` call and returning a 200
 * Agent_Details body.
 *
 * Requirements: 1.1 (empty login form on load), 1.5 (request in flight),
 * 3.1 (all six fields rendered on success), 3.5 (logout control shown while
 * details are displayed).
 */
test("a valid token renders agent details with all six fields and a logout control", async ({
  page,
}) => {
  await mockLoginSuccess(page);

  await page.goto("/");

  // Requirement 1.1: the app loads with an empty login form (single token
  // input, empty value) and no agent details yet.
  const tokenInput = page.getByLabel("Agent token");
  await expect(tokenInput).toHaveValue("");
  await expect(page.getByRole("region", { name: "Agent details" })).toHaveCount(
    0,
  );

  // Submit a valid token (Requirements 1.4/1.5: a single Login_Request is sent).
  await submitLogin(page, "valid-agent-token");

  // Requirement 3.1 / 3.5: the agent details region appears with the logout
  // control. Awaiting the region covers the loading -> success transition.
  const details = page.getByRole("region", { name: "Agent details" });
  await expect(details).toBeVisible();

  // Requirement 3.1: all six fields render their values. Each <dt> label is
  // paired with its <dd> value inside a wrapping <div>, so we scope the value
  // assertion to the row whose <dt> has the exact label text and read its <dd>.
  const rowValue = (label: string) =>
    details
      .locator("div", {
        has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }),
      })
      .locator("dd");

  await expect(rowValue("Account ID")).toHaveText(SAMPLE_AGENT.accountId!);
  await expect(rowValue("Call sign")).toHaveText(SAMPLE_AGENT.symbol!);
  await expect(rowValue("Headquarters")).toHaveText(SAMPLE_AGENT.headquarters!);
  await expect(rowValue("Credits")).toHaveText(
    formatCredits(SAMPLE_AGENT.credits!),
  );
  await expect(rowValue("Starting faction")).toHaveText(
    SAMPLE_AGENT.startingFaction!,
  );
  await expect(rowValue("Ship count")).toHaveText(
    String(SAMPLE_AGENT.shipCount),
  );

  // Requirement 3.5: a logout control is displayed while details are shown.
  await expect(details.getByRole("button", { name: "Log out" })).toBeVisible();

  // The login form is no longer shown once details are displayed.
  await expect(page.getByRole("button", { name: "Log in" })).toHaveCount(0);
});
