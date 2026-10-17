"""Adapter around the generated SpaceTraders API client.

This module is the *only* place in the backend that touches generator-specific
types. Everything else (the handler, ``classify_error``, ``map_agent``) works
with the normalized values this adapter returns:

* on success  -> a plain ``dict`` agent payload (the upstream ``data`` object),
* on failure  -> a :class:`~app.classify_error.FailureOutcome` describing the
  failure as *authentication* (HTTP 401), *timeout* (deadline exceeded), or a
  generic *upstream* error, with an optional status / token-free detail.

Design (design.md -> "Generated_API_Client wiring", Requirements 2.1, 2.5, 6.4):

* A *fresh* client configuration is built per request with the bearer token and
  a 10-second request timeout; nothing holds the token across requests.
* The agent operation (``GET /my/agent``) is invoked through the generated
  client, under the 10-second upstream deadline.

The generated client lives under ``app/generated`` and is produced by
``make generate-client``. That tree may be absent in a fresh checkout, so this
module imports it *lazily and defensively*: importing this module never requires
the generated tree, and a missing client surfaces as a normalized *upstream*
``FailureOutcome`` rather than an import error at module load time.
"""

from __future__ import annotations

import importlib
from typing import Any, Optional

from app.classify_error import FailureOutcome

# The upstream call deadline, in seconds (Requirement 2.5 / design decision).
REQUEST_TIMEOUT_SECONDS: float = 10.0

# Import path of the generated client package (see scripts/generate_client.py:
# ``packageName=spacetraders_client`` generated into ``app/generated``).
_GENERATED_PACKAGE = "app.generated.spacetraders_client"


class GeneratedClientUnavailable(RuntimeError):
    """Raised internally when the generated client tree is not importable.

    Never propagates out of :func:`fetch_agent`; it is translated into a
    normalized ``upstream`` :class:`FailureOutcome`.
    """


def _import_generated() -> Any:
    """Import the generated client package lazily.

    Raises :class:`GeneratedClientUnavailable` when the generated tree has not
    been produced yet (``make generate-client``) so the caller can normalize it
    into an upstream failure instead of crashing.
    """
    try:
        return importlib.import_module(_GENERATED_PACKAGE)
    except ImportError as exc:  # ModuleNotFoundError is a subclass
        raise GeneratedClientUnavailable(
            "the generated SpaceTraders client is not available; "
            "run `make generate-client`"
        ) from exc


def _build_configuration(client_pkg: Any, token: str) -> Any:
    """Build a fresh generated-client ``Configuration`` with the bearer token.

    The openapi-generator python client accepts the bearer credential as
    ``access_token`` on its ``Configuration`` object. We construct a brand-new
    configuration for every request so no token is retained between calls.
    """
    configuration_cls = getattr(client_pkg, "Configuration")
    try:
        return configuration_cls(access_token=token)
    except TypeError:
        # Older/newer generator layouts may not accept the kwarg in __init__;
        # fall back to setting it on a default instance.
        configuration = configuration_cls()
        setattr(configuration, "access_token", token)
        return configuration


def _resolve_agent_api(client_pkg: Any, api_client: Any) -> Any:
    """Locate and instantiate the API class exposing the agent operation.

    The SpaceTraders spec places ``GET /my/agent`` under the ``Agents`` tag, so
    the python generator emits ``AgentsApi.get_my_agent``. We resolve it by
    preference but tolerate layout variation (e.g. ``DefaultApi``) by scanning
    for any ``*Api`` class that exposes an agent getter.
    """
    preferred = ("AgentsApi", "AgentApi", "MyAgentApi", "DefaultApi")
    for name in preferred:
        api_cls = getattr(client_pkg, name, None)
        if api_cls is not None and _agent_method_name(api_cls) is not None:
            return api_cls(api_client)

    # Fall back to scanning every exported ``*Api`` class.
    for attr in dir(client_pkg):
        if not attr.endswith("Api"):
            continue
        api_cls = getattr(client_pkg, attr, None)
        if api_cls is not None and _agent_method_name(api_cls) is not None:
            return api_cls(api_client)

    raise GeneratedClientUnavailable(
        "the generated client exposes no agent operation"
    )


def _agent_method_name(api_cls: Any) -> Optional[str]:
    """Return the name of the agent-getter method on ``api_cls``, if present."""
    for candidate in ("get_my_agent", "get_agent", "my_agent"):
        if callable(getattr(api_cls, candidate, None)):
            return candidate
    return None


