"""Unit tests for the location routes (Requirements 7.3, 8.2, 10.2)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app.location_handler as location_handler
from app.main import app

client = TestClient(app)

WAYPOINT = {
    "symbol": "X1-AB-A1",
    "type": "PLANET",
    "systemSymbol": "X1-AB",
    "x": 5,
    "y": -3,
    "orbitals": [{"symbol": "X1-AB-A2"}],
    "faction": {"symbol": "COSMIC"},
    "traits": [{"symbol": "RARE_METAL_DEPOSITS", "name": "Rare Metal", "description": "d"}],
    "modifiers": [],
    "isUnderConstruction": False,
}


def test_list_waypoints_200_body_shape(monkeypatch) -> None:
    calls = []

    def fake(system):
        calls.append(system)
        return [WAYPOINT, {**WAYPOINT, "symbol": "X1-AB-A2", "type": "MOON", "x": 1, "y": 2}]

    monkeypatch.setattr(location_handler, "fetch_system_waypoints", fake)
    r = client.get("/api/systems/X1-AB/waypoints")
    assert r.status_code == 200
    assert calls == ["X1-AB"]
    assert r.json() == {
        "waypoints": [
            {"symbol": "X1-AB-A1", "type": "PLANET", "x": 5, "y": -3},
            {"symbol": "X1-AB-A2", "type": "MOON", "x": 1, "y": 2},
        ]
    }


def test_get_waypoint_200_body_shape(monkeypatch) -> None:
    calls = []

    def fake(system, waypoint):
        calls.append((system, waypoint))
        return WAYPOINT

    monkeypatch.setattr(location_handler, "fetch_waypoint", fake)
    r = client.get("/api/systems/X1-AB/waypoints/X1-AB-A1")
    assert r.status_code == 200
    assert calls == [("X1-AB", "X1-AB-A1")]
    body = r.json()
    assert body["symbol"] == "X1-AB-A1"
    assert body["type"] == "PLANET"
    assert body["systemSymbol"] == "X1-AB"
    assert (body["x"], body["y"]) == (5, -3)
    assert body["orbitals"] == ["X1-AB-A2"]
    assert body["faction"] == "COSMIC"
    assert body["traits"] == [{"symbol": "RARE_METAL_DEPOSITS", "name": "Rare Metal"}]
    assert body["modifiers"] == []
    assert body["isUnderConstruction"] is False


@pytest.mark.parametrize(
    "kind,status",
    [("not_found", 404), ("timeout", 504), ("upstream", 502)],
)
def test_failures_map_to_status_and_envelope(monkeypatch, kind, status) -> None:
    failure = location_handler.WaypointFailure(kind=kind)
    monkeypatch.setattr(location_handler, "fetch_system_waypoints", lambda s: failure)
    monkeypatch.setattr(location_handler, "fetch_waypoint", lambda s, w: failure)
    for url in ("/api/systems/X1-AB/waypoints", "/api/systems/X1-AB/waypoints/X1-AB-A1"):
        r = client.get(url)
        assert r.status_code == status
        assert r.json()["error"]["kind"] == kind
        assert "X1-AB" not in r.json()["error"]["message"]


def test_invalid_path_params_return_422_without_calling_adapter(monkeypatch) -> None:
    def boom(*a):
        raise AssertionError("adapter must not be called")

    monkeypatch.setattr(location_handler, "fetch_system_waypoints", boom)
    monkeypatch.setattr(location_handler, "fetch_waypoint", boom)
    assert client.get("/api/systems/BAD/waypoints").status_code == 422
    assert client.get("/api/systems/X1-AB/waypoints/X1-AB").status_code == 422
