"""Property test for the backend side of the failure form-restoration contract.

Feature: agent-login, Property 8: Any failure restores a usable form

Property 8 in full: *For any* failure outcome, after the Login_Request settles
the loading indicator is cleared and the submit control is re-enabled for any
non-empty token. The primary test for that user-facing behavior lives on the
frontend (task 7.3).

This is the **backend portion**: for the frontend to clear loading and re-enable
submit, every backend failure must resolve to a *classified, actionable* error
response the frontend can map to a message. ``classify_error`` is the single
choke point every non-200 path flows through, so this test asserts that for any
failure outcome it always produces:

* an HTTP status in ``{401, 502, 504}`` -- the exact set the frontend's
  ``classifyResponse`` knows how to act on (401 -> token-invalid,
  502/504 -> could-not-retrieve), and
* a kind in ``{authentication, timeout, upstream}``, and
* a non-empty, human-readable message.

If any failure instead resolved to an unclassified / 200 / empty response, the
frontend could not reliably clear loading and surface a usable form -- so this
guarantee is what the frontend contract rests on.

**Validates: Requirements 4.6**
"""

from __future__ import annotations

from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from app.classify_error import FailureOutcome, classify_error

# The complete, closed set of classified outcomes the frontend can act on.
_ACTIONABLE_STATUSES = {401, 502, 504}
_ACTIONABLE_KINDS = {"authentication", "timeout", "upstream"}

# A broad alphabet so generated tokens can embed in free-form detail slots.
_TOKEN_ALPHABET = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789-_.~+/="
)


def _any_failure_outcome(token: str) -> st.SearchStrategy[Any]:
    """Any shape a failure can arrive in, spanning every classification path.

    Covers normalized :class:`FailureOutcome` signals (authentication, timeout,
    and assorted other upstream failures), bare HTTP status codes, mapping-style
    outcomes, and arbitrary failure/exception objects -- including ones whose
    free-form detail embeds the token. The classifier is total over all of
    these, so each must still land on a classified, actionable response.
    """
    details = st.one_of(
        st.none(),
        st.just(token),
        st.builds(lambda t: f"upstream said: {t}", st.just(token)),
        st.text(max_size=32),
    )
    normalized = st.builds(
        FailureOutcome,
        kind=st.sampled_from([None, "authentication", "timeout", "other", "weird"]),
        status=st.sampled_from([None, 400, 401, 403, 404, 418, 429, 500, 502, 503, 504]),
        timeout=st.booleans(),
        detail=details,
    )
    bare_status = st.sampled_from([401, 403, 404, 418, 429, 500, 502, 503, 504])
    mappings = st.fixed_dictionaries(
        {
            "kind": st.sampled_from([None, "authentication", "timeout", "other"]),
            "status": st.sampled_from([None, 401, 500, 502, 504]),
            "timeout": st.booleans(),
            "detail": details,
        }
    )
    exceptions = st.one_of(
        st.builds(TimeoutError, details),
        st.builds(ValueError, details),
        st.builds(RuntimeError, details),
        st.builds(ConnectionError, details),
    )
    empty = st.just(FailureOutcome())
    return st.one_of(normalized, bare_status, mappings, exceptions, empty)


@settings(max_examples=200)
@given(data=st.data())
def test_any_failure_resolves_to_an_actionable_classified_error(data) -> None:
    token = data.draw(st.text(alphabet=_TOKEN_ALPHABET, max_size=128))
    outcome = data.draw(_any_failure_outcome(token))

    status, kind, message = classify_error(outcome, token)

    # The frontend can only clear loading + restore the form if the backend
    # resolved the failure to one of the statuses/kinds it knows how to act on.
    assert status in _ACTIONABLE_STATUSES, (
        f"failure resolved to a non-actionable status {status!r} "
        f"(kind={kind!r}); frontend cannot restore a usable form"
    )
    assert kind in _ACTIONABLE_KINDS, (
        f"failure resolved to an unknown kind {kind!r} (status={status})"
    )

    # The status and kind must agree so the frontend's mapping stays consistent.
    expected_status = {"authentication": 401, "timeout": 504, "upstream": 502}[kind]
    assert status == expected_status, (
        f"status {status} does not match kind {kind!r} "
        f"(expected {expected_status})"
    )

    # A non-empty, human-readable message is required for the frontend to show
    # an actionable error rather than a blank banner.
    assert isinstance(message, str)
    assert message.strip() != ""
