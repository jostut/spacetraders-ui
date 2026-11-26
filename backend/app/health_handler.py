"""``GET /health/spacetraders`` route handler.

Reports whether the SpaceTraders v2 API is reachable. Any adapter failure
(non-2xx, network error, timeout, missing generated client) maps to 503
(Requirements 1.1-1.4). No agent token is required or forwarded.
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.spacetraders_status_adapter import fetch_status

router = APIRouter()


@router.get("/health/spacetraders")
async def spacetraders_health() -> JSONResponse:
    outcome = fetch_status()
    if outcome.ok:
        return JSONResponse(status_code=200, content={"status": "ok"})
    return JSONResponse(status_code=503, content={"status": "error"})
