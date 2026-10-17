"""Pure mapping from an upstream agent payload to ``Agent_Details``.

Copies ``accountId``, ``symbol``, ``headquarters``, ``credits`` and
``startingFaction`` null-preserving and sets ``shipCount = max(0, reported)``.
See design.md -> "map_agent" and Correctness Property 4.
"""

from __future__ import annotations

from typing import Any, Mapping

from app.models import AgentDetails


def map_agent(upstream: Mapping[str, Any]) -> AgentDetails:
    """Map an upstream SpaceTraders agent payload to ``Agent_Details``.

    The ``accountId``, ``symbol``, ``headquarters``, ``credits`` and
    ``startingFaction`` fields are copied through exactly, preserving ``None``
    for absent or null values. ``shipCount`` is floored at zero so it is never
    negative (Requirements 2.3, 2.4).
    """
    reported_ship_count = upstream.get("shipCount")
    ship_count = 0 if reported_ship_count is None else int(reported_ship_count)

    return AgentDetails(
        accountId=upstream.get("accountId"),
        symbol=upstream.get("symbol"),
        headquarters=upstream.get("headquarters"),
        credits=upstream.get("credits"),
        startingFaction=upstream.get("startingFaction"),
        shipCount=max(0, ship_count),
    )
