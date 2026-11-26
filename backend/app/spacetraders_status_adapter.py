"""Adapter for the unauthenticated SpaceTraders ``GET /`` status operation.

Used by the ``/health/spacetraders`` route. It mirrors the lazy-import and
normalization approach of :mod:`app.generated_client_adapter`, but:

* builds the generated ``Configuration`` with no ``access_token``;
* calls ``GlobalApi.get_status`` with a 5-second request timeout;
* returns only a :class:`StatusOutcome` (success/failure), never the body.

Every failure (non-2xx, network error, timeout, missing generated client) is
normalized to ``StatusOutcome(ok=False)``; this function never raises.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.generated_client_adapter import (
    GeneratedClientUnavailable,
    _close,
    _import_generated,
)

# Upstream call deadline in seconds (Requirement 1.4).
REQUEST_TIMEOUT_SECONDS: float = 5.0


@dataclass(frozen=True)
class StatusOutcome:
    """Normalized result of the SpaceTraders status call."""

    ok: bool


def _build_configuration(client_pkg: Any) -> Any:
    """Build a fresh, unauthenticated generated-client ``Configuration``."""
    return getattr(client_pkg, "Configuration")()


def fetch_status() -> StatusOutcome:
    """Call the SpaceTraders status operation without authentication.

    Returns ``StatusOutcome(ok=True)`` when the call succeeds and
    ``StatusOutcome(ok=False)`` for any failure.
    """
    try:
        client_pkg = _import_generated()
    except GeneratedClientUnavailable:
        return StatusOutcome(ok=False)

    try:
        configuration = _build_configuration(client_pkg)
        api_client = getattr(client_pkg, "ApiClient")(configuration)
        try:
            global_api = getattr(client_pkg, "GlobalApi")(api_client)
            global_api.get_status(_request_timeout=REQUEST_TIMEOUT_SECONDS)
        finally:
            _close(api_client)
    except Exception:  # noqa: BLE001 - normalize every failure
        return StatusOutcome(ok=False)

    return StatusOutcome(ok=True)
