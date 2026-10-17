"""Property-based tests for ``map_agent``.

Feature: agent-login, Property 4: Agent mapping preserves fields and floors ship count

Validates: Requirements 2.3, 2.4
"""

from __future__ import annotations

from typing import Any, Dict

from hypothesis import given, settings
from hypothesis import strategies as st

from app.map_agent import map_agent

# Fields that map_agent copies through exactly, preserving null/absent as None.
PRESERVED_FIELDS = ("accountId", "symbol", "headquarters", "credits", "startingFaction")

# Optional string-ish values: present strings or explicit None (null).
_optional_strings = st.one_of(st.none(), st.text())
# Optional integer-ish values (used for credits): present ints or explicit None.
_optional_ints = st.one_of(st.none(), st.integers())


@st.composite
def agent_payloads(draw: st.DrawFn) -> Dict[str, Any]:
    """Build upstream agent payloads with optional/null fields and arbitrary
    (including negative and absent) ship counts.

    Each preserved field is independently either present (possibly null) or
    omitted entirely, exercising both the null-value and absent-key paths.
    ``shipCount`` is likewise present with an arbitrary integer (which may be
    negative) or omitted.
    """
    payload: Dict[str, Any] = {}

    for field in ("accountId", "symbol", "headquarters", "startingFaction"):
        if draw(st.booleans()):
            payload[field] = draw(_optional_strings)

    if draw(st.booleans()):
        payload["credits"] = draw(_optional_ints)

    if draw(st.booleans()):
        payload["shipCount"] = draw(st.integers())

    return payload


@settings(max_examples=200)
@given(payload=agent_payloads())
def test_map_agent_preserves_fields_and_floors_ship_count(payload: Dict[str, Any]) -> None:
    """Feature: agent-login, Property 4: Agent mapping preserves fields and floors ship count

    For any upstream agent payload, ``map_agent`` preserves ``accountId``,
    ``symbol``, ``headquarters``, ``credits`` and ``startingFaction`` exactly
    (including null values) and produces ``shipCount = max(0, reportedShipCount)``.

    Validates: Requirements 2.3, 2.4
    """
    result = map_agent(payload)

    # Preserved fields match the payload exactly, treating an absent key as
    # None (the mapping copies null-preserving).
    for field in PRESERVED_FIELDS:
        expected = payload.get(field)
        assert getattr(result, field) == expected

    # shipCount is floored at zero and equals max(0, reported); an absent or
    # null reported count is treated as 0.
    reported = payload.get("shipCount")
    expected_ship_count = 0 if reported is None else max(0, reported)
    assert result.shipCount == expected_ship_count
    assert result.shipCount >= 0