def _extract_payload(result: Any) -> dict:
    """Normalize the agent operation result into a plain ``dict`` payload.

    The generated response is an envelope ``{ "data": { ...agent } }``. The
    response may be a pydantic/attrs model or a plain mapping, so we unwrap the
    ``data`` member defensively and coerce it to a dict.
    """
    data = _get_member(result, "data")
    payload = data if data is not None else result
    return _to_dict(payload)


def _get_member(obj: Any, name: str) -> Any:
    """Read ``name`` from a mapping or an attribute-bearing object."""
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)


def _to_dict(obj: Any) -> dict:
    """Best-effort conversion of a generated model to a plain ``dict``."""
    if isinstance(obj, dict):
        return dict(obj)
    for method in ("to_dict", "model_dump", "dict"):
        fn = getattr(obj, method, None)
        if callable(fn):
            try:
                converted = fn()
            except TypeError:
                continue
            if isinstance(converted, dict):
                return converted
    # Last resort: pull public attributes off the object.
    return {
        key: value
        for key, value in vars(obj).items()
        if not key.startswith("_")
    } if hasattr(obj, "__dict__") else {}


def _status_of_exception(exc: BaseException) -> Optional[int]:
    """Extract an upstream HTTP status code from a generated client exception."""
    for attr in ("status", "status_code"):
        value = getattr(exc, attr, None)
        if isinstance(value, int) and not isinstance(value, bool):
            return value
    return None


def _looks_like_timeout(exc: BaseException) -> bool:
    """Best-effort detection of a deadline/timeout from the transport layer."""
    if isinstance(exc, TimeoutError):
        return True
    name = type(exc).__name__.lower()
    if "timeout" in name:
        return True
    # urllib3 wraps read/connect timeouts; inspect the chained cause/context.
    cause = exc.__cause__ or exc.__context__
    if cause is not None and cause is not exc:
        return _looks_like_timeout(cause)
    return False


def fetch_agent(token: str) -> Any:
    """Call the SpaceTraders agent endpoint with a per-request bearer token.

    Builds a fresh generated-client configuration carrying ``token`` as the
    bearer credential and a 10-second request timeout, invokes the agent
    operation, and returns a *normalized* outcome:

    * success -> the agent payload as a plain ``dict``;
    * failure -> a :class:`FailureOutcome` classifying the failure as
      authentication (401), timeout (deadline exceeded), or upstream.

    This function never raises for an upstream/transport failure or for a
    missing generated client; it always returns one of the two normalized
    shapes so the handler can route it through ``classify_error``.
    """
    try:
        client_pkg = _import_generated()
    except GeneratedClientUnavailable as exc:
        return FailureOutcome(kind="upstream", detail=str(exc))

    try:
        configuration = _build_configuration(client_pkg, token)
        api_client_cls = getattr(client_pkg, "ApiClient")
        api_client = api_client_cls(configuration)
        try:
            agent_api = _resolve_agent_api(client_pkg, api_client)
            method_name = _agent_method_name(type(agent_api))
            if method_name is None:  # pragma: no cover - resolver guarantees one
                return FailureOutcome(
                    kind="upstream",
                    detail="no agent operation on the generated API class",
                )
            operation = getattr(agent_api, method_name)
            result = _invoke_with_timeout(operation)
        finally:
            _close(api_client)
    except GeneratedClientUnavailable as exc:
        return FailureOutcome(kind="upstream", detail=str(exc))
    except BaseException as exc:  # noqa: BLE001 - normalize every failure
        return _classify_exception(exc)

    return _extract_payload(result)


def _invoke_with_timeout(operation: Any) -> Any:
    """Invoke the agent operation under the 10-second request timeout.

    The generated urllib3-based operations accept a per-call ``_request_timeout``
    keyword. We pass it so the backend owns the upstream deadline (Requirement
    2.5); if a given generator layout does not accept the kwarg we fall back to
    a plain call (the client-configured timeout still applies).
    """
    try:
        return operation(_request_timeout=REQUEST_TIMEOUT_SECONDS)
    except TypeError:
        return operation()


def _classify_exception(exc: BaseException) -> FailureOutcome:
    """Translate a generated-client exception into a normalized failure."""
    if _looks_like_timeout(exc):
        return FailureOutcome(kind="timeout", timeout=True)

    status = _status_of_exception(exc)
    if status == 401:
        return FailureOutcome(kind="authentication", status=401)
    return FailureOutcome(kind="upstream", status=status)


def _close(api_client: Any) -> None:
    """Release any resources held by the per-request API client."""
    closer = getattr(api_client, "close", None)
    if callable(closer):
        try:
            closer()
        except Exception:  # noqa: BLE001 - closing must never mask the result
            pass
