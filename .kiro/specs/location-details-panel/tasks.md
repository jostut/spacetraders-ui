# Implementation Plan: Location Details Panel

## Overview

The backend is built first (models, mapper, adapter, routes), followed by the frontend (pure derivation logic, `useLocation` hook, components, and layout wiring). Backend code is Python (FastAPI, `pytest`, `hypothesis`). Frontend code is TypeScript (React, `vitest`, `fast-check`, React Testing Library). Each step builds on the previous one and ends with wiring.

## Tasks

- [x] 1. Backend models and waypoint mapping
  - [x] 1.1 Extend backend models
    - In `backend/app/models.py`, add `WaypointSummary` and `WaypointDetail` models matching the design's response shapes
    - Extend `ErrorKind` with `"not_found"`
    - _Requirements: 7.3, 7.4, 8.2, 8.3, 9.1, 9.2_

  - [x] 1.2 Implement the pure waypoint mapper
    - Create `backend/app/map_waypoint.py` with `map_waypoint_summary` and `map_waypoint_detail`
    - Absent `orbits` and `faction` map to `None`; absent `orbitals`, `traits` and `modifiers` map to empty lists; `chart` is not forwarded
    - _Requirements: 9.1, 9.2_

  - [ ]\* 1.3 Write property test for summary mapping
    - Create `backend/tests/test_map_waypoint_property.py`
    - **Property 1: Summary mapping preserves fields and is idempotent**
    - **Validates: Requirements 9.1, 9.5**

  - [ ]\* 1.4 Write property test for detail mapping
    - Add to `backend/tests/test_map_waypoint_property.py`
    - **Property 2: Detail mapping preserves fields and nulls absent optionals**
    - **Validates: Requirements 8.2, 9.2, 9.5**

- [x] 2. Backend SpaceTraders waypoint adapter
  - [x] 2.1 Implement the waypoint adapter
    - Create `backend/app/spacetraders_waypoint_adapter.py` with `REQUEST_TIMEOUT_SECONDS = 5.0`, `PAGE_SIZE = 20`, `WaypointFailure`, `fetch_system_waypoints` and `fetch_waypoint`
    - Use `Configuration()` with no `access_token`, reuse `_import_generated` and `_close`, close the client in `finally`
    - Paginate from `meta.total`, pass `_request_timeout=5.0` per call, return dicts via `to_dict()`, and map 404, timeout and other failures to `not_found`, `timeout` and `upstream`
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6, 8.1, 8.3, 8.4, 8.5, 10.1_

  - [ ]\* 2.2 Write property test for pagination
    - Create `backend/tests/test_waypoint_pagination_property.py` with a stubbed `SystemsApi`
    - **Property 3: Pagination combines all pages in order**
    - **Validates: Requirements 7.2, 7.3**

  - [x] 2.3 Write unit tests for the adapter
    - Assert the configuration has no `access_token`, a missing generated client returns `upstream`, and a failure on any page fails the whole request
    - _Requirements: 7.1, 7.5, 8.1, 8.4_

- [x] 3. Backend routes
  - [x] 3.1 Implement the location handler and register it
    - Create `backend/app/location_handler.py` with `GET /api/systems/{systemSymbol}/waypoints` and `GET /api/systems/{systemSymbol}/waypoints/{waypointSymbol}`
    - Validate path parameters with `Path(pattern=...)`, map failures to 404, 504 and 502 with the `ErrorEnvelope` and fixed messages, and add no logging or storage
    - Register the router in `backend/app/main.py`
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 10.2_

  - [ ]\* 3.2 Write property test for error mapping
    - Create `backend/tests/test_location_error_mapping_property.py`
    - **Property 4: Upstream failures map to the correct status and envelope**
    - **Validates: Requirements 7.4, 7.5, 7.6, 8.3, 8.4, 8.5**

  - [ ]\* 3.3 Write property test for path validation
    - Create `backend/tests/test_location_path_validation_property.py` using `TestClient` and an adapter mock
    - **Property 5: Invalid path parameters are rejected without an upstream call**
    - **Validates: Requirements 7.7, 8.6**

  - [x] 3.4 Write unit tests for the routes
    - Cover 200 responses with a stubbed adapter and body shapes for both routes
    - Extend `backend/tests/test_statelessness_smoke.py` so the new modules are checked for logging or persistence of request data
    - _Requirements: 7.3, 8.2, 10.2_

