"""``POST /api/login`` route handler.

A thin, stateless endpoint (design.md -> "POST /api/login handler",
Requirements 2.1-2.5, 4.1, 4.2, 5.1, 5.2). It accepts ``{ "token": string }``,
hands the token to the per-request client adapter, and either:

* maps a successful upstream agent payload through :func:`map_agent` and returns
  the compact ``Agent_Details`` with HTTP 200, or
* routes every non-success outcome through :func:`classify_error`, returning the
  ``{ "error": { "kind", "message" } }`` envelope with HTTP 401/502/504.

Statelessness (Requirements 5.1, 5.2): the token lives only in the handler's
local ``body.token`` for the duration of the call and is discarded when the
handler returns. Neither the token nor the agent payload is written to any
store or emitted to logs anywhere in this module.
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.classify_error import classify_error
from app.generated_client_adapter import fetch_agent
from app.map_agent import map_agent
from app.models import AgentDetails, ErrorBody, ErrorEnvelope, LoginRequest

router = APIRouter()


@router.post("/api/login")
async def login(body: LoginRequest) -> JSONResponse:
    """Authenticate the token and return ``Agent_Details`` or an error envelope.

    The token from ``body`` is used for exactly one upstream call via the
    adapter and is never persisted or logged. A ``dict`` result is a success
    payload that is mapped to ``Agent_Details`` (HTTP 200); anything else is a
    normalized failure routed through ``classify_error`` into a 401/502/504
    error envelope whose message never contains the token.
    """
    outcome = fetch_agent(body.token)

    if isinstance(outcome, dict):
        agent: AgentDetails = map_agent(outcome)
        return JSONResponse(status_code=200, content=agent.model_dump())

    status, kind, message = classify_error(outcome, body.token)
    envelope = ErrorEnvelope(error=ErrorBody(kind=kind, message=message))
    return JSONResponse(status_code=status, content=envelope.model_dump())
