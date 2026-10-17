import { test, expect } from "@playwright/test";
import { LOGIN_ERROR_MESSAGES } from "../../src/logic/classifyResponse";
import { mockLoginError, submitLogin } from "./helpers";

/**
 * End-to-end: invalid token / HTTP 401 (task 9.3).
 *
 * When the backend rejects the Login_Request with an authentication error
 * (HTTP 401), the Web_Client surfaces the exact "token invalid" message and
 * retains the login form with the previously entered Agent_Token preserved in
 * the input field. The SpaceTraders_API is mocked at the network boundary by
 * intercepting the frontend's `/api/login` call and returning a 401 classified
 * error envelope.
 *
 * Requirements: 4.3 (HTTP 401 -> token-invalid message, form retained with the
 * entered token preserved).
 */
test("an upstream 401 shows the token-invalid message and preserves the entered token", async ({
  page,
}) => {
  // Mock the backend to classify the token as an authentication failure. The
  // message is redacted (never the token) per the backend contract.
  await mockLoginError(page, 401, "authentication", "Authentication failed.");

  await page.goto("/");

  const tokenInput = page.getByLabel("Agent token");
  await expect(tokenInput).toHaveValue("");

  const token = "an-invalid-agent-token";
  await submitLogin(page, token);

  // Requirement 4.3: the exact token-invalid message is displayed. This is the
  // single source of truth shared with the classifier.
  await expect(page.getByRole("alert")).toHaveText(
    LOGIN_ERROR_MESSAGES["token-invalid"],
  );

  // Requirement 4.3: the login form is retained with the entered token
  // preserved in the input field, ready for the user to correct and resubmit.
  await expect(tokenInput).toHaveValue(token);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();

  // No agent details are shown on a failed login.
  await expect(page.getByRole("region", { name: "Agent details" })).toHaveCount(
    0,
  );
});