- [x] 4. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Frontend system symbol derivation
  - [x] 5.1 Implement derivation logic and shared types
    - Create `frontend/src/logic/deriveSystemSymbol.ts` with `deriveSystemSymbol` and `joinWaypointSymbol`
    - Return the first two segments only for exactly three non-empty dash-separated segments, otherwise `null`
    - Add frontend `WaypointSummary`, `WaypointDetail` and `AsyncState` types
    - _Requirements: 3.2, 3.7, 9.3_

  - [ ]\* 5.2 Write property test for the round trip
    - Create `frontend/src/logic/deriveSystemSymbol.property.test.ts`
    - **Property 6: System symbol derivation round trip**
    - **Validates: Requirements 9.3, 9.4**

  - [ ]\* 5.3 Write property test for unparseable input
    - Add to `frontend/src/logic/deriveSystemSymbol.property.test.ts`
    - **Property 7: Unparseable headquarters yield no system**
    - **Validates: Requirements 3.7**

- [x] 6. Frontend `useLocation` hook
  - [x] 6.1 Implement the hook
    - Create `frontend/src/hooks/useLocation.ts` holding `systemSymbol`, `selected`, `list`, `detail`, `select` and `retry`
    - Fetch the list once on mount and keep it in state so returning to the list does not refetch
    - Number each detail request and abort the previous one so stale responses are discarded
    - Send requests with `fetch(url)` and no `Authorization` header; use React state only; make no request when the system cannot be derived
    - _Requirements: 3.2, 3.7, 4.1, 4.5, 5.2, 5.3, 6.2, 6.3, 6.4, 10.1, 10.3_

  - [ ]\* 6.2 Write property test for stale responses
    - Create `frontend/src/hooks/useLocation.property.test.ts` with a mocked `fetch` using controllable promises
    - **Property 10: Only the latest selection's response is displayed**
    - **Validates: Requirements 4.5**

  - [ ]\* 6.3 Write property test for list caching
    - Add to `frontend/src/hooks/useLocation.property.test.ts`
    - **Property 11: Returning to the list does not refetch**
    - **Validates: Requirements 5.3**

  - [x] 6.4 Write unit tests for the hook
    - Cover retry repeating the failed request, 404 detail flagged as `notFound`, no `Authorization` header, and no `localStorage` or `sessionStorage` use
    - _Requirements: 6.2, 6.3, 6.4, 10.1, 10.3_

