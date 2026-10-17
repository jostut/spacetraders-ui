# Implementation Plan: Agent Login

## Overview

This plan builds the first stateless iteration of the SpaceTraders web client incrementally. It starts by scaffolding the two projects (TypeScript/React frontend and Python backend) and the pinned, repeatable client-generation pipeline, since the generated client is a build-time dependency of the backend. It then builds the backend's pure logic (`map_agent`, `classify_error`) and the `POST /api/login` handler on top of a per-request bearer client adapter, followed by the frontend's pure logic modules, the `useLogin` hook, and the UI components. Property-based tests are placed next to the pure logic they validate so correctness is caught early; integration, smoke, and Playwright end-to-end tests wire and validate the full flows last.

## Tasks

- [x] 1. Scaffold projects and tooling
  - [x] 1.1 Scaffold the TypeScript/React frontend project
    - Create the `frontend/` project with a TypeScript/React toolchain (bundler, `tsconfig`, entry HTML/root component mount point)
    - Add and configure a unit test runner, `fast-check`, and Playwright as dev dependencies with pinned versions
    - Add npm scripts for build, unit test (single-run, no watch), and Playwright e2e
    - Create empty module placeholders for pure logic (`submitEnabled`, `formatCredits`, `fieldOrPlaceholder`, `classifyResponse`), the `useLogin` hook, and the `LoginForm`/`AgentDetails`/`ErrorBanner` components so later tasks have stable import paths
    - _Requirements: 1.1_

  - [x] 1.2 Scaffold the Python backend project
    - Create the `backend/` project with a dependency/venv setup, pinned test tooling (`pytest`, `Hypothesis`), and a chosen web framework (Flask or FastAPI) wired to serve routes
    - Add a `make` target or script to run the backend and one to run backend tests
    - Create empty module placeholders for the `POST /api/login` handler, `map_agent`, `classify_error`, and the generated-client adapter so later tasks have stable import paths
    - _Requirements: 2.1_

- [x] 2. Generated API client pipeline
  - [x] 2.1 Implement the pinned, repeatable client-generation make target
    - Add a `make generate-client` target that fetches the SpaceTraders OpenAPI spec, runs `openapi-generator-cli` (pinned version) with the `python` generator and pinned options, and emits the client into the backend
    - Generate into a temporary location and only swap it into place on generator success; on malformed/invalid spec, abort with a non-zero exit status, do not overwrite the existing generated client, and emit an invalid-spec error
    - Treat the generated tree as read-only build output requiring no manual edits
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 2.2 Write smoke tests for the generation pipeline
    - Assert the generation command/config exists and, run against a valid fixture spec, produces the expected client modules (models + API operations)
    - Assert the single documented regeneration command runs end-to-end with no manual edits
    - _Requirements: 6.1, 6.2, 6.5_

  - [x] 2.3 Write integration test for malformed-spec abort behavior
    - Run generation against a malformed/invalid OpenAPI fixture; assert non-zero exit, existing client not overwritten, and an invalid-spec error is emitted
    - _Requirements: 6.3_

