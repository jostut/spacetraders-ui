# Implementation Plan: Login Connection Status

## Overview

Add a backend `/health/spacetraders` endpoint (Python/FastAPI, via a new adapter over the generated SpaceTraders client), then add a frontend `useHealthCheck` hook and `ConnectionStatus` component (TypeScript/React) and wire two indicators into `App.tsx`. The Vite dev proxy gains a `/health` entry.

## Tasks

- [x] 1. Implement backend SpaceTraders health endpoint
  - [x] 1.1 Create `backend/app/spacetraders_status_adapter.py`
    - Add `StatusOutcome` frozen dataclass with `ok: bool`
    - Implement `fetch_status()` using lazy import of the generated client, a `Configuration` with no `access_token`, and `GlobalApi.get_status(_request_timeout=5.0)`
    - Normalize every exception or missing generated client to `StatusOutcome(ok=False)`
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [x] 1.2 Create `backend/app/health_handler.py` and register it in `create_app()` in `main.py`
    - Add `GET /health/spacetraders` returning 200 `{"status": "ok"}` on success, 503 `{"status": "error"}` otherwise
    - Include the router alongside the existing login router
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]\* 1.3 Write property test for health endpoint outcome mapping
    - **Property 1: SpaceTraders health endpoint maps adapter outcome to response**
    - **Validates: Requirements 1.2, 1.3, 1.4**

  - [x] 1.4 Write unit tests for the endpoint and adapter
    - Route calls the adapter exactly once per request
    - Adapter builds the configuration without `access_token` and calls `get_status`
    - _Requirements: 1.1, 1.5_

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement frontend health check hook and indicator
  - [x] 3.1 Create `src/hooks/useHealthCheck.ts`
    - Export `HealthState` type and `useHealthCheck(url)` with `fetch`, `AbortController`, 5000 ms timeout, and cleanup
    - Set `connected` on `response.ok`, `unavailable` on non-2xx, rejection, or abort
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2_

  - [ ]\* 3.2 Write property test for hook state mapping
    - **Property 2: Status indicator state reflects health check outcome**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 3.3, 3.4, 3.5, 3.6**

  - [x] 3.3 Create `src/components/ConnectionStatus.tsx`
    - Render a `role="status"` element with `aria-label` of `"{label}: {state}"`, a coloured dot (grey/green/red; the grey checking dot is replaced by a spinner in task 6), and the visible label text
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]\* 3.4 Write property test for indicator color
    - **Property 3: Indicator color follows state**
    - **Validates: Requirements 4.1**

  - [ ]\* 3.5 Write property test for indicator label and accessible name
    - **Property 4: Indicator rendering reflects service name and state**
    - **Validates: Requirements 4.2, 4.3**

- [x] 4. Wire indicators into the login page
  - [x] 4.1 Modify `App.tsx` and `vite.config.ts`
    - Call `useHealthCheck("/health")` and `useHealthCheck("/health/spacetraders")` and render two `ConnectionStatus` components ("Backend API", "SpaceTraders v2 API") above the login form/agent details
    - Add a `/health` entry to the Vite dev server proxy map
    - _Requirements: 2.1, 3.1, 5.3_

  - [ ]\* 4.2 Write property test for no further requests after checks settle
    - **Property 5: No further requests or state changes after both checks settle**
    - **Validates: Requirements 5.1, 5.2**

  - [ ]\* 4.3 Write property test for concurrent initiation
    - **Property 6: Health checks are initiated concurrently**
    - **Validates: Requirements 5.3**

  - [x] 4.4 Write unit tests for App indicators
    - Both labelled indicators render on mount
    - Exactly one fetch to `/health` and one to `/health/spacetraders` on mount
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 5.1_

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Replace grey checking dot with a spinner in ConnectionStatus.tsx
  - [x] 6.1 Update `src/components/ConnectionStatus.tsx` and its stylesheet
    - Render a `<span className="status-spinner" aria-hidden="true" />` when `state === "checking"`; keep green (`connected`) and red (`unavailable`) dots, also `aria-hidden`
    - Remove the grey `checking` entry from the color map
    - Keep `role="status"` and `aria-label` of `"{label}: {state}"` so the accessible name stays `"{label}: checking"`
    - Add `.status-spinner` CSS (rotating ring, `@keyframes`) and a `@media (prefers-reduced-motion: reduce)` rule that disables the animation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]\* 6.2 Update property test for indicator visual
    - **Property 3: Indicator visual follows state**
    - Update the existing Property 3 test to assert spinner for `checking`, green/red dot otherwise, and `aria-hidden` on each
    - **Validates: Requirements 4.1, 4.4**

  - [x] 6.3 Write unit test for reduced-motion rule
    - Assert the stylesheet disables the `.status-spinner` animation under `prefers-reduced-motion: reduce`
    - _Requirements: 4.5_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Hide indicators after login in App.tsx
  - [x] 8.1 Modify `src/App.tsx` to render the indicators only on the login form view
    - Keep both `useHealthCheck` calls at the top of `App` (they still run once on mount)
    - Move the two `ConnectionStatus` elements into the login-form branch so they are not rendered when agent details are displayed
    - _Requirements: 5.4, 5.5_

  - [ ]\* 8.2 Write property test for indicator visibility
    - **Property 7: Indicators are visible only on the login form**
    - **Validates: Requirements 5.4, 5.5**

  - [x] 8.3 Write unit test for post-login hiding
    - After a mocked successful login, neither indicator is in the document and no further health request is sent
    - _Requirements: 5.2, 5.4_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Backend tests use pytest/Hypothesis; frontend tests use vitest/fast-check
- Property tests validate universal correctness properties; unit tests cover specific examples

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1", "3.3"] },
    { "id": 1, "tasks": ["1.2", "3.2", "3.4", "3.5"] },
    { "id": 2, "tasks": ["1.3", "1.4", "4.1"] },
    { "id": 3, "tasks": ["2", "4.2", "4.3", "4.4"] },
    { "id": 4, "tasks": ["5"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3"] },
    { "id": 7, "tasks": ["7"] },
    { "id": 8, "tasks": ["8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3"] },
    { "id": 10, "tasks": ["9"] }
  ]
}
```
