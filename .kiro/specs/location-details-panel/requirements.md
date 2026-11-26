# Requirements Document

## Introduction

After login, the Agent_Details_View shows the agent's headquarters as a waypoint symbol (for example `X1-DF55-20250Z`). This feature turns the headquarters value into a control. Activating it opens a Location_Panel, shown in a separate column beside the agent details, with details of that waypoint. When no waypoint is selected, the Location_Panel lists the waypoints of the System the agent is in, and the user can pick one from that list. The System is derived from the agent's headquarters symbol, which is the first two dash-separated segments of the waypoint symbol (for example `X1-DF55`).

The browser communicates only with the Backend_API. The Backend_API gets waypoint data from the SpaceTraders_API through the existing generated client, using the unauthenticated System waypoint operations, so no agent token is stored or forwarded for these requests.

## Glossary

- **Web_Client**: The frontend application, including the Agent_Details_View and the Location_Panel.
- **Agent_Details_View**: The view that replaces the login form and shows the agent's details after a successful login.
- **Backend_API**: The FastAPI backend application serving the Web_Client's requests.
- **SpaceTraders_API**: The external SpaceTraders v2 HTTP API.
- **SpaceTraders_Adapter**: The backend component that calls the SpaceTraders_API through the generated client.
- **Waypoint**: A location in the game, identified by a Waypoint_Symbol.
- **Waypoint_Symbol**: A string of the form `<sector>-<system>-<waypoint>` (for example `X1-DF55-20250Z`).
- **System_Symbol**: The first two dash-separated segments of a Waypoint_Symbol (for example `X1-DF55`).
- **Headquarters_Link**: The control in the Agent_Details_View that displays the agent's headquarters Waypoint_Symbol and selects it when activated.
- **Location_Panel**: The column beside the Agent_Details_View that shows either the Location_List or the Location_Details.
- **Location_List**: The list of Waypoints in the System_Symbol of the agent's headquarters.
- **Location_Details**: The details of one selected Waypoint.
- **Breadcrumb**: A navigation landmark labelled "Breadcrumb" at the top of the Location_Panel. It shows the System_Symbol, followed by the Selected_Location when one is set. The last crumb is the current page and is not a link.
- **System_Crumb**: The Breadcrumb entry for the System_Symbol.
- **Location_Order**: The order in which the Location_List rows are displayed. Currently ascending by Waypoint_Symbol using natural ordering, where digit runs compare by numeric value and letters compare case-insensitively.
- **Selected_Location**: The Waypoint_Symbol currently chosen by the user, or none.
- **Waypoint_Summary**: The per-waypoint data shown in the Location_List: symbol, type, and x and y coordinates.
- **Waypoint_Detail_Fields**: The per-waypoint data shown in the Location_Details: symbol, type, System_Symbol, x and y coordinates, orbital parent symbol (if any), orbiting waypoint symbols, faction (if any), traits (symbol and name), modifiers (symbol and name), and whether the waypoint is under construction.
- **Waypoints_Endpoint**: The new Backend_API route `GET /api/systems/{systemSymbol}/waypoints`.
- **Waypoint_Endpoint**: The new Backend_API route `GET /api/systems/{systemSymbol}/waypoints/{waypointSymbol}`.
- **Page_Size**: The number of Waypoints requested from the SpaceTraders_API per page, set to 20.
- **Loading_State**: Panel state shown while a request is in progress.
- **Error_State**: Panel state shown with a message and a retry control when a request fails.

## Requirements

### Requirement 1: Headquarters link

**User Story:** As a user, I want to click the headquarters name in my agent details, so that I can see details of that place.

#### Acceptance Criteria

1. WHILE the Agent_Details_View is displayed and the agent has a headquarters value, THE Web_Client SHALL display the headquarters value as a Headquarters_Link.
2. WHEN the user activates the Headquarters_Link, THE Web_Client SHALL set the Selected_Location to the headquarters Waypoint_Symbol.
3. THE Headquarters_Link SHALL be operable by keyboard and expose a button role to assistive technology.
4. IF the agent has no headquarters value, THEN THE Agent_Details_View SHALL display the existing empty-value placeholder instead of a Headquarters_Link.