- [x] 3. Backend pure logic
  - [x] 3.1 Implement `map_agent`
    - Pure mapping that copies `accountId`, `symbol`, `headquarters`, `credits`, `startingFaction` null-preserving and sets `shipCount = max(0, reported)`
    - _Requirements: 2.3, 2.4_

  - [x] 3.2 Write property test for agent mapping
    - **Property 4: For any upstream agent payload, `map_agent` preserves `accountId`, `symbol`, `headquarters`, `credits`, and `startingFaction` exactly (including null values) and produces `shipCount = max(0, reportedShipCount)`.**
    - **Validates: Requirements 2.3, 2.4**
    - Use Hypothesis, minimum 100 iterations, with payloads carrying optional/null fields and arbitrary (incl. negative) ship counts
    - Tag: `Feature: agent-login, Property 4: Agent mapping preserves fields and floors ship count`
    - _Requirements: 2.3, 2.4_

  - [x] 3.3 Implement `classify_error`
    - Pure classifier: authentication outcome → `(401, "authentication")`; deadline/timeout outcome → `(504, "timeout")`; any other upstream failure → `(502, "upstream")`
    - Produce human-readable, token-free messages and scrub any occurrence of the token substring as defense-in-depth
    - _Requirements: 4.1, 4.2, 2.5_

  - [x] 3.4 Write property test for status mapping
    - **Property 6: For any upstream outcome, `classify_error` returns HTTP 401 for authentication errors, HTTP 504 for deadline/timeout, and HTTP 502 for any other upstream error.**
    - **Validates: Requirements 4.1, 4.2, 2.5**
    - Use Hypothesis, minimum 100 iterations, over auth / deadline / assorted-other outcomes
    - Tag: `Feature: agent-login, Property 6: Upstream outcomes map to the correct HTTP status`
    - _Requirements: 4.1, 4.2, 2.5_

  - [x] 3.5 Write property test for token redaction
    - **Property 7: For any token and any failure outcome, the serialized backend error response does not contain the token as a substring.**
    - **Validates: Requirements 4.1, 4.2**
    - Use Hypothesis, minimum 100 iterations, over arbitrary tokens × failure outcomes
    - Tag: `Feature: agent-login, Property 7: Error responses never contain the token`
    - _Requirements: 4.1, 4.2_

- [x] 4. Backend request handling
  - [x] 4.1 Implement the Generated_API_Client adapter
    - Configure a fresh generated-client configuration per request with the bearer token and a 10-second request timeout, then call the agent operation
    - Keep this the only module that touches generator-specific types; return a normalized outcome (success payload or a classified failure signal including deadline/timeout)
    - _Requirements: 2.1, 2.5, 6.4_

  - [x] 4.2 Implement the `POST /api/login` handler
    - Accept `{ "token": string }`, invoke the adapter, map success through `map_agent` and return `Agent_Details` with HTTP 200
    - Route every non-200 path through `classify_error`, returning `{ "error": { "kind", "message" } }` with 401/502/504; discard the token when the handler returns
    - Do not write or log the token or the agent payload anywhere that persists past the request
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 5.1, 5.2_

  - [x] 4.3 Write property test for failure form-restoration contract (backend side)
    - **Property 8: For any failure outcome, after the Login_Request settles the loading indicator is cleared and the submit control is re-enabled for any non-empty token.** (Backend portion: every failure resolves to a classified error response the frontend can act on.)
    - **Validates: Requirements 4.6**
    - Note: the primary Property 8 test lives on the frontend (task 6.x); this backend check asserts failures always resolve to a classified 401/502/504 response. Use Hypothesis, minimum 100 iterations.
    - Tag: `Feature: agent-login, Property 8: Any failure restores a usable form`
    - _Requirements: 4.6_

  - [x] 4.4 Write integration tests for the handler (SpaceTraders_API / generated client mocked)
    - Assert the handler configures the generated client with the bearer token and calls the agent endpoint (2.1, 6.4)
    - Assert success within the deadline returns Agent_Details with HTTP 200 (2.2)
    - Assert a 10s deadline exceedance returns HTTP 504 with no Agent_Details (2.5)
    - _Requirements: 2.1, 2.2, 2.5, 6.4_

  - [x] 4.5 Write smoke test for backend statelessness
    - Process a login with spied logger and storage layers; assert no writes of the token or agent data occur
    - _Requirements: 5.1, 5.2_

