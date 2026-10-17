import { test, expect } from "@playwright/test";
import { LOGIN_ERROR_MESSAGES } from "../../src/logic/classifyResponse";
import { mockLoginError, submitLogin } from "./helpers";

/**
 * End-to-end: upstream / timeout failures (task 9.4).
 *
 * A backend HTTP 502 (upstream API error) and HTTP 504 (SpaceTraders_API
 * timeout) each surface the "Agent details could not be retrieved." message
 * while preserving the entered Agent_Token in the login form. The
 * SpaceTraders_API is mocked at the network boundary by intercepting the
 * frontend's backend `/api/login` call and returning a classified error
 * envelope with the given status.
 *
 * Requirements: 4.4 (HTTP 502/504 -> "could not be retrieved" message, token
 * preserved in the input field).
 */

const COULD_NOT_RETRIEVE = LOGIN_ERROR_MESSAGES["could-not-retrieve"];

test("a backend 502 (upstream) yields the could-not-retrieve message and preserves the token", async ({
  page,
}) => {
  const token = "upstream-failure-token";

  // Mock the backend classifying an upstream SpaceTraders_API error as 502.
  await mockLoginError(
    page,
    502,
    "upstream",
    "The upstream SpaceTraders API returned an error.",
  );

  await page.goto("/");
  await submitLogin(page, token);

  // Requirement 4.4: the "could not be retrieved" message is displayed.
  const banner = page.getByRole("alert");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(COULD_NOT_RETRIEVE);

  // Requirement 4.4: the login form is retained with the entered token
  // preserved in the input field.
  await expect(page.getByLabel("Agent token")).toHaveValue(token);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("a backend 504 (timeout) yields the could-not-retrieve message and preserves the token", async ({
  page,
}) => {
  const token = "timeout-failure-token";

  // Mock the backend classifying a SpaceTraders_API deadline exceedance as 504.
  await mockLoginError(
    page,
    504,
    "timeout",
    "The request to the SpaceTraders API timed out.",
  );

  await page.goto("/");
  await submitLogin(page, token);

  // Requirement 4.4: the "could not be retrieved" message is displayed.
  const banner = page.getByRole("alert");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(COULD_NOT_RETRIEVE);

  // Requirement 4.4: the login form is retained with the entered token
  // preserved in the input field.
  await expect(page.getByLabel("Agent token")).toHaveValue(token);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});