### Requirement 2: Location panel layout

**User Story:** As a user, I want location information in a separate column, so that I can read it alongside my agent details.

#### Acceptance Criteria

1. WHILE the Agent_Details_View is displayed, THE Web_Client SHALL display the Location_Panel in a column beside the agent details.
2. WHILE the Agent_Details_View is not displayed, THE Web_Client SHALL hide the Location_Panel.
3. WHEN the user logs out, THE Web_Client SHALL clear the Selected_Location and all Location_Panel data.
4. WHERE the viewport width is below 700 pixels, THE Web_Client SHALL stack the Location_Panel below the agent details.

### Requirement 3: Location list when nothing is selected

**User Story:** As a user, I want to see the locations in my current system when I have not picked one, so that I can explore the system.

#### Acceptance Criteria

1. WHILE the Selected_Location is none, THE Location_Panel SHALL display the Location_List.
2. WHEN the Agent_Details_View is first displayed, THE Web_Client SHALL request the Location_List for the System_Symbol derived from the agent's headquarters.
3. THE Location_List SHALL display, for each Waypoint, the Waypoint_Summary.
4. WHEN the user activates a Waypoint in the Location_List, THE Web_Client SHALL set the Selected_Location to that Waypoint_Symbol.
5. WHILE the Location_List is displayed, THE Location_Panel SHALL display the Breadcrumb containing only the System_Crumb as the current page.
6. IF the System contains no Waypoints, THEN THE Location_List SHALL display the text "No locations found".
7. IF the agent's headquarters value cannot be parsed into a System_Symbol, THEN THE Location_Panel SHALL display an Error_State stating the system could not be determined.
8. THE Location_List SHALL display Waypoints in ascending alphabetical order by Waypoint_Symbol (the Location_Order), regardless of the order in which the Waypoints_Endpoint returns them.

### Requirement 4: Location details

**User Story:** As a user, I want to see the details of a selected place, so that I can learn what is there.

#### Acceptance Criteria

1. WHEN the Selected_Location is set, THE Web_Client SHALL request the Location_Details for that Waypoint_Symbol from the Waypoint_Endpoint.
2. WHILE the Selected_Location is set and the Location_Details have loaded, THE Location_Panel SHALL display the Waypoint_Detail_Fields.
3. WHERE a Waypoint has no faction, THE Location_Panel SHALL omit the faction field.
4. WHERE a Waypoint has no orbital parent, THE Location_Panel SHALL omit the orbital parent field.
5. WHEN the user changes the Selected_Location while a Location_Details request is in progress, THE Web_Client SHALL discard the response of the earlier request.

### Requirement 5: Return to the list

**User Story:** As a user, I want to go back to the list of locations from a detail view, so that I can pick another place.

#### Acceptance Criteria

1. WHILE the Location_Details are displayed, THE Location_Panel SHALL display the Breadcrumb with the System_Crumb as a link, followed by the Selected_Location as the current page.
2. WHEN the user activates the System_Crumb link, THE Web_Client SHALL set the Selected_Location to none.
3. WHEN the Selected_Location is set to none after having been set, THE Web_Client SHALL display the Location_List without a new request to the Waypoints_Endpoint for the same System_Symbol.

### Requirement 6: Loading and error presentation

**User Story:** As a user, I want clear feedback while location data loads or fails, so that I know what is happening.

#### Acceptance Criteria

1. WHILE a Location_Panel request is in progress, THE Location_Panel SHALL display the Loading_State with a text label "Loading locations" for the Location_List or "Loading location details" for the Location_Details.
2. IF a Location_Panel request fails, THEN THE Location_Panel SHALL display the Error_State with a message describing the failure and a "Retry" control.
3. WHEN the user activates the "Retry" control, THE Web_Client SHALL repeat the failed request.
4. IF the Waypoint_Endpoint returns HTTP status 404, THEN THE Location_Panel SHALL display the message "Location not found" and the Breadcrumb with the System_Crumb as a link.
5. THE Location_Panel SHALL announce Loading_State and Error_State changes to assistive technology through a live region.