- [x] 5. Checkpoint - backend complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 6. Frontend pure logic
  - [x] 6.1 Implement `submitEnabled`
    - `submitEnabled(raw)` → `trim(raw).length >= 1 && raw.length <= 4096`
    - _Requirements: 1.2, 1.3, 1.6_

  - [x] 6.2 Write property test for the submit-enable predicate
    - **Property 1: For any input string `s`, the submit control is enabled iff `s` contains at least one non-whitespace character and the total length of `s` is at most 4096.**
    - **Validates: Requirements 1.2, 1.3, 1.6**
    - Use fast-check, minimum 100 iterations, with whitespace-only, empty, and around-4096 lengths
    - Tag: `Feature: agent-login, Property 1: Submit-enable predicate`
    - _Requirements: 1.2, 1.3, 1.6_

  - [x] 6.3 Implement `formatCredits`
    - Produce a base-10 integer string with no fractional separator across −999,999,999,999..999,999,999,999
    - _Requirements: 3.2_

  - [x] 6.4 Write property test for credits formatting round-trip
    - **Property 3: For any integer `n` in −999,999,999,999..999,999,999,999, `formatCredits(n)` produces a base-10 string with no fractional separator, and parsing it back yields exactly `n`.**
    - **Validates: Requirements 3.2**
    - Use fast-check, minimum 100 iterations, across the full range plus boundaries
    - Tag: `Feature: agent-login, Property 3: Credits formatting round-trip`
    - _Requirements: 3.2_

  - [x] 6.5 Implement `fieldOrPlaceholder`
    - Return the value's display string, or the placeholder indicator when the value is null/absent
    - _Requirements: 3.3_

  - [x] 6.6 Write property test for placeholder vs value rendering
    - **Property 5: For any Agent_Details value, each field that is null or absent renders the placeholder indicator and each present field renders its value.**
    - **Validates: Requirements 3.3**
    - Use fast-check, minimum 100 iterations, with Agent_Details having random null subsets
    - Tag: `Feature: agent-login, Property 5: Missing fields render placeholders, present fields render values`
    - _Requirements: 3.3_

  - [x] 6.7 Implement `classifyResponse`
    - Map HTTP 401 → token-invalid, 502/504 → could-not-retrieve, network/client-timeout → service-unavailable, each with its exact user-facing message
    - _Requirements: 4.3, 4.4, 4.5_

- [x] 7. Frontend state and components
  - [x] 7.1 Implement the `useLogin` hook
    - Own all session state in volatile in-memory state only (token, status, agent, error); never touch `localStorage`, `sessionStorage`, cookies, or IndexedDB
    - `submit` trims the token, sends exactly one request, enforces a 10s client timeout via `AbortController`, maps the response/failure via `classifyResponse`, and on any failure clears loading and re-enables submit for non-empty tokens
    - Provide `retry` (re-issues the request) and `logout` (discards token + agent from memory)
    - _Requirements: 1.4, 1.5, 3.4, 4.3, 4.4, 4.5, 4.6, 5.3, 5.4_

  - [x] 7.2 Write property test for exactly-once trimmed submission
    - **Property 2: For any valid token (1..4096 non-whitespace chars, possibly surrounded by whitespace), submitting sends exactly one Login_Request whose body equals the whitespace-trimmed token.**
    - **Validates: Requirements 1.4**
    - Use fast-check, minimum 100 iterations, with a transport spy
    - Tag: `Feature: agent-login, Property 2: Submission sends the trimmed token exactly once`
    - _Requirements: 1.4_

  - [x] 7.3 Write property test for failure restoring a usable form
    - **Property 8: For any failure outcome, after the Login_Request settles the loading indicator is cleared and the submit control is re-enabled for any non-empty token.**
    - **Validates: Requirements 4.6**
    - Use fast-check, minimum 100 iterations, driving the hook with arbitrary failure kinds
    - Tag: `Feature: agent-login, Property 8: Any failure restores a usable form`
    - _Requirements: 4.6_

  - [x] 7.4 Implement the `LoginForm` component
    - Render the single token input and submit control; compute enable state via `submitEnabled`; show the max-length validation message beyond 4096 chars; show the loading indicator and disable submit while in flight; preserve the entered token across failures
    - On submit pass the trimmed token to `useLogin`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.3, 4.4, 4.5_

  - [x] 7.5 Implement the `AgentDetails` component
    - Render the six fields using `formatCredits` for credits and `fieldOrPlaceholder` for each field; render the logout control while details are displayed
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 7.6 Implement the `ErrorBanner` component
    - Display the current error message (token invalid / could not be retrieved / service unavailable) and a retry control for the client-side timeout case
    - _Requirements: 3.4, 4.3, 4.4, 4.5_

  - [x] 7.7 Wire the components and hook into the app shell
    - Mount `LoginForm`, `AgentDetails`, and `ErrorBanner` driven by `useLogin` state so the app shows the form with no active session, agent details on success, and errors on failure; a reload shows an empty form with no repopulated token or agent data
    - _Requirements: 1.1, 3.1, 3.5, 5.5_

  - [x] 7.8 Write example/unit tests for frontend UI behavior
    - Login form renders a single token input and submit control with no active session (1.1)
    - Loading indicator shown and submit disabled while a request is pending (1.5)
    - Client timeout at 10s surfaces the could-not-retrieve message plus a retry control (3.4)
    - Each `LoginError` kind maps to its exact message string and preserves the entered token (4.3, 4.4, 4.5)
    - _Requirements: 1.1, 1.5, 3.4, 4.3, 4.4, 4.5_

  - [x] 7.9 Write smoke test for frontend statelessness
    - Spy on `localStorage`, `sessionStorage`, `document.cookie`, and `IndexedDB`; assert none are called during login, display, and logout
    - _Requirements: 5.3_

