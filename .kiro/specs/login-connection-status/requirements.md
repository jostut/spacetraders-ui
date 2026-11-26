# Requirements Document

## Introduction

The login page shows two connection status indicators: one for the Backend API and one for the SpaceTraders v2 API. The browser communicates only with the Backend API. The Backend API exposes a new endpoint, `/health/spacetraders`, which checks the SpaceTraders v2 API through the existing SpaceTraders adapter. The Backend API indicator uses the existing `/health` endpoint. Both checks run once when the login page loads.

## Glossary

- **Login_Page**: The frontend page on which a user enters agent credentials to log in.
- **Status_Indicator**: A visual element on the Login_Page showing the connection state of one service.
- **Agent_Details_View**: The view that replaces the login form and shows the agent's details after a successful login.
- **Backend_API**: The FastAPI backend application serving the Login_Page's requests.
- **SpaceTraders_API**: The external SpaceTraders v2 HTTP API.
- **SpaceTraders_Adapter**: The existing backend component that calls the SpaceTraders_API.
- **Health_Endpoint**: The existing Backend_API route `GET /health`, which returns HTTP 200 with `{"status": "ok"}`.
- **SpaceTraders_Health_Endpoint**: The new Backend_API route `GET /health/spacetraders`.
- **Checking_State**: Indicator state shown as a spinner while a status check is in progress.
- **Spinner**: A rotating circular graphic that signals an operation in progress.
- **Reduced_Motion_Preference**: The user's operating system or browser setting `prefers-reduced-motion: reduce`.
- **Connected_State**: Indicator state shown as green when a status check succeeded.
- **Failed_State**: Indicator state shown as red when a status check failed or the result is unknown.

## Requirements

### Requirement 1: SpaceTraders health endpoint

**User Story:** As a user, I want the backend to report whether the SpaceTraders v2 API is reachable, so that the login page can display its status without the browser contacting SpaceTraders directly.

#### Acceptance Criteria

1. WHEN a GET request is received at the SpaceTraders_Health_Endpoint, THE Backend_API SHALL call the SpaceTraders_API through the SpaceTraders_Adapter.
2. WHEN the SpaceTraders_API call succeeds, THE SpaceTraders_Health_Endpoint SHALL return HTTP status 200 with the JSON body `{"status": "ok"}`.
3. IF the SpaceTraders_API call fails, THEN THE SpaceTraders_Health_Endpoint SHALL return HTTP status 503 with a JSON body containing a `status` field set to `"error"`.
4. IF the SpaceTraders_API call does not complete within 5 seconds, THEN THE SpaceTraders_Health_Endpoint SHALL return HTTP status 503 with a JSON body containing a `status` field set to `"error"`.
5. THE SpaceTraders_Health_Endpoint SHALL perform the SpaceTraders_API call without requiring an agent token.

### Requirement 2: Backend API indicator

**User Story:** As a user, I want to see whether the backend is reachable from the login page, so that I know if login can work.

#### Acceptance Criteria

1. THE Login_Page SHALL display a Status_Indicator labelled "Backend API".
2. WHEN the Login_Page loads, THE Login_Page SHALL send one GET request to the Health_Endpoint.
3. WHILE the Health_Endpoint request is in progress, THE Status_Indicator labelled "Backend API" SHALL display the Checking_State.
4. WHEN the Health_Endpoint returns HTTP status 200, THE Status_Indicator labelled "Backend API" SHALL display the Connected_State.
5. IF the Health_Endpoint returns a non-2xx HTTP status, THEN THE Status_Indicator labelled "Backend API" SHALL display the Failed_State.
6. IF the Health_Endpoint request fails due to a network error or does not complete within 5 seconds, THEN THE Status_Indicator labelled "Backend API" SHALL display the Failed_State.

### Requirement 3: SpaceTraders API indicator

**User Story:** As a user, I want to see whether the SpaceTraders v2 API is reachable from the login page, so that I know if the game service is available.

#### Acceptance Criteria

1. THE Login_Page SHALL display a Status_Indicator labelled "SpaceTraders v2 API".
2. WHEN the Login_Page loads, THE Login_Page SHALL send one GET request to the SpaceTraders_Health_Endpoint.
3. WHILE the SpaceTraders_Health_Endpoint request is in progress, THE Status_Indicator labelled "SpaceTraders v2 API" SHALL display the Checking_State.
4. WHEN the SpaceTraders_Health_Endpoint returns HTTP status 200, THE Status_Indicator labelled "SpaceTraders v2 API" SHALL display the Connected_State.
5. IF the SpaceTraders_Health_Endpoint returns a non-2xx HTTP status, THEN THE Status_Indicator labelled "SpaceTraders v2 API" SHALL display the Failed_State.
6. IF the SpaceTraders_Health_Endpoint request fails due to a network error or does not complete within 5 seconds, THEN THE Status_Indicator labelled "SpaceTraders v2 API" SHALL display the Failed_State.

### Requirement 4: Indicator presentation

**User Story:** As a user, I want the indicators to be unambiguous and accessible, so that I can understand each state without relying on colour alone.

#### Acceptance Criteria

1. THE Status_Indicator SHALL display the Checking_State as a Spinner, the Connected_State as a green dot, and the Failed_State as a red dot.
2. THE Status_Indicator SHALL expose a text label stating the service name and its current state ("checking", "connected", or "unavailable") to assistive technology.
3. THE Status_Indicator SHALL display the service name as visible text adjacent to the Spinner or coloured dot.
4. THE Status_Indicator SHALL hide the Spinner from assistive technology, so that only the text label from criterion 2 is announced for the Checking_State.
5. WHILE the Reduced_Motion_Preference is active, THE Status_Indicator SHALL display the Spinner without rotation animation.

### Requirement 5: Single check per page load and login-view-only visibility

**User Story:** As a user, I want status checks to run only when the page loads and the indicators to appear only on the login form, so that the login page does not generate repeated background traffic and the agent details view stays uncluttered.

#### Acceptance Criteria

1. THE Login_Page SHALL send each status check request exactly once per page load.
2. WHILE the Login_Page remains open after both status checks have completed, THE Login_Page SHALL keep each Status_Indicator in its last displayed state without sending further status check requests.
3. THE Login_Page SHALL send the Health_Endpoint request and the SpaceTraders_Health_Endpoint request concurrently, without waiting for one to complete before sending the other.
4. WHILE the Agent_Details_View is displayed, THE Login_Page SHALL hide both Status_Indicators.
5. WHILE the login form is displayed, THE Login_Page SHALL display both Status_Indicators.
