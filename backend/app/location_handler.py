"""Location routes: system waypoint listing and single waypoint details.

``GET /api/systems/{systemSymbol}/waypoints`` and
``GET /api/systems/{systemSymbol}/waypoints/{waypointSymbol}``
(design.md -> location_handler; Requirements 7.x, 8.x, 10.2).

Path parameters are validated by FastAPI (422 before the handler runs, so the
adapter is never called). Adapter failures map to 404/504/502 with the shared
error envelope and fixed messages that contain no request data. Nothing is
logged or stored.
"""

from __future__ import annotations

from fastapi import APIRouter, Path
from fastapi.responses import JSONResponse

from app.map_waypoint import map_waypoint_detail, map_waypoint_summary
from app.models import ErrorBody, ErrorEnvelope
from app.spacetraders_waypoint_adapter import (
    WaypointFailure,
    fetch_system_waypoints,
    fetch_waypoint,
)

SYSTEM_PATTERN = r"^[A-Za-z0-9]+-[A-Za-z0-9]+$"
WAYPOINT_PATTERN = r"^[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+$"

router = APIRouter()

_FAILURES = {
    "not_found": (404, "The requested location was not found."),
    "timeout": (504, "The SpaceTraders service took too long to respond."),
    "upstream": (502, "The SpaceTraders service could not be reached."),
}


def _failure_response(failure: WaypointFailure) -> JSONResponse:
    status, message = _FAILURES.get(failure.kind, _FAILURES["upstream"])
    kind = failure.kind if failure.kind in _FAILURES else "upstream"
    envelope = ErrorEnvelope(error=ErrorBody(kind=kind, message=message))
    return JSONResponse(status_code=status, content=envelope.model_dump(exclude_none=True))


@router.get("/api/systems/{systemSymbol}/waypoints")
async def list_waypoints(
    systemSymbol: str = Path(pattern=SYSTEM_PATTERN),
) -> JSONResponse:
    outcome = fetch_system_waypoints(systemSymbol)
    if isinstance(outcome, WaypointFailure):
        return _failure_response(outcome)
    waypoints = [map_waypoint_summary(w).model_dump() for w in outcome]
    return JSONResponse(status_code=200, content={"waypoints": waypoints})


@router.get("/api/systems/{systemSymbol}/waypoints/{waypointSymbol}")
async def get_waypoint(
    systemSymbol: str = Path(pattern=SYSTEM_PATTERN),
    waypointSymbol: str = Path(pattern=WAYPOINT_PATTERN),
) -> JSONResponse:
    outcome = fetch_waypoint(systemSymbol, waypointSymbol)
    if isinstance(outcome, WaypointFailure):
        return _failure_response(outcome)
    return JSONResponse(status_code=200, content=map_waypoint_detail(outcome).model_dump())