- [x] 8. Checkpoint - full stack wired
  - Ensure all unit, property, integration, and smoke tests pass, ask the user if questions arise.

- [x] 9. End-to-end tests (Playwright, SpaceTraders_API mocked at the network boundary)
  - [x] 9.1 Write e2e test for successful login
    - A valid token renders agent details with all six fields and a logout control
    - _Requirements: 1.1, 1.5, 3.1, 3.5_

  - [x] 9.2 Write e2e test for logout and reload clearing state
    - Activating logout returns to an empty login form; a fresh page load also shows an empty form with no agent data
    - _Requirements: 5.4, 5.5_

  - [x] 9.3 Write e2e test for invalid token (401)
    - An upstream 401 yields the "token invalid" message with the entered token preserved
    - _Requirements: 4.3_

  - [x] 9.4 Write e2e tests for upstream/timeout failures (502/504)
    - Backend 502 and 504 responses yield the "could not be retrieved" message with the token preserved
    - _Requirements: 4.4_

  - [x] 9.5 Write e2e test for backend unreachable
    - When the backend cannot be reached, the client shows the "service unavailable" message with the token preserved
    - _Requirements: 4.5_

- [x] 10. Final checkpoint - all tests pass
  - Ensure all unit, property, integration, smoke, and end-to-end tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (test-related) and can be skipped for a faster MVP.
- Each task references the specific requirement sub-clauses it implements for traceability.
- Property-based tests use `fast-check` (frontend) and `Hypothesis` (backend) with a minimum of 100 iterations, one test per correctness property, each tagged `Feature: agent-login, Property {number}: {property_text}`.
- Checkpoints provide incremental validation at the end of the backend, the wired full stack, and the complete suite.
- The generated API client is a read-only build artifact produced only through the pinned `make generate-client` target.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.3", "6.1", "6.3", "6.5", "6.7"] },
    {
      "id": 2,
      "tasks": [
        "2.2",
        "2.3",
        "3.2",
        "3.4",
        "3.5",
        "4.1",
        "6.2",
        "6.4",
        "6.6",
        "7.1"
      ]
    },
    { "id": 3, "tasks": ["4.2", "7.2", "7.3", "7.4", "7.5", "7.6"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5", "7.7", "7.8", "7.9"] },
    { "id": 5, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5"] }
  ]
}
```
