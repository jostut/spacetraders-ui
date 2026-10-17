"""Property test for token redaction in backend error responses.

Feature: agent-login, Property 7: Error responses never contain the token

For any token and any failure outcome, the serialized backend error response
does not contain the token as a substring. ``classify_error`` is the single
choke point for every non-200 path; its ``(status, kind, message)`` triple is
serialized into the on-the-wire error envelope
(``{ "error": { "kind", "message" } }``). This test asserts the token never
survives into that serialized body.

**Validates: Requirements 4.1, 4.2**
"""

from __future__ import annotations

from hypothesis import given, settings
from hypothesis import strategies as st

from app.classify_error import FailureOutcome, classify_error
from app.models import ErrorBody, ErrorEnvelope

# Arbitrary tokens drawn from a realistic SpaceTraders token alphabet. The
# alphabet deliberately excludes JSON structural characters ({ } [ ] " : ,)
# because those appear in any serialized envelope as syntax regardless of
# redaction -- a token of literally "{" would "appear" in {"error":...} and
# say nothing about whether the classifier leaked it. Real tokens are long,
# URL-safe strings, so this still covers the worst case where a token embeds
# verbatim in message text.
#
# ``min_size`` is 8: a credential-like minimum that keeps the token from being
# a one- or two-character fragment that incidentally occurs inside the fixed,
# token-free English of a message (e.g. a lone "d" lives inside "SpaceTraders").
# Such a collision is a quirk of the message wording, not a token leak; the
# property is about credential-shaped tokens, which real SpaceTraders tokens
# always are.
_TOKEN_ALPHABET = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789-_.~+/="
)
tokens = st.text(alphabet=_TOKEN_ALPHABET, min_size=8, max_size=128)


def _failure_outcomes(token: str) -> st.SearchStrategy[object]:
    """Failure outcomes spanning every classification path.

    The token is deliberately threaded into free-form ``detail``/message slots
    (and sometimes the explicit kind/status) so the generated outcome is a
    realistic worst case where the token *could* leak into the response unless
    it is scrubbed.
    """
    # Detail/message fields that may embed the raw token.
    details = st.one_of(
        st.none(),
        st.just(token),
        st.builds(lambda t: f"upstream said: {t}", st.just(token)),
        st.text(max_size=32),
    )

    normalized = st.builds(
        FailureOutcome,
        kind=st.sampled_from([None, "authentication", "timeout", "other"]),
        status=st.sampled_from([None, 401, 500, 502, 503, 504, 418]),
        timeout=st.booleans(),
        detail=details,
    )
    bare_status = st.sampled_from([401, 403, 404, 418, 500, 502, 503, 504])
    mappings = st.fixed_dictionaries(
        {
            "kind": st.sampled_from([None, "authentication", "timeout"]),
            "status": st.sampled_from([None, 401, 500, 502, 504]),
            "timeout": st.booleans(),
            "detail": details,
        }
    )
    exceptions = st.one_of(
        st.builds(TimeoutError, st.just(token)),
        st.builds(ValueError, st.just(token)),
        st.builds(RuntimeError, details),
    )
    return st.one_of(normalized, bare_status, mappings, exceptions)


@settings(max_examples=200)
@given(data=st.data())
def test_serialized_error_response_never_contains_token(data) -> None:
    token = data.draw(tokens)
    outcome = data.draw(_failure_outcomes(token))

    http_status, kind, message = classify_error(outcome, token)

    # Serialize exactly as the handler would put it on the wire.
    envelope = ErrorEnvelope(error=ErrorBody(kind=kind, message=message))
    serialized = envelope.model_dump_json()

    assert token not in serialized, (
        f"token leaked into serialized error response: {serialized!r} "
        f"(status={http_status}, kind={kind})"
    )
    # Sanity: the message itself (the only free-form field) is also clean.
    assert token not in message
