"""Integration tests for the ``POST /api/login`` handler (task 4.4).

These exercise the handler end-to-end through FastAPI's ``TestClient`` with the
SpaceTraders_API / Generated_API_Client mocked at the adapter boundary. They
assert the three behaviors called out by the task:

* The handler configures the generated client with the bearer token and calls
  the agent endpoint (Requirements 2.1, 6.4). This drives the *real* adapter
  (``app.generated_client_adapter.fetch_agent``) against a fake generated client
  package injected into ``sys.modules``, so the actual bearer-credential wiring
  and agent-operation call are verified rather than mocked away.
* A success within the deadline returns ``Agent_Details`` with HTTP 200
  (Requirement 2.2).
* A 10-second deadline exceedance returns HTTP 504 with no ``Agent_Details``
  (Requirement 2.5).

The generated client tree (``app/generated``) is a build artifact produced by
``make generate-client`` and is absent in a fresh checkout, so the bearer/agent
assertion installs a minimal fake package that mimics the openapi-generator
python client surface the adapter talks to (``Configuration`` with an
``access_token`` bearer credential, ``ApiClient``, and an ``AgentsApi`` exposing
``get_my_agent``).
"""

from __future__ import annotations

import sys
import types

import pytest
from fastapi.testclient import TestClient

import app.generated_client_adapter as adapter
import app.login_handler as login_handler
from app.classify_error import FailureOutcome
from app.generated_client_adapter import REQUEST_TIMEOUT_SECONDS
from app.main import app

client = TestClient(app)


# A representative upstream agent payload (the unwrapped ``data`` object).
_AGENT_PAYLOAD = {
    "accountId": "acct-123",
    "symbol": "CMDR-ZERO",
    "headquarters": "X1-ABC-HQ",
    "credits": 150_000,
    "startingFaction": "COSMIC",
    "shipCount": 2,
}


# --- 2.2: success within the deadline -> 200 Agent_Details -------------------


def test_success_within_deadline_returns_agent_details_200(monkeypatch):
    """Requirement 2.2: a successful upstream call returns the mapped
    ``Agent_Details`` with HTTP 200."""

    def fake_fetch_agent(token: str):
        assert token == "valid-token"
        return dict(_AGENT_PAYLOAD)

    monkeypatch.setattr(login_handler, "fetch_agent", fake_fetch_agent)

    response = client.post("/api/login", json={"token": "valid-token"})

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "accountId": "acct-123",
        "symbol": "CMDR-ZERO",
        "headquarters": "X1-ABC-HQ",
        "credits": 150_000,
        "startingFaction": "COSMIC",
        "shipCount": 2,
    }
    # A success body is Agent_Details, never an error envelope.
    assert "error" not in body


def test_success_floors_ship_count_and_preserves_nulls(monkeypatch):
    """Requirement 2.2 (with 2.3/2.4 mapping): the 200 body carries the mapped
    agent, flooring a negative ship count at 0 and preserving null fields."""

    def fake_fetch_agent(token: str):
        return {
            "accountId": None,
            "symbol": "SOLO",
            "headquarters": None,
            "credits": None,
            "startingFaction": None,
            "shipCount": -5,
        }

    monkeypatch.setattr(login_handler, "fetch_agent", fake_fetch_agent)

    response = client.post("/api/login", json={"token": "t"})

    assert response.status_code == 200
    body = response.json()
    assert body["symbol"] == "SOLO"
    assert body["accountId"] is None
    assert body["headquarters"] is None
    assert body["credits"] is None
    assert body["startingFaction"] is None
    assert body["shipCount"] == 0


# --- 2.5: 10s deadline exceeded -> 504, no Agent_Details ---------------------


def test_deadline_exceeded_returns_504_without_agent_details(monkeypatch):
    """Requirement 2.5: when the upstream deadline is exceeded the handler
    returns HTTP 504 and no ``Agent_Details``."""

    def fake_fetch_agent(token: str):
        return FailureOutcome(kind="timeout", timeout=True)

    monkeypatch.setattr(login_handler, "fetch_agent", fake_fetch_agent)

    response = client.post("/api/login", json={"token": "slow-token"})

    assert response.status_code == 504
    body = response.json()
    # Error envelope only -- never any Agent_Details fields.
    assert body["error"]["kind"] == "timeout"
    assert "shipCount" not in body
    assert "accountId" not in body
    assert "symbol" not in body
    # The token must never appear in the error body (defense-in-depth).
    assert "slow-token" not in response.text


