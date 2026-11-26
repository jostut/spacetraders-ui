# Design Document

## Overview

The login page gains two read-only connection-status indicators, rendered above the existing login form: "Backend API" and "SpaceTraders v2 API". On mount, the page fires two independent, concurrent `GET` requests — one to the existing `/health` endpoint and one to a new `/health/spacetraders` endpoint — and renders each indicator's state (`checking` → `connected` or `unavailable`) based on that single request's outcome. Neither request repeats after the initial page load.

On the backend, `/health/spacetraders` is a new FastAPI route that calls the SpaceTraders status operation through the generated client, following the same lazy-import, per-request, normalized-outcome pattern already used by `generated_client_adapter.fetch_agent` for `/api/login`. It never requires or forwards an agent token.

## Architecture

```
Frontend (React)                          Backend (FastAPI)
┌─────────────────────────┐                ┌───────────────────────────┐
│ App.tsx                 │                │ main.py                   │
│  └─ ConnectionStatus     │   GET /health  │  GET /health  (existing)  │
│      (Backend API)      │ ─────────────▶ │                           │
│  └─ ConnectionStatus     │                │                           │
│      (SpaceTraders v2)  │   GET /health/  │  GET /health/spacetraders │
│                          │     spacetraders│  (new, health_handler.py)│
│  useHealthCheck(url) x2  │ ─────────────▶ │     │                     │
└─────────────────────────┘                │     ▼                     │
                                            │  spacetraders_status_     │
                                            │  adapter.fetch_status()   │
                                            │     │                     │
                                            │     ▼ (lazy import)       │
                                            │  generated spacetraders_  │
                                            │  client GlobalApi         │
                                            │  .get_status()            │
                                            └───────────────────────────┘
```

Each side reuses an existing pattern rather than introducing a new one:

- Backend: a new adapter function mirrors `generated_client_adapter.fetch_agent`'s shape (lazy import, normalized outcome, no persisted state) but calls `GlobalApi.get_status()` instead of the agent operation, and needs no token.
- Frontend: a new `useHealthCheck` hook mirrors `useLogin`'s `fetch` + `AbortController` + timeout pattern, but is read-only, parameterless after the URL, and runs exactly once per mount with no retry/submit action.

## Components and Interfaces

### Backend

#### `app/spacetraders_status_adapter.py` (new)

```python
def fetch_status() -> StatusOutcome:
    """Call GET /status on the SpaceTraders API with no auth and a 5s deadline.

    Mirrors generated_client_adapter.fetch_agent's lazy-import and
    normalization pattern, but:
    - builds the generated Configuration with no access_token,
    - invokes GlobalApi.get_status(_request_timeout=5.0),
    - never returns the response body (the health route only needs
      success/failure), so the normalized outcome is a simple boolean-like
      result rather than a payload dict.
    """
```

`StatusOutcome` is a small result type (e.g. a `Literal["ok", "error"]` or a tiny dataclass) distinguishing success from every failure mode (non-2xx, network error, timeout, generated client unavailable) — the route does not need to distinguish failure causes, since Requirement 1.3/1.4 map all of them to the same 503 response.

```python
@dataclass(frozen=True)
class StatusOutcome:
    ok: bool
```

Reuses `REQUEST_TIMEOUT_SECONDS`-style constant, set to `5.0` per Requirement 1.4, and the same `_import_generated` / `GeneratedClientUnavailable` lazy-import approach as `generated_client_adapter.py` (a missing generated client is just another failure, i.e. `StatusOutcome(ok=False)`).

#### `app/health_handler.py` (new) or extend `main.py`

```python
router = APIRouter()

@router.get("/health/spacetraders")
async def spacetraders_health() -> JSONResponse:
    outcome = fetch_status()
    if outcome.ok:
        return JSONResponse(status_code=200, content={"status": "ok"})
    return JSONResponse(status_code=503, content={"status": "error"})
```

Wired into `create_app()` in `main.py` alongside `login_router`, next to the existing inline `/health` route. Given the existing `/health` route is defined inline in `main.py` and `/api/login` lives in its own router module, the new endpoint follows the router-module convention (`health_handler.router`) since it has adapter logic worth isolating and testing independently, matching how `login_handler.py` isolates `/api/login`.

### Frontend

#### `src/hooks/useHealthCheck.ts` (new)

```typescript
export type HealthState = "checking" | "connected" | "unavailable";

export function useHealthCheck(url: string): HealthState {
  const [state, setState] = useState<HealthState>("checking");

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    fetch(url, { signal: controller.signal })
      .then((response) => {
        setState(response.ok ? "connected" : "unavailable");
      })
      .catch(() => {
        setState("unavailable");
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [url]);

  return state;
}
```

