"""Smoke test for backend statelessness (Requirements 5.1, 5.2).

The backend is deliberately stateless: when it processes a Login_Request it must
not write the Agent_Token or the Agent_Details to anything that persists past
the request -- not disk files, databases, caches, or log output (design.md ->
"Thin, stateless backend endpoint", Requirements 5.1 and 5.2).

This smoke test drives a real login through the FastAPI ``TestClient`` with the
upstream call stubbed (``fetch_agent`` patched to return a success agent
payload), while spying on the two durable sinks that exist in this process:

* **Logging** -- a capturing handler is attached to the *root* logger (so it
  sees records from every module, propagated or not) and ``caplog`` is used as a
  second, independent capture. The test asserts that neither the token nor any
  agent field value appears in any emitted log record.
* **Filesystem** -- the test runs inside a fresh temp working directory and
  wraps ``builtins.open`` to record every write-mode open. It asserts no
  write-mode file open happens during the request and that no files are created
  in the temp cwd. (The backend has no DB/cache/file store, so "no write-mode
  file open" is the complete statelessness check for durable storage here.)
"""

from __future__ import annotations

import builtins
import logging
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app.login_handler as login_handler
from app.main import app

# A representative, credential-shaped token and a success agent payload. The
# values are distinctive strings/numbers so a substring search for them in log
# output is meaningful (no incidental collisions with framework log text).
TOKEN = "SECRET-TOKEN-abcdef0123456789-DO-NOT-LOG-ME"
AGENT_PAYLOAD = {
    "accountId": "acct-DISTINCTIVE-9f3a",
    "symbol": "CALLSIGN-ZZTOP-7",
    "headquarters": "X1-HQ-SECRET-SYSTEM",
    "credits": 123456789,
    "startingFaction": "COSMIC-FACTION-UNIQUE",
    "shipCount": 3,
}

# The agent field values we must never see written to a durable sink. Numbers
# are included as their string form (how they would appear in serialized output
# or a log line).
_AGENT_SENSITIVE_VALUES = [
    AGENT_PAYLOAD["accountId"],
    AGENT_PAYLOAD["symbol"],
    AGENT_PAYLOAD["headquarters"],
    str(AGENT_PAYLOAD["credits"]),
    AGENT_PAYLOAD["startingFaction"],
]


class _CapturingHandler(logging.Handler):
    """Root-logger handler that retains every formatted record it receives."""

    def __init__(self) -> None:
        super().__init__(level=logging.NOTSET)
        self.messages: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        # Capture both the raw message and the fully formatted record so a
        # token embedded via %-args or exc_info is still detected.
        self.messages.append(record.getMessage())
        try:
            self.messages.append(self.format(record))
        except Exception:  # pragma: no cover - formatting must not break capture
            pass


@pytest.fixture
def root_log_capture():
    """Attach a capturing handler to the root logger at DEBUG for the test."""
    handler = _CapturingHandler()
    root = logging.getLogger()
    previous_level = root.level
    root.addHandler(handler)
    root.setLevel(logging.DEBUG)
    try:
        yield handler
    finally:
        root.removeHandler(handler)
        root.setLevel(previous_level)


@pytest.fixture
def write_open_spy(monkeypatch):
    """Wrap ``builtins.open`` to record every write-mode open.

    Returns the list of ``(path, mode)`` tuples opened for writing/appending
    during the test. Read-only opens (imports, resource loads) are ignored.
    """
    real_open = builtins.open
    write_opens: list[tuple[str, str]] = []

    def spy_open(file, mode="r", *args, **kwargs):  # noqa: A002 - shadow builtin name
        if any(flag in mode for flag in ("w", "a", "x", "+")):
            write_opens.append((str(file), mode))
        return real_open(file, mode, *args, **kwargs)

    monkeypatch.setattr(builtins, "open", spy_open)
    return write_opens


def test_login_writes_no_token_or_agent_data_to_durable_sinks(
    tmp_path: Path,
    monkeypatch,
    root_log_capture: _CapturingHandler,
    write_open_spy: list[tuple[str, str]],
    caplog,
) -> None:
    """A processed login must not persist the token or agent data anywhere.

    Validates Requirements 5.1 (no token persisted to disk/db/cache/logs) and
    5.2 (no agent data persisted to disk/db/cache/logs).
    """
    # Run inside a fresh, empty working directory so any stray file write is
    # detectable as a new entry in the directory.
    monkeypatch.chdir(tmp_path)

    # Stub the upstream call so no real network happens: a successful login that
    # yields the distinctive agent payload. Patch at the handler's import site.
    def fake_fetch_agent(token: str):
        assert token == TOKEN  # the handler forwards the trimmed token verbatim
        return dict(AGENT_PAYLOAD)

    monkeypatch.setattr(login_handler, "fetch_agent", fake_fetch_agent)

    client = TestClient(app)

    with caplog.at_level(logging.DEBUG):
        response = client.post("/api/login", json={"token": TOKEN})

    # Sanity: the login actually succeeded and returned the mapped agent, so the
    # statelessness assertions below are checking a real, exercised code path.
    assert response.status_code == 200
    body = response.json()
    assert body["accountId"] == AGENT_PAYLOAD["accountId"]
    assert body["symbol"] == AGENT_PAYLOAD["symbol"]
    assert body["shipCount"] == AGENT_PAYLOAD["shipCount"]

    # --- Logging assertions (Requirements 5.1, 5.2) -------------------------
    captured_log_text = "\n".join(
        root_log_capture.messages
        + [rec.getMessage() for rec in caplog.records]
        + [caplog.text]
    )

    assert TOKEN not in captured_log_text, "the token leaked into log output"
    for value in _AGENT_SENSITIVE_VALUES:
        assert value not in captured_log_text, (
            f"agent field value leaked into log output: {value!r}"
        )

    # --- Filesystem assertions (Requirements 5.1, 5.2) ----------------------
    assert write_open_spy == [], (
        f"the handler performed write-mode file opens: {write_open_spy!r}"
    )
    created = list(Path(tmp_path).iterdir())
    assert created == [], (
        f"the handler created files in the working directory: {created!r}"
    )

    # The backend holds no module-level token/agent cache: the only reference to
    # the token lived in the handler's local request scope and is already gone.
    assert os.listdir(tmp_path) == []
