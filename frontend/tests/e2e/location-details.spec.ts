import { test, expect } from "@playwright/test";
import { mockLoginSuccess, SAMPLE_AGENT, submitLogin } from "./helpers";

/**
 * End-to-end: location details panel (task 8.3).
 *
 * Logs in, opens the headquarters from the agent details, and returns to the
 * location list. The backend's waypoint routes are stubbed at the network
 * boundary, as the login route is in the other e2e specs.
 *
 * Requirements: 1.2 (headquarters button selects it), 3.1 (list shown when
 * nothing is selected), 4.1 (details requested for the selection), 5.2 (back
 * control clears the selection), 5.3 (list is not refetched on return).
 */
const SYSTEM = "X1-DF55";
const HQ = SAMPLE_AGENT.headquarters!; // X1-DF55-20250Z

const WAYPOINTS = [
  { symbol: HQ, type: "PLANET", x: 10, y: -4 },
  { symbol: "X1-DF55-A1", type: "ASTEROID", x: 3, y: 7 },
];

const HQ_DETAIL = {
  symbol: HQ,
  type: "PLANET",
  systemSymbol: SYSTEM,
  x: 10,
  y: -4,
  orbits: null,
  orbitals: ["X1-DF55-20250Y"],
  faction: "COSMIC",
  traits: [{ symbol: "MARKETPLACE", name: "Marketplace" }],
  modifiers: [],
  isUnderConstruction: false,
};

test("opening the headquarters shows its details and back returns to the cached list", async ({
  page,
}) => {
  await mockLoginSuccess(page);

  let listRequests = 0;
  let detailRequests = 0;
  await page.route(`**/api/systems/${SYSTEM}/waypoints`, async (route) => {
    listRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ waypoints: WAYPOINTS }),
    });
  });
  await page.route(
    `**/api/systems/${SYSTEM}/waypoints/${HQ}`,
    async (route) => {
      detailRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(HQ_DETAIL),
      });
    },
  );

  await page.goto("/");
  await submitLogin(page, "valid-agent-token");

  // Requirement 3.1: with nothing selected, the panel lists the system.
  const panel = page.getByRole("region", { name: "Location panel" });
  const crumbs = panel.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.getByText(SYSTEM)).toHaveAttribute("aria-current", "page");
  await expect(crumbs.getByRole("button")).toHaveCount(0);
  await expect(panel.getByRole("button", { name: /X1-DF55-A1/ })).toBeVisible();
  // The dev server renders under StrictMode, which double-invokes the mount
  // effect, so record the count after the initial load rather than assuming 1.
  const listRequestsAfterLoad = listRequests;
  expect(listRequestsAfterLoad).toBeGreaterThanOrEqual(1);

  // Requirements 1.2, 4.1: activating the headquarters opens its details.
  await page
    .getByRole("region", { name: "Agent details" })
    .getByRole("button", { name: HQ })
    .click();

  await expect(crumbs.getByRole("button", { name: SYSTEM })).toBeVisible();
  await expect(crumbs.getByText(HQ)).toHaveAttribute("aria-current", "page");
  await expect(panel.getByText("Marketplace")).toBeVisible();
  await expect(panel.getByText("COSMIC")).toBeVisible();
  expect(detailRequests).toBe(1);

  // Requirements 5.2, 5.3: back returns to the list without a new list request.
  await crumbs.getByRole("button", { name: SYSTEM }).click();
  await expect(crumbs.getByText(SYSTEM)).toHaveAttribute("aria-current", "page");
  await expect(crumbs.getByRole("button")).toHaveCount(0);
  expect(listRequests).toBe(listRequestsAfterLoad);
});