- Runs its effect once per mount (empty-equivalent dependency on a stable `url`), satisfying "exactly once per page load" (Requirement 5.1/5.2) — React Strict Mode double-invocation in development is mitigated by the `AbortController` cleanup aborting the first in-flight request before the second starts, so at most one request's result is ever applied to state.
- `CLIENT_TIMEOUT_MS = 5_000`, matching the backend's 5-second deadline (Requirement 2.6/3.6), reusing the same `AbortController` + `setTimeout` idiom as `useLogin.ts`.
- Two independent call sites (one per indicator) each mount their own `useHealthCheck`, so the two `fetch` calls are issued independently in the same render pass — satisfying concurrency (Requirement 5.3) without explicit `Promise.all` coordination.

#### `src/components/ConnectionStatus.tsx` (new)

```typescript
interface ConnectionStatusProps {
  label: string;
  state: HealthState;
}

const DOT_COLOR: Record<Exclude<HealthState, "checking">, string> = {
  connected: "green",
  unavailable: "red",
};

export function ConnectionStatus({ label, state }: ConnectionStatusProps) {
  return (
    <div role="status" aria-label={`${label}: ${state}`}>
      {state === "checking" ? (
        <span className="status-spinner" aria-hidden="true" />
      ) : (
        <span
          className={`status-dot status-dot--${state}`}
          style={{ backgroundColor: DOT_COLOR[state] }}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </div>
  );
}
```

```css
.status-spinner {
  display: inline-block;
  width: 0.75em;
  height: 0.75em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: status-spin 0.8s linear infinite;
}

@keyframes status-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-spinner {
    animation: none;
  }
}
```

- Visible text is the `label` (Requirement 4.3); the accessible name combines `label` and `state` (Requirement 4.2); the visual is a pure function of `state`: a spinner for `checking`, a green dot for `connected`, a red dot for `unavailable` (Requirement 4.1).
- The spinner and dots are `aria-hidden`, so assistive technology announces only the `"{label}: checking"` name (Requirement 4.4).
- Under `prefers-reduced-motion: reduce` the spinner stays visible as a static ring with no rotation (Requirement 4.5).

#### `App.tsx` (modified)

Renders two `ConnectionStatus` instances above the existing conditional login-form/agent-details block:

```typescript
const backendHealth = useHealthCheck("/health");
const spacetradersHealth = useHealthCheck("/health/spacetraders");
// ...
<ConnectionStatus label="Backend API" state={backendHealth} />
<ConnectionStatus label="SpaceTraders v2 API" state={spacetradersHealth} />
```

**Visibility after login (Requirements 5.4, 5.5):** the two `useHealthCheck` calls stay at the top of `App` and still run once on mount. This is the simplest option, because it needs no hook relocation and keeps the single-request-per-page-load guarantee. Only the rendering of the two `ConnectionStatus` elements changes: they render inside the same branch as the login form and are not rendered when the agent details are displayed.

```typescript
{agent ? (
  <AgentDetails agent={agent} />
) : (
  <>
    <ConnectionStatus label="Backend API" state={backendHealth} />
    <ConnectionStatus label="SpaceTraders v2 API" state={spacetradersHealth} />
    <LoginForm /* ... */ />
  </>
)}
```

(The exact condition and component names follow the existing conditional in `App.tsx`.) Because the hook state lives in `App`, an indicator that reappears without a page reload shows its last settled state and triggers no new request.

`/health/spacetraders` is proxied to the backend the same way `/api/*` already is in `vite.config.ts`'s dev server `proxy` map; that map gains a `/health` entry (today only `/api` is proxied).

## Data Models

No persisted or domain data models are introduced. The only new shapes are:

- Backend: `StatusOutcome { ok: bool }` — adapter-internal, never serialized directly; the route maps it to `{"status": "ok" | "error"}`.
- Frontend: `HealthState = "checking" | "connected" | "unavailable"` — component/hook-internal, held in React state, never persisted (consistent with Requirement 5.5 in the related agent-login feature: nothing survives a reload).

## Error Handling

- **Backend, SpaceTraders call fails (network, non-2xx, generated client missing):** `fetch_status` normalizes every case to `StatusOutcome(ok=False)`; the route returns `503 {"status": "error"}` uniformly — the caller does not need upstream error detail (Requirement 1.3).
- **Backend, SpaceTraders call exceeds 5s:** the per-call `_request_timeout=5.0` passed to `GlobalApi.get_status` raises the same family of transport exceptions `generated_client_adapter._looks_like_timeout` already classifies; `fetch_status` treats any exception as `ok=False` (Requirement 1.4). No separate timeout branch is needed since the route does not distinguish failure causes.
- **Frontend, request rejects or is aborted:** `useHealthCheck`'s `.catch` sets `"unavailable"` regardless of cause (network error vs. client-side 5s abort), satisfying Requirement 2.6/3.6 without separate handling paths.
- **Frontend, response resolves with a non-2xx status:** `response.ok` is `false` for any status outside 200–299, so `useHealthCheck` sets `"unavailable"` uniformly (Requirement 2.5/3.5) without inspecting the specific code.
- **Component unmounts mid-request:** the effect cleanup aborts the in-flight `fetch` and clears the timeout, preventing a state update on an unmounted component.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: SpaceTraders health endpoint maps adapter outcome to response

