"""Shared data shapes for the agent-login backend.

These models define the stable request/response contract between the Web_Client
and the Backend_Service. See design.md -> Data Models.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Body of ``POST /api/login``: a single trimmed SpaceTraders token."""

    token: str


class AgentDetails(BaseModel):
    """Compact agent shape returned on a successful login (HTTP 200)."""

    accountId: Optional[str] = None
    symbol: Optional[str] = None
    headquarters: Optional[str] = None
    credits: Optional[int] = None
    startingFaction: Optional[str] = None
    shipCount: int = 0  # always >= 0


ErrorKind = Literal["authentication", "timeout", "upstream"]


class ErrorBody(BaseModel):
    """Inner error object of the backend error envelope."""

    kind: ErrorKind
    message: str


class ErrorEnvelope(BaseModel):
    """Error response shape: ``{ "error": { "kind", "message" } }``."""

    error: ErrorBody
