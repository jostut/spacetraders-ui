"""Unit tests for the ``/health/spacetraders`` route and its adapter (task 1.4).

* The route calls the adapter exactly once per request (Requirement 1.1).
* The adapter builds the generated ``Configuration`` without an
  ``access_token`` and calls ``GlobalApi.get_status`` (Requirements 1.1, 1.5).
"""

from __future__ import annotations

import types

from fastapi.testclient import TestClient

import app.generated_client_adapter as generated_adapter
import app.health_handler as health_handler
import app.spacetraders_status_adapter as status_adapter
from app.main import app
from app.spacetraders_status_adapter import StatusOutcome

client = TestClient(app)


def test_route_calls_adapter_exactly_once_per_request(monkeypatch):
    calls = []

    def fake_fetch_status():
        calls.append(1)
        return StatusOutcome(ok=True)

    monkeypatch.setattr(health_handler, "fetch_status", fake_fetch_status)

    assert client.get("/health/spacetraders").status_code == 200
    assert len(calls) == 1

    assert client.get("/health/spacetraders").status_code == 200
    assert len(calls) == 2


def _install_fake_client(monkeypatch):
    record = {"config_kwargs": None, "config": None, "get_status_kwargs": None}

    class Configuration:
        def __init__(self, *args, **kwargs):
            record["config_kwargs"] = (args, kwargs)
            record["config"] = self

    class ApiClient:
        def __init__(self, configuration):
            self.configuration = configuration

    class GlobalApi:
        def __init__(self, api_client):
            self.api_client = api_client

        def get_status(self, **kwargs):
            record["get_status_kwargs"] = kwargs
            return object()

    pkg = types.SimpleNamespace(
        Configuration=Configuration, ApiClient=ApiClient, GlobalApi=GlobalApi
    )
    monkeypatch.setattr(status_adapter, "_import_generated", lambda: pkg)
    monkeypatch.setattr(status_adapter, "_close", lambda api_client: None)
    return record


def test_adapter_builds_config_without_access_token_and_calls_get_status(monkeypatch):
    record = _install_fake_client(monkeypatch)

    outcome = status_adapter.fetch_status()

    assert outcome == StatusOutcome(ok=True)
    assert record["config_kwargs"] == ((), {})
    assert getattr(record["config"], "access_token", None) is None
    assert record["get_status_kwargs"] == {
        "_request_timeout": status_adapter.REQUEST_TIMEOUT_SECONDS
    }


def test_adapter_returns_not_ok_when_generated_client_unavailable(monkeypatch):
    def raise_unavailable():
        raise generated_adapter.GeneratedClientUnavailable("missing")

    monkeypatch.setattr(status_adapter, "_import_generated", raise_unavailable)

    assert status_adapter.fetch_status() == StatusOutcome(ok=False)