For any outcome returned by the SpaceTraders status adapter (success, failure due to non-2xx/network error, or failure due to timeout), the `/health/spacetraders` route SHALL return HTTP 200 with `{"status": "ok"}` when the outcome is success, and HTTP 503 with a body whose `status` field is `"error"` for every other outcome.

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 2: Status indicator state reflects health check outcome

For any health-check endpoint (Backend API's `/health` or SpaceTraders v2 API's `/health/spacetraders`) and any resolution of its request — pending, HTTP 200, any non-2xx HTTP status, network failure, or timeout — the associated `ConnectionStatus` indicator SHALL display `checking` while pending, `connected` only when the response is HTTP 200, and `unavailable` for every non-2xx status, network failure, or timeout.

**Validates: Requirements 2.3, 2.4, 2.5, 2.6, 3.3, 3.4, 3.5, 3.6**

### Property 3: Indicator visual follows state

For any `HealthState` value (`checking`, `connected`, or `unavailable`), the `ConnectionStatus` component SHALL render a spinner (and no dot) for `checking`, a green dot (and no spinner) for `connected`, and a red dot (and no spinner) for `unavailable`, with the spinner and dots marked `aria-hidden`.

**Validates: Requirements 4.1, 4.4**

### Property 4: Indicator rendering reflects service name and state

For any service label and any `HealthState`, the rendered `ConnectionStatus` output SHALL include the label as visible text and SHALL expose an accessible name containing both the label and a human-readable form of the state ("checking", "connected", or "unavailable").

**Validates: Requirements 4.2, 4.3**

### Property 5: No further requests or state changes after both checks settle

For any sequence of re-renders or state updates occurring after both the Backend API and SpaceTraders v2 API health checks have settled (each resolved or rejected exactly once), the number of requests sent to each endpoint SHALL remain exactly one and each indicator's displayed state SHALL remain unchanged.

**Validates: Requirements 5.1, 5.2**

### Property 6: Health checks are initiated concurrently

For any pair of response delays assigned independently to the `/health` and `/health/spacetraders` requests, the Login_Page SHALL initiate both requests before either one resolves, such that the initiation of one never waits on the completion of the other.

**Validates: Requirements 5.3**

### Property 7: Indicators are visible only on the login form

For any application view state (login form displayed or Agent_Details_View displayed), `App` SHALL render both "Backend API" and "SpaceTraders v2 API" indicators if and only if the login form is displayed.

**Validates: Requirements 5.4, 5.5**

## Testing Strategy

**Unit / example tests** (backend: `pytest`; frontend: `vitest`):

- Backend: `/health/spacetraders` calls the adapter exactly once per request (Requirement 1.1); the adapter builds its `Configuration`/calls `GlobalApi.get_status` without setting `access_token` (Requirement 1.5).
- Frontend: on mount, `App` renders a "Backend API" indicator and a "SpaceTraders v2 API" indicator (Requirements 2.1, 3.1); exactly one `fetch` is issued to `/health` and one to `/health/spacetraders` on mount (Requirements 2.2, 3.2, 5.1).

**Property-based tests** (backend: Hypothesis, consistent with existing `.hypothesis` cache in `backend/`; frontend: `fast-check`, already a dev dependency):

- Property 1 — generate the three normalized adapter outcomes; assert route status/body (backend, Hypothesis or parametrized, ≥100 cases is not meaningful over a 3-element domain, so this may run as an exhaustive parametrized test rather than a randomized one; still annotated as the design property it validates).
- Property 2 — generate random sequences of mocked fetch resolutions (status code, network-error, timeout-via-abort) per hook instance; assert resulting `HealthState` (frontend, fast-check, ≥100 iterations).
- Property 3 — generate random `HealthState` values; assert a spinner is rendered only for `checking`, a green or red dot only for `connected` or `unavailable`, and that the spinner and dots are `aria-hidden` (frontend, fast-check, exhaustive over 3 values, run with full enumeration).
- Reduced motion (Requirement 4.5) is a CSS-only behavior; jsdom does not evaluate media queries, so verify with an example test that the stylesheet contains a `prefers-reduced-motion: reduce` rule disabling the `.status-spinner` animation.
- Property 4 — generate random label strings and `HealthState` values; assert rendered visible text and accessible name both contain the expected substrings (frontend, fast-check, ≥100 iterations over random label strings).
- Property 5 — generate random counts/sequences of parent re-renders after both checks settle; assert fetch mock call counts stay at one each and displayed states are unchanged (frontend, fast-check, ≥100 iterations).
- Property 6 — generate random relative delay pairs for the two mocked fetches; assert both are initiated (mock called) before either resolves (frontend, fast-check, ≥100 iterations).

- Property 7 — enumerate the two view states (login form, agent details) with a mocked successful login; assert both indicators are present only in the login form view (frontend, fast-check, exhaustive over 2 values). An example test also asserts that after a successful login no indicator is in the document and no additional health request is sent.

Each property test is tagged **Feature: login-connection-status, Property {number}: {property text}** per the design property it covers.