### Requirement 7: Waypoints endpoint

**User Story:** As a developer, I want the backend to return the waypoints of a system, so that the browser does not contact SpaceTraders directly.

#### Acceptance Criteria

1. WHEN a GET request is received at the Waypoints_Endpoint, THE Backend_API SHALL request the Waypoints of that System_Symbol from the SpaceTraders_API through the SpaceTraders_Adapter, without an agent token.
2. WHEN the SpaceTraders_API reports more Waypoints than one Page_Size, THE Backend_API SHALL request every remaining page and return the combined Waypoints in the order reported by the SpaceTraders_API.
3. WHEN all pages are retrieved, THE Waypoints_Endpoint SHALL return HTTP status 200 with a JSON body containing a `waypoints` array of Waypoint_Summary objects.
4. IF the SpaceTraders_API returns HTTP status 404 for the System_Symbol, THEN THE Waypoints_Endpoint SHALL return HTTP status 404 with the error envelope.
5. IF the SpaceTraders_API call fails for any other reason, THEN THE Waypoints_Endpoint SHALL return HTTP status 502 with the error envelope.
6. IF a SpaceTraders_API call does not complete within 5 seconds, THEN THE Waypoints_Endpoint SHALL return HTTP status 504 with the error envelope.
7. IF the `systemSymbol` path parameter does not match the pattern `<sector>-<system>`, THEN THE Waypoints_Endpoint SHALL return HTTP status 422 without calling the SpaceTraders_API.

### Requirement 8: Waypoint endpoint

**User Story:** As a developer, I want the backend to return the details of one waypoint, so that the browser can display them.

#### Acceptance Criteria

1. WHEN a GET request is received at the Waypoint_Endpoint, THE Backend_API SHALL request that Waypoint from the SpaceTraders_API through the SpaceTraders_Adapter, without an agent token.
2. WHEN the SpaceTraders_API call succeeds, THE Waypoint_Endpoint SHALL return HTTP status 200 with a JSON body containing the Waypoint_Detail_Fields.
3. IF the SpaceTraders_API returns HTTP status 404, THEN THE Waypoint_Endpoint SHALL return HTTP status 404 with the error envelope.
4. IF the SpaceTraders_API call fails for any other reason, THEN THE Waypoint_Endpoint SHALL return HTTP status 502 with the error envelope.
5. IF the SpaceTraders_API call does not complete within 5 seconds, THEN THE Waypoint_Endpoint SHALL return HTTP status 504 with the error envelope.
6. IF the `systemSymbol` or `waypointSymbol` path parameter does not match the Waypoint_Symbol or System_Symbol pattern, THEN THE Waypoint_Endpoint SHALL return HTTP status 422 without calling the SpaceTraders_API.

### Requirement 9: Waypoint mapping and system derivation

**User Story:** As a developer, I want a defined mapping from SpaceTraders data to the response shapes, so that the contract is stable and verifiable.

#### Acceptance Criteria

1. THE Backend_API SHALL map each upstream Waypoint to a Waypoint_Summary containing symbol, type, x and y.
2. THE Backend_API SHALL map each upstream Waypoint to Waypoint_Detail_Fields, using null for optional fields that are absent upstream.
3. THE Web_Client SHALL derive the System_Symbol from a Waypoint_Symbol by taking the first two dash-separated segments.
4. FOR ALL valid Waypoint_Symbols, THE derived System_Symbol joined with a dash and the third segment SHALL equal the original Waypoint_Symbol (round-trip property).
5. FOR ALL upstream Waypoint payloads, mapping the same payload twice SHALL produce equal results (idempotence property).

### Requirement 10: Statelessness and token handling

**User Story:** As a user, I want location lookups to leave my token untouched, so that my credentials stay confined to login.

#### Acceptance Criteria

1. THE Web_Client SHALL send Waypoints_Endpoint and Waypoint_Endpoint requests without the agent token.
2. THE Backend_API SHALL process Waypoints_Endpoint and Waypoint_Endpoint requests without persisting or logging request data beyond standard access logs.
3. THE Web_Client SHALL keep the Selected_Location and Location_Panel data only in in-memory state.