# --- 2.1 / 6.4: configure the bearer token and call the agent endpoint -------


class _FakeConfiguration:
    """Stand-in for the generated client's ``Configuration`` object.

    Records the bearer credential (``access_token``) the adapter configures per
    request so the test can assert the token wiring (Requirement 2.1).
    """

    instances: list["_FakeConfiguration"] = []

    def __init__(self, access_token=None):
        self.access_token = access_token
        _FakeConfiguration.instances.append(self)


class _FakeApiClient:
    """Stand-in for the generated ``ApiClient`` wrapping a configuration."""

    def __init__(self, configuration):
        self.configuration = configuration
        self.closed = False

    def close(self):
        self.closed = True


class _FakeAgentsApi:
    """Stand-in for the generated ``AgentsApi`` exposing ``get_my_agent``.

    Records every call and the per-call ``_request_timeout`` so the test can
    assert both that the agent endpoint was invoked (Requirements 2.1, 6.4) and
    that the 10-second deadline was supplied (Requirement 2.5 wiring).
    """

    calls: list[dict] = []

    def __init__(self, api_client):
        self.api_client = api_client

    def get_my_agent(self, _request_timeout=None):
        _FakeAgentsApi.calls.append(
            {
                "api_client": self.api_client,
                "request_timeout": _request_timeout,
            }
        )
        # The generated response is an envelope ``{ "data": { ...agent } }``.
        return {"data": dict(_AGENT_PAYLOAD)}


@pytest.fixture
def fake_generated_client(monkeypatch):
    """Install a fake generated client package the real adapter imports.

    The adapter imports ``app.generated.spacetraders_client`` lazily; we inject a
    module with the ``Configuration`` / ``ApiClient`` / ``AgentsApi`` surface it
    expects so the real wiring runs without the build artifact being present.
    """
    _FakeConfiguration.instances.clear()
    _FakeAgentsApi.calls.clear()

    fake_pkg = types.ModuleType(adapter._GENERATED_PACKAGE)
    fake_pkg.Configuration = _FakeConfiguration
    fake_pkg.ApiClient = _FakeApiClient
    fake_pkg.AgentsApi = _FakeAgentsApi

    monkeypatch.setitem(sys.modules, adapter._GENERATED_PACKAGE, fake_pkg)
    yield
    _FakeConfiguration.instances.clear()
    _FakeAgentsApi.calls.clear()


def test_handler_configures_bearer_token_and_calls_agent_endpoint(
    fake_generated_client,
):
    """Requirements 2.1, 6.4: the handler, through the real adapter, configures
    the generated client with the bearer token and calls the agent endpoint."""
    token = "bearer-token-xyz"

    response = client.post("/api/login", json={"token": token})

    # End-to-end the request succeeds and returns the mapped agent (2.1 -> 2.2).
    assert response.status_code == 200
    assert response.json()["symbol"] == "CMDR-ZERO"

    # The generated client was configured with the token as the bearer credential.
    assert _FakeConfiguration.instances, "a Configuration must be built per request"
    assert any(
        cfg.access_token == token for cfg in _FakeConfiguration.instances
    ), "the bearer token must be set as the generated client's access_token"

    # The agent endpoint (get_my_agent) was invoked exactly once...
    assert len(_FakeAgentsApi.calls) == 1, "the agent endpoint must be called once"
    # ...under the 10-second upstream deadline (2.5 wiring, backend owns it).
    assert _FakeAgentsApi.calls[0]["request_timeout"] == REQUEST_TIMEOUT_SECONDS


def test_fresh_configuration_per_request(fake_generated_client):
    """Requirement 2.1: a fresh client configuration is built for each request
    so no token is retained between calls."""
    client.post("/api/login", json={"token": "token-A"})
    client.post("/api/login", json={"token": "token-B"})

    tokens = [cfg.access_token for cfg in _FakeConfiguration.instances]
    assert tokens == ["token-A", "token-B"]
    assert len(_FakeAgentsApi.calls) == 2
