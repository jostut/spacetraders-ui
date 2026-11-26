"""Unit tests for the waypoint adapter (task 2.3).

Requirements 7.1, 7.5, 8.1, 8.4: no ``access_token``, missing generated client
maps to an upstream failure, and any page failing fails the whole request.
"""

from __future__ import annotations

import types

import pytest

import app.generated_client_adapter as generated_adapter
import app.spacetraders_waypoint_adapter as adapter
from app.spacetraders_waypoint_adapter import WaypointFailure


class _Model:
    def __init__(self, symbol):
        self.symbol = symbol

    def to_dict(self):
        return {"symbol": self.symbol}


def _install_fake_client(monkeypatch, *, total=45, fail_on_page=None, exc=None):
    record = {"config_kwargs": None, "config": None, "pages": [], "closed": 0}

    class Configuration:
        def __init__(self, *args, **kwargs):
            record["config_kwargs"] = (args, kwargs)
            record["config"] = self

    class ApiClient:
        def __init__(self, configuration):
            self.configuration = configuration

    class SystemsApi:
        def __init__(self, api_client):
            self.api_client = api_client

        def get_system_waypoints(self, system_symbol, page, limit, **kwargs):
            record["pages"].append(page)
            if page == fail_on_page:
                raise exc or RuntimeError("boom")
            data = [_Model(f"W-{page}-{i}") for i in range(2)]
            meta = types.SimpleNamespace(total=total)
            return types.SimpleNamespace(data=data, meta=meta)

    pkg = types.SimpleNamespace(
        Configuration=Configuration, ApiClient=ApiClient, SystemsApi=SystemsApi
    )
    monkeypatch.setattr(adapter, "_import_generated", lambda: pkg)

    def close(api_client):
        record["closed"] += 1

    monkeypatch.setattr(adapter, "_close", close)
    return record


def test_configuration_built_without_access_token(monkeypatch):
    record = _install_fake_client(monkeypatch)

    result = adapter.fetch_system_waypoints("X1-AB")

    assert isinstance(result, list)
    assert record["config_kwargs"] == ((), {})
    assert getattr(record["config"], "access_token", None) is None
    assert record["closed"] == 1


@pytest.mark.parametrize(
    "call",
    [
        lambda: adapter.fetch_system_waypoints("X1-AB"),
        lambda: adapter.fetch_waypoint("X1-AB", "X1-AB-C1"),
    ],
)
def test_missing_generated_client_returns_upstream_failure(monkeypatch, call):
    def raise_unavailable():
        raise generated_adapter.GeneratedClientUnavailable("missing")

    monkeypatch.setattr(adapter, "_import_generated", raise_unavailable)

    assert call() == WaypointFailure(kind="upstream")


@pytest.mark.parametrize("fail_page", [1, 2, 3])
def test_failure_on_any_page_fails_whole_request(monkeypatch, fail_page):
    record = _install_fake_client(monkeypatch, total=45, fail_on_page=fail_page)

    result = adapter.fetch_system_waypoints("X1-AB")

    assert result == WaypointFailure(kind="upstream")
    assert record["closed"] == 1
    assert record["pages"][-1] == fail_page


def test_all_pages_fetched_and_combined_on_success(monkeypatch):
    record = _install_fake_client(monkeypatch, total=45)

    result = adapter.fetch_system_waypoints("X1-AB")

    assert record["pages"] == [1, 2, 3]
    assert len(result) == 6
