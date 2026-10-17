# Requirements Document

## Introduction

This feature delivers the first iteration of a web client for the SpaceTraders game (https://spacetraders.io). It provides a stateless login experience: a player supplies their SpaceTraders API token, and the application retrieves and displays that player's in-game agent information. No user data is persisted between sessions in this iteration.

The system is composed of a TypeScript/React frontend (Web_Client) and a Python backend (Backend_Service). The backend communicates with the SpaceTraders API through an API client (Generated_API_Client) generated from the SpaceTraders OpenAPI specification using OpenAPI Generator. The token is held only for the duration of a request/session in memory and is never written to durable storage.

## Glossary

- **System**: The complete agent-login application, comprising the Web_Client and the Backend_Service.
- **Web_Client**: The TypeScript/React frontend that renders the login form and agent details.
- **Backend_Service**: The Python backend that receives login requests from the Web_Client and calls the SpaceTraders API.
- **Generated_API_Client**: The API client library generated from the SpaceTraders OpenAPI specification (https://spacetraders.io/openapi) using OpenAPI Generator, used by the Backend_Service to call the SpaceTraders API.
- **SpaceTraders_API**: The external SpaceTraders game API that authenticates requests via bearer token and returns agent data.
- **Agent_Token**: The SpaceTraders API token supplied by the user to authenticate requests on behalf of their agent.
- **Agent_Details**: The authenticated player's in-game agent information returned by the SpaceTraders_API, including account identifier, call sign (symbol), headquarters, credits, starting faction, and ship count.
- **Login_Request**: A request initiated by the user that submits the Agent_Token to retrieve Agent_Details.
- **Session**: The period during which the Web_Client retains the Agent_Token and Agent_Details in memory, ending when the user logs out or the page is closed or reloaded.

## Requirements

### Requirement 1: Submit Agent Token

**User Story:** As a SpaceTraders player, I want to enter my API token into a login form, so that I can authenticate and view my agent information.

#### Acceptance Criteria

1. WHEN the Web_Client loads without an active Session, THE Web_Client SHALL display a login form containing a single text input field for the Agent_Token and a submit control.
2. WHILE the Agent_Token input field contains zero non-whitespace characters, THE Web_Client SHALL disable the submit control.
3. WHILE the Agent_Token input field contains between 1 and 4096 non-whitespace characters, THE Web_Client SHALL enable the submit control.
4. WHEN the user submits the login form with an Agent_Token containing between 1 and 4096 non-whitespace characters, THE Web_Client SHALL send a single Login_Request containing the trimmed Agent_Token to the Backend_Service.
5. WHILE a Login_Request is in progress, THE Web_Client SHALL display a loading indicator and disable the submit control.
6. IF the Agent_Token exceeds 4096 characters, THEN THE Web_Client SHALL disable the submit control and display a validation message indicating the token exceeds the maximum allowed length.

### Requirement 2: Authenticate and Retrieve Agent Details

**User Story:** As a SpaceTraders player, I want the backend to use my token to fetch my agent data, so that my current in-game status is retrieved from the official source.

#### Acceptance Criteria

1. WHEN the Backend_Service receives a Login_Request, THE Backend_Service SHALL call the SpaceTraders_API through the Generated_API_Client using the Agent_Token as a bearer credential to request the authenticated agent.
2. WHEN the SpaceTraders_API returns a response indicating success and containing agent data within 10 seconds of the call, THE Backend_Service SHALL return the Agent_Details to the Web_Client with an HTTP 200 status code.
3. WHEN the Backend_Service returns Agent_Details, THE Backend_Service SHALL include the account identifier, call sign, headquarters, credits, and starting faction fields, each populated from the SpaceTraders_API response.
4. WHEN the Backend_Service returns Agent_Details, THE Backend_Service SHALL include a ship count field whose value is the number of ships reported for the agent by the SpaceTraders_API, with a minimum value of 0.
5. IF the SpaceTraders_API does not return a response within 10 seconds of the call, THEN THE Backend_Service SHALL abort the request and return an HTTP 504 status code with an error message indicating that the request to the SpaceTraders_API timed out, without returning any Agent_Details.

### Requirement 3: Display Agent Details

**User Story:** As a SpaceTraders player, I want to see my agent details after logging in, so that I can review my current in-game status.

#### Acceptance Criteria

1. WHEN the Web_Client receives Agent_Details from the Backend_Service, THE Web_Client SHALL display the account identifier, call sign, headquarters, credits, starting faction, and ship count within 2 seconds of receipt.
2. WHEN the Web_Client displays the credits value, THE Web_Client SHALL format the credits as a base-10 integer value supporting the range -999,999,999,999 to 999,999,999,999 with no fractional digits.
3. IF a required Agent_Details field (account identifier, call sign, headquarters, credits, starting faction, or ship count) is absent or null in the Backend_Service response, THEN THE Web_Client SHALL display a placeholder indicator in place of the missing field and display the remaining available fields.
4. IF the Web_Client does not receive Agent_Details from the Backend_Service within 10 seconds of the request, THEN THE Web_Client SHALL display an error message indicating that agent details could not be retrieved and SHALL provide a control to retry the request.
5. WHILE Agent_Details are displayed, THE Web_Client SHALL display a logout control.

### Requirement 4: Handle Authentication and API Errors

**User Story:** As a SpaceTraders player, I want clear feedback when my token is invalid or the API fails, so that I understand why login did not succeed.

#### Acceptance Criteria

1. IF the SpaceTraders_API rejects the Agent_Token with an authentication error, THEN THE Backend_Service SHALL return an HTTP 401 status code with an error message that identifies the failure as an authentication error and that does not contain the Agent_Token.
2. IF the SpaceTraders_API returns an error other than an authentication error, THEN THE Backend_Service SHALL return an HTTP 502 status code with an error message that identifies the failure as an upstream API error and that does not contain the Agent_Token.
3. IF the Web_Client receives an HTTP 401 response for a Login_Request, THEN THE Web_Client SHALL display a message stating that the Agent_Token is invalid and SHALL retain the login form with the previously entered Agent_Token preserved in the input field.
4. IF the Web_Client receives an HTTP 502 or HTTP 504 response for a Login_Request, THEN THE Web_Client SHALL display a message stating that agent details could not be retrieved and SHALL retain the login form with the previously entered Agent_Token preserved in the input field.
5. IF the Web_Client cannot reach the Backend_Service for a Login_Request, THEN THE Web_Client SHALL display a message stating that the service is unavailable and SHALL retain the login form with the previously entered Agent_Token preserved in the input field.
6. IF a Login_Request fails for any reason, THEN THE Web_Client SHALL remove the loading indicator and re-enable the submit control for any non-empty Agent_Token.

### Requirement 5: Stateless Session Handling

**User Story:** As a SpaceTraders player, I want my token to be kept only during my session and never stored, so that my credentials are not persisted by the application.

#### Acceptance Criteria

1. WHEN the Backend_Service processes a Login_Request, THE Backend_Service SHALL NOT write the Agent_Token to any storage that persists after the request completes, including disk files, databases, caches, or log output.
2. WHEN the Backend_Service processes a Login_Request, THE Backend_Service SHALL NOT write the Agent_Details to any storage that persists after the request completes, including disk files, databases, caches, or log output.
3. WHILE a Session is active, THE Web_Client SHALL retain the Agent_Token only in volatile in-memory state and SHALL NOT write it to localStorage, sessionStorage, cookies, or IndexedDB.
4. WHEN the user activates the logout control, THE Web_Client SHALL discard the Agent_Token and Agent_Details from in-memory state and display the login form with an empty Agent_Token input field.
5. WHEN the Web_Client page is reloaded or closed and reopened, THE Web_Client SHALL display the login form with an empty Agent_Token input field and SHALL NOT repopulate any previously entered Agent_Token or Agent_Details.

### Requirement 6: Generate API Client from OpenAPI Specification

**User Story:** As a developer, I want the SpaceTraders API client generated from the official OpenAPI specification, so that the backend uses a type-accurate client that matches the published API contract.

#### Acceptance Criteria

1. THE Generated_API_Client SHALL be produced from the SpaceTraders OpenAPI specification using OpenAPI Generator.
2. WHEN the generation command is executed against a valid SpaceTraders OpenAPI specification, THE System SHALL produce the Generated_API_Client containing type definitions and operations for every endpoint and schema defined in that specification.
3. IF the generation command is executed against an OpenAPI specification that is malformed or fails schema validation, THEN THE System SHALL abort generation without overwriting the existing Generated_API_Client and SHALL emit an error indicating the specification is invalid.
4. THE Backend_Service SHALL use the Generated_API_Client to call the SpaceTraders_API agent endpoint.
5. WHERE the SpaceTraders OpenAPI specification is updated, THE System SHALL support regenerating the Generated_API_Client through a single documented, repeatable generation command that requires no manual edits to the generated output.
