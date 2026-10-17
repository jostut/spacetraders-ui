"""FastAPI application entry point for the agent-login backend.

Creates the app, wires the login router, and exposes a health check so the
scaffold runs and serves routes before the handler is implemented (task 4.2).
"""

from __future__ import annotations

from fastapi import FastAPI

from app.login_handler import router as login_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="SpaceTraders Agent Login Backend",
        version="0.1.0",
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(login_router)
    return app


app = create_app()
