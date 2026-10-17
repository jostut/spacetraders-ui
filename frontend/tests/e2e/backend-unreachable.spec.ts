import { test, expect } from "@playwright/test";
import { LOGIN_ERROR_MESSAGES } from "../../src/logic/classifyResponse";
import { mockLoginUnreachable, submitLogin } from "./helpers";

/**
 * End-to-end: backend unreachable (task 9.5).
 *
 * When the backend cannot be reached, the client surfaces the
 * "service unavailable" error (Requirement 4.5) and preserves the token the
 * user entered. The SpaceTraders_API — and here the backend itself — is mocked
 * at the network boundary: `mockLoginUnreachable` aborts the frontend's
 * `/api/login` request at the network layer, mirroring a backend the client
 * cannot reach. The resulting network failure is classified by
 * `classifyResponse` as `service-unavailable`.
 *
 * Requirements: 4.5 (backend unreachable → "The service is unavailable."
 * message with the entered token preserved).
 */
test("backend unreachable shows the service-unavailable message and preserves the token", async ({
  page,
}) => {
  await mockLoginUnreachable(page);

  await page.goto("/");

  const tokenInput = page.getByLabel("Agent token");
  await expect(tokenInput).toHaveValue("");

  const token = "token-for-unreachable-backend";
  await submitLogin(page, token);

  // Requirement 4.5: the service-unavailable message appears, matching the
  // exact LOGIN_ERROR_MESSAGES['service-unavailable'] constant.
  await expect(page.getByRole("alert")).toHaveText(
    LOGIN_ERROR_MESSAGES["service-unavailable"],
  );

  // Requirement 4.5: the entered token is preserved in the input across the
  // failure, so the user can retry without retyping it.
  await expect(tokenInput).toHaveValue(token);

  // The login form remains available (no agent details were shown).
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Agent details" }),
  ).toHaveCount(0);
});
