"""Pure mapping from generated Waypoint ``to_dict()`` output to backend models.

No dependency on generated types. See design.md -> map_waypoint.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Mapping, Optional

from app.models import NamedEntry, WaypointDetail, WaypointSummary


def _value(v: Any) -> Any:
    """Return the string value of an enum, or the value itself."""
    return v.value if isinstance(v, Enum) else v


def _symbol(v: Any) -> Optional[str]:
    """Extract a symbol from a ``{symbol: ...}`` mapping or a bare value."""
    if v is None:
        return None
    if isinstance(v, Mapping):
        v = v.get("symbol")
        if v is None:
            return None
    return _value(v)


def _named(items: Any) -> list[NamedEntry]:
    return [
        NamedEntry(symbol=_symbol(i.get("symbol")), name=i.get("name"))
        for i in (items or [])
    ]


def map_waypoint_summary(waypoint: Mapping) -> WaypointSummary:
    return WaypointSummary(
        symbol=waypoint["symbol"],
        type=_value(waypoint["type"]),
        x=waypoint["x"],
        y=waypoint["y"],
    )


def map_waypoint_detail(waypoint: Mapping) -> WaypointDetail:
    return WaypointDetail(
        symbol=waypoint["symbol"],
        type=_value(waypoint["type"]),
        systemSymbol=waypoint["systemSymbol"],
        x=waypoint["x"],
        y=waypoint["y"],
        orbits=waypoint.get("orbits"),
        orbitals=[_symbol(o) for o in (waypoint.get("orbitals") or [])],
        faction=_symbol(waypoint.get("faction")),
        traits=_named(waypoint.get("traits")),
        modifiers=_named(waypoint.get("modifiers")),
        isUnderConstruction=bool(waypoint.get("isUnderConstruction", False)),
    )
