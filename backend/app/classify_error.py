"""Pure classification of an upstream outcome into an HTTP error.

A single choke point maps any non-success upstream result into one of three
error shapes (design.md -> Error Handling, Correctness Property 6):

* an **authentication** outcome  -> ``(401, "authentication", message)``
* a **deadline/timeout** outcome -> ``(504, "timeout", message)``
* any **other** upstream failure -> ``(502, "upstream", message)``

Messages are human-readable and token-free. As defense-in-depth, any occurrence
of the token substring is scrubbed from the produced message so a token can
never leak through the error body (Correctness Property 7, Requirements 4.1,
4.2).

The adapter (task 4.1) normalizes upstream results into a :class:`FailureOutcome`.
``classify_error`` is intentionally tolerant: it also accepts a bare HTTP status
code, a mapping, or an arbitrary object/exception so the classifier stays robust
regardless of exactly how a failure is surfaced.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional, Tuple

from app.models import ErrorKind

# Redaction marker used when scrubbing a token substring from a message.
_REDACTION = "[REDACTED]"

# Human-readable, token-free messages per classified kind.
_MESSAGES = {
    "authentication": (
        "Authentication failed: the SpaceTraders API rejected the token."
    ),
    "timeout": (
        "The request to the SpaceTraders API timed out."
    ),
    "upstream": (
        "The SpaceTraders API returned an error."
    ),
}


@dataclass(frozen=True)
class FailureOutcome:
    """Normalized failure signal produced by the client adapter (task 4.1).

    Attributes:
        kind: Optional explicit classification hint ("authentication" or
            "timeout"). When absent, the status / timeout flag are consulted.
        status: Optional upstream HTTP status code (e.g. 401, 500).
        timeout: True when the upstream call exceeded its deadline.
        detail: Optional free-form detail (never surfaced verbatim to clients).
    """

    kind: Optional[str] = None
    status: Optional[int] = None
    timeout: bool = False
    detail: Optional[str] = None


def _scrub_token(message: str, token: str) -> str:
    """Remove every occurrence of ``token`` from ``message`` (defense-in-depth).

    An empty token is a no-op so we never replace empty substrings.
    """
    if token:
        message = message.replace(token, _REDACTION)
    return message


def _is_timeout(outcome: Any) -> bool:
    """Best-effort detection of a deadline/timeout outcome."""
    if isinstance(outcome, FailureOutcome):
        return outcome.timeout or outcome.kind == "timeout"
    if isinstance(outcome, TimeoutError):
        return True
    timeout_flag = getattr(outcome, "timeout", None)
    if timeout_flag is True:
        return True
    if isinstance(outcome, dict):
        if outcome.get("timeout") is True:
            return True
        if outcome.get("kind") == "timeout":
            return True
    # Fall back to the class name for timeout-like exceptions from the client.
    if "timeout" in type(outcome).__name__.lower():
        return True
    return False


def _explicit_kind(outcome: Any) -> Optional[str]:
    """Return an explicit classification hint on the outcome, if any."""
    if isinstance(outcome, FailureOutcome):
        return outcome.kind
    if isinstance(outcome, dict):
        kind = outcome.get("kind")
        return kind if isinstance(kind, str) else None
    kind = getattr(outcome, "kind", None)
    return kind if isinstance(kind, str) else None


def _status_of(outcome: Any) -> Optional[int]:
    """Extract an upstream HTTP status code from the outcome, if present."""
    if isinstance(outcome, bool):
        return None
    if isinstance(outcome, int):
        return outcome
    if isinstance(outcome, FailureOutcome):
        return outcome.status
    if isinstance(outcome, dict):
        status = outcome.get("status")
        return status if isinstance(status, int) and not isinstance(status, bool) else None
    status = getattr(outcome, "status", None)
    if isinstance(status, int) and not isinstance(status, bool):
        return status
    return None


def _kind_for(outcome: Any) -> ErrorKind:
    """Classify an upstream outcome into an :data:`ErrorKind`.

    Precedence: an explicit "authentication" hint or a 401 status is an
    authentication failure; a timeout signal is a timeout; everything else is a
    generic upstream failure.
    """
    explicit = _explicit_kind(outcome)
    status = _status_of(outcome)

    if explicit == "authentication" or status == 401:
        return "authentication"
    if explicit == "timeout" or _is_timeout(outcome):
        return "timeout"
    return "upstream"


def classify_error(outcome: Any, token: str = "") -> Tuple[int, ErrorKind, str]:
    """Classify an upstream failure into ``(status, kind, message)``.

    Args:
        outcome: A normalized :class:`FailureOutcome`, a bare HTTP status code,
            a mapping, or an arbitrary failure/exception object.
        token: The agent token for this request. Any occurrence of it is scrubbed
            from the returned message as defense-in-depth; the message is already
            token-free by construction.

    Returns:
        A ``(http_status, kind, message)`` triple where ``kind`` is one of
        ``"authentication"`` (401), ``"timeout"`` (504), or ``"upstream"`` (502),
        and ``message`` never contains the token.
    """
    kind: ErrorKind = _kind_for(outcome)

    status_by_kind = {
        "authentication": 401,
        "timeout": 504,
        "upstream": 502,
    }
    http_status = status_by_kind[kind]
    message = _scrub_token(_MESSAGES[kind], token)

    return http_status, kind, message
