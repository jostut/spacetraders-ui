import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLogin } from "./useLogin";

// Smoke test for frontend statelessness.
//
// Requirement 5.3: WHILE a Session is active, THE Web_Client SHALL retain the
// Agent_Token only in volatile in-memory state and SHALL NOT write it to
// localStorage, sessionStorage, cookies, or IndexedDB.
//
// This test drives the useLogin hook through a full login -> display -> logout
// cycle with a mocked fetch returning a success agent payload, while spying on
// every browser persistence surface. It asserts that none of those surfaces is
// touched at any point in the cycle.

/** A representative success agent payload returned by the backend. */
const SUCCESS_AGENT = {
  accountId: "acct-123",
  symbol: "CALLSIGN",
  headquarters: "X1-HQ",
  credits: 150000,
  startingFaction: "COSMIC",
  shipCount: 2,
};

/** A token value exercised through the login cycle. */
const TOKEN = "super-secret-agent-token";

describe("useLogin - statelessness smoke test (Requirement 5.3)", () => {
  // Spies on each persistence surface. Declared here so they can be asserted
  // after the full cycle and restored in afterEach.
  // Each spy is typed to the exact signature of the method it stands in for, so
  // that the specifically-typed value returned by vi.spyOn assigns cleanly.
  let localSetSpy: MockInstance<typeof Storage.prototype.setItem>;
  let localGetSpy: MockInstance<typeof Storage.prototype.getItem>;
  let sessionSetSpy: MockInstance<typeof window.sessionStorage.setItem>;
  let sessionGetSpy: MockInstance<typeof window.sessionStorage.getItem>;
  let cookieSetSpy: ReturnType<typeof vi.fn>;
  let indexedDbOpenSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localSetSpy = vi.spyOn(Storage.prototype, "setItem");
    localGetSpy = vi.spyOn(Storage.prototype, "getItem");
    // Storage.prototype backs both localStorage and sessionStorage, so spy on
    // the concrete instances for sessionStorage to disambiguate call targets.
    sessionSetSpy = vi.spyOn(window.sessionStorage, "setItem");
    sessionGetSpy = vi.spyOn(window.sessionStorage, "getItem");

    // document.cookie setter: jsdom defines cookie on the Document prototype.
    cookieSetSpy = vi.fn();
    const cookieDescriptor =
      Object.getOwnPropertyDescriptor(Document.prototype, "cookie") ??
      Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(document),
        "cookie",
      );
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
      set: (value: string) => {
        cookieSetSpy(value);
      },
    });
    // Keep a reference for restoration in afterEach.
    (
      document as unknown as { __cookieDescriptor?: PropertyDescriptor }
    ).__cookieDescriptor = cookieDescriptor;

    // indexedDB.open: provide a spyable implementation. jsdom does not supply
    // IndexedDB, so define the surface and assert it is never invoked.
    indexedDbOpenSpy = vi.fn();
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: { open: indexedDbOpenSpy },
    });

    // Mock the transport to return a successful agent payload.
    const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(SUCCESS_AGENT), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    // Restore the document.cookie descriptor so other tests are unaffected.
    const saved = (
      document as unknown as { __cookieDescriptor?: PropertyDescriptor }
    ).__cookieDescriptor;
    if (saved) {
      Object.defineProperty(document, "cookie", saved);
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("touches no persistence surface during login, display, and logout", async () => {
    const { result } = renderHook(() => useLogin());

    // --- Login ---
    act(() => {
      result.current.setToken(TOKEN);
    });

    await act(async () => {
      await result.current.submit();
    });

    // --- Display: a successful login surfaces the agent for rendering ---
    expect(result.current.status).toBe("success");
    expect(result.current.agent).toEqual(SUCCESS_AGENT);

    // --- Logout ---
    act(() => {
      result.current.logout();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.agent).toBeNull();
    expect(result.current.token).toBe("");

    // --- Assert no persistence surface was ever touched ---
    expect(localSetSpy).not.toHaveBeenCalled();
    expect(localGetSpy).not.toHaveBeenCalled();
    expect(sessionSetSpy).not.toHaveBeenCalled();
    expect(sessionGetSpy).not.toHaveBeenCalled();
    expect(cookieSetSpy).not.toHaveBeenCalled();
    expect(indexedDbOpenSpy).not.toHaveBeenCalled();
  });
});