- [x] 7. Frontend components
  - [x] 7.1 Implement `LocationPanel`
    - Create `frontend/src/components/LocationPanel.tsx` rendering the list (system heading, symbol, type, x and y per row, "No locations found"), the details (all fields, omitting orbital parent and faction when absent), loading labels, error state with "Retry", "Location not found" with "Back to locations", and the system-undetermined error
    - Add a visually hidden `role="status"` `aria-live="polite"` region for loading and error text
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 4.2, 4.3, 4.4, 5.1, 5.2, 6.1, 6.2, 6.4, 6.5_

  - [ ]\* 7.2 Write property test for list rendering
    - Create `frontend/src/components/LocationPanel.property.test.tsx`
    - **Property 8: List rows show every summary field**
    - **Validates: Requirements 3.3**

  - [ ]\* 7.3 Write property test for detail rendering
    - Add to `frontend/src/components/LocationPanel.property.test.tsx`
    - **Property 9: Details render all present fields and omit absent ones**
    - **Validates: Requirements 4.2, 4.3, 4.4**

  - [x] 7.4 Write unit tests for `LocationPanel`
    - Cover list click selecting, "No locations found", loading labels, Retry, 404 message with back control, "Back to locations", and the live region
    - _Requirements: 3.4, 3.6, 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.5 Make the headquarters a button in `AgentDetails`
    - In `frontend/src/components/AgentDetails.tsx`, render `<button type="button">` calling `onSelectHeadquarters` for a non-null headquarters, otherwise keep the existing placeholder
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 7.6 Write unit tests for `AgentDetails`
    - Cover button rendering, click callback, keyboard activation, and the placeholder when headquarters is null
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 7.7 Sort the Location_List alphabetically
    - Create `frontend/src/logic/sortWaypoints.ts` with a pure `sortWaypointsBySymbol` that returns a new array in ascending natural order by `symbol`
    - In `LocationPanel`, render the sorted list; do not change the hook's cached list or the backend order
    - _Requirements: 3.8_

  - [ ]\* 7.8 Write property test for list ordering
    - Create `frontend/src/logic/sortWaypoints.property.test.ts`
    - **Property 12: List is sorted by symbol without losing rows**
    - **Validates: Requirements 3.8**

  - [x] 7.9 Write unit tests for list ordering
    - Cover an unsorted list rendering in alphabetical order in `LocationPanel`, numeric-aware ordering (for example `A2` before `A10`), and the input array not being mutated
    - _Requirements: 3.8_

  - [x] 7.10 Replace "Back to locations" with a breadcrumb
    - In `LocationPanel`, render a `<nav aria-label="Breadcrumb">` with an `<ol>`: the system symbol, then the selected waypoint symbol when set
    - In the list view the system crumb is plain text with `aria-current="page"` and replaces the heading; otherwise it is a button calling `select(null)`, and the last crumb has `aria-current="page"`
    - Remove the "Back to locations" buttons, including in the 404 state; add breadcrumb CSS with a CSS-generated separator
    - _Requirements: 3.5, 5.1, 5.2, 6.4_

  - [x] 7.11 Update tests for the breadcrumb
    - Update `LocationPanel.test.tsx`, `App.location.test.tsx` and `frontend/tests/e2e/location-details.spec.ts` to use the breadcrumb system link instead of "Back to locations" and the heading
    - Cover the list-view current crumb, detail-view link plus current waypoint, link activation calling `select(null)`, and the 404 state
    - _Requirements: 3.5, 5.1, 5.2, 6.4_

- [x] 8. Layout and wiring
  - [x] 8.1 Wire the panel into `App` and add layout CSS
    - In `frontend/src/App.tsx`, render a two-column container with `AgentDetails` and `LocationPanel` only while details are displayed
    - Mount the `useLocation` hook in a child component that unmounts on logout so state clears; connect the headquarters button to `select`
    - Add a flex row container with wrapping and a `@media (max-width: 699px)` rule that stacks the panel below the agent details
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 3.2_

  - [x] 8.2 Write unit and CSS smoke tests for the wiring
    - Cover the panel hidden before login, cleared on logout, and the stylesheet containing the `max-width` stacking rule (following `ConnectionStatus.css.test.ts`)
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 8.3 Write a Playwright end-to-end test
    - In `frontend/tests/e2e`, log in, open the headquarters, and return to the list, with the upstream stubbed as in existing e2e specs
    - _Requirements: 1.2, 3.1, 4.1, 5.2, 5.3_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["1.4", "3.2", "3.3", "3.4"] },
    { "id": 4, "tasks": ["4"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2", "6.1", "7.5"] },
    { "id": 7, "tasks": ["5.3", "6.2", "7.1", "7.6"] },
    { "id": 8, "tasks": ["6.3", "6.4", "7.2", "7.4", "7.7", "8.1"] },
    { "id": 9, "tasks": ["7.3", "7.8", "7.9", "7.10", "8.2", "8.3"] },
    { "id": 10, "tasks": ["7.11"] },
    { "id": 11, "tasks": ["9"] }
  ]
}
```
