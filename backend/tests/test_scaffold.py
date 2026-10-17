"""Scaffold smoke tests.

Verify the project imports, the FastAPI app boots and serves its routes, and the
placeholder modules expose stable import paths for later tasks. These do not
exercise the unimplemented business logic.
"""

from fastapi.testclient import TestClient

from app.main import app


def test_app_serves_health_route():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_route_is_registered():
    routes = {getattr(r, "path", None) for r in app.routes}
    assert "/api/login" in routes


def test_placeholder_import_paths_are_stable():
    # These imports must not raise; later tasks fill in the bodies.
    from app.classify_error import classify_error
    from app.generated_client_adapter import fetch_agent
    from app.login_handler import router
    from app.map_agent import map_agent
    from app.models import AgentDetails, LoginRequest

    assert callable(classify_error)
    assert callable(fetch_agent)
    assert callable(map_agent)
    assert router is not None
    assert AgentDetails is not None
    assert LoginRequest is not None
