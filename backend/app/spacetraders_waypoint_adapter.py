"""Adapter for the unauthenticated SpaceTraders system/waypoint operations.

Wraps ``SystemsApi.get_system_waypoints`` and ``SystemsApi.get_waypoint`` from
the generated client. Follows :mod:`app.spacetraders_status_adapter`:

* the generated ``Configuration`` is built with no ``access_token``;
* the API client is closed in ``finally``;
* every upstream call passes ``_request_timeout=5.0`` (per call);
* success returns plain ``dict`` payloads (via ``to_dict()``), failure returns a
  :class:`WaypointFailure`. These functions never raise for upstream failures.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Literal

from app.generated_client_adapter import (
    GeneratedClientUnavailable,
    _close,
    _import_generated,
    _looks_like_timeout,
    _status_of_exception,
)

# Per-call upstream deadline in seconds.
REQUEST_TIMEOUT_SECONDS: float = 5.0
# Upstream maximum page size for the waypoints listing.
PAGE_SIZE: int = 20


@dataclass(frozen=True)
class WaypointFailure:
    """Normalized failure of a waypoint call."""

    kind: Literal["not_found", "timeout", "upstream"]


def _classify(exc: BaseException) -> WaypointFailure:
    if _looks_like_timeout(exc):
        return WaypointFailure(kind="timeout")
    if _status_of_exception(exc) == 404:
        return WaypointFailure(kind="not_found")
    return WaypointFailure(kind="upstream")


def _to_dict(model: Any) -> dict:
    return model.to_dict() if hasattr(model, "to_dict") else dict(model)


def _systems_api(client_pkg: Any, api_client: Any) -> Any:
    return getattr(client_pkg, "SystemsApi")(api_client)


def fetch_system_waypoints(system_symbol: str) -> list[dict] | WaypointFailure:
    """Fetch every waypoint in a system, paginating from ``meta.total``."""
    try:
        client_pkg = _import_generated()
    except GeneratedClientUnavailable:
        return WaypointFailure(kind="upstream")

    try:
        configuration = getattr(client_pkg, "Configuration")()
        api_client = getattr(client_pkg, "ApiClient")(configuration)
        try:
            api = _systems_api(client_pkg, api_client)
            first = api.get_system_waypoints(
                system_symbol,
                page=1,
                limit=PAGE_SIZE,
                _request_timeout=REQUEST_TIMEOUT_SECONDS,
            )
            waypoints = [_to_dict(w) for w in first.data]
            total = first.meta.total
            pages = math.ceil(total / PAGE_SIZE)
            for page in range(2, pages + 1):
                result = api.get_system_waypoints(
                    system_symbol,
                    page=page,
                    limit=PAGE_SIZE,
                    _request_timeout=REQUEST_TIMEOUT_SECONDS,
                )
                waypoints.extend(_to_dict(w) for w in result.data)
        finally:
            _close(api_client)
    except Exception as exc:  # noqa: BLE001 - normalize every failure
        return _classify(exc)

    return waypoints


def fetch_waypoint(system_symbol: str, waypoint_symbol: str) -> dict | WaypointFailure:
    """Fetch a single waypoint."""
    try:
        client_pkg = _import_generated()
    except GeneratedClientUnavailable:
        return WaypointFailure(kind="upstream")

    try:
        configuration = getattr(client_pkg, "Configuration")()
        api_client = getattr(client_pkg, "ApiClient")(configuration)
        try:
            api = _systems_api(client_pkg, api_client)
            result = api.get_waypoint(
                system_symbol,
                waypoint_symbol,
                _request_timeout=REQUEST_TIMEOUT_SECONDS,
            )
            payload = _to_dict(result.data)
        finally:
            _close(api_client)
    except Exception as exc:  # noqa: BLE001 - normalize every failure
        return _classify(exc)

    return payload
