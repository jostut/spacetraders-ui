"""Property-based tests for ``classify_error`` status mapping.

Feature: agent-login, Property 6: Upstream outcomes map to the correct HTTP status

*For any* upstream outcome, ``classify_error`` returns HTTP 401 when the outcome
is an authentication error, HTTP 504 when the outcome is a deadline/timeout, and
HTTP 502 for any other upstream error.

**Validates: Requirements 4.1, 4.2, 2.5**
"""

from __future__ import annotations

from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from app.classify_error import FailureOutcome, classify_error

# HTTP statuses that are not SpaceTraders authentication rejections. These stand
# in for the "any other upstream error" bucket (non-401 HTTP errors).
_NON_AUTH_STATUSES = st.sampled_from([400, 403, 404, 409, 422, 429, 500, 502, 503])


def _authentication_outcomes() -> st.SearchStrategy[Any]:
    """Outcomes that must classify as an authentication error (HTTP 401)."""
    explicit = st.builds(
        FailureOutcome,
        kind=st.just("authentication"),
        status=st.none() | st.integers(min_value=400, max_value=599),
        timeout=st.booleans(),
    )
    status_401 = st.builds(FailureOutcome, status=st.just(401))
    bare_401 = st.just(401)
    mapping = st.fixed_dictionaries({"kind": st.just("authentication")})
    return st.one_of(explicit, status_401, bare_401, mapping)


def _timeout_outcomes() -> st.SearchStrategy[Any]:
    """Outcomes that must classify as a deadline/timeout (HTTP 504).

    Note: a 401 takes precedence over a timeout in the classifier, so timeout
    outcomes here never carry an authentication hint or a 401 status.
    """
    flagged = st.builds(
        FailureOutcome,
        kind=st.none(),
        status=st.none() | _NON_AUTH_STATUSES,
        timeout=st.just(True),
    )
    explicit = st.builds(
        FailureOutcome,
        kind=st.just("timeout"),
        status=st.none() | _NON_AUTH_STATUSES,
        timeout=st.booleans(),
    )
    exc = st.builds(TimeoutError)
    mapping = st.fixed_dictionaries({"timeout": st.just(True)})
    return st.one_of(flagged, explicit, exc, mapping)


def _other_outcomes() -> st.SearchStrategy[Any]:
    """Assorted non-auth, non-timeout outcomes (HTTP 502).

    Any upstream failure that is neither an authentication rejection nor a
    timeout: non-401 HTTP statuses, connection-style failures, bare objects.
    """
    non_auth_failure = st.builds(
        FailureOutcome,
        kind=st.none(),
        status=_NON_AUTH_STATUSES,
        timeout=st.just(False),
    )
    bare_status = _NON_AUTH_STATUSES
    empty = st.just(FailureOutcome())
    opaque = st.builds(ValueError)
    mapping = st.fixed_dictionaries({"status": _NON_AUTH_STATUSES})
    return st.one_of(non_auth_failure, bare_status, empty, opaque, mapping)


@settings(max_examples=200)
@given(outcome=_authentication_outcomes(), token=st.text(max_size=64))
def test_authentication_outcomes_map_to_401(outcome: Any, token: str) -> None:
    status, kind, _message = classify_error(outcome, token)
    assert status == 401
    assert kind == "authentication"


@settings(max_examples=200)
@given(outcome=_timeout_outcomes(), token=st.text(max_size=64))
def test_timeout_outcomes_map_to_504(outcome: Any, token: str) -> None:
    status, kind, _message = classify_error(outcome, token)
    assert status == 504
    assert kind == "timeout"


@settings(max_examples=200)
@given(outcome=_other_outcomes(), token=st.text(max_size=64))
def test_other_outcomes_map_to_502(outcome: Any, token: str) -> None:
    status, kind, _message = classify_error(outcome, token)
    assert status == 502
    assert kind == "upstream"
