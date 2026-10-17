"""Smoke tests for the pinned client-generation pipeline (task 2.2).

These assert the single documented regeneration command/config exists and, run
against a valid fixture OpenAPI spec, produces the expected client modules
(models + API operations) end-to-end with no manual edits.

Requirements:
* 6.1 -- the client is produced from the OpenAPI spec via OpenAPI Generator.
* 6.2 -- against a valid spec, generation produces type definitions and
  operations for the endpoints/schemas in that spec.
* 6.5 -- a single documented, repeatable command regenerates the client with no
  manual edits to the generated output.

Generation requires a Java runtime and (on a cold cache) a network download of
the pinned generator JAR. When either is unavailable this environment cannot run
the generator, so the end-to-end test skips with a clear reason rather than
failing. The command/config existence checks always run -- they need neither
Java nor the network.
"""

from __future__ import annotations

import importlib.util
import shutil
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
SCRIPT_PATH = BACKEND_DIR / "scripts" / "generate_client.py"
MAKEFILE_PATH = BACKEND_DIR / "Makefile"
FIXTURE_SPEC = Path(__file__).resolve().parent / "fixtures" / "valid_minimal_openapi.json"


def _load_generator_module():
    """Import scripts/generate_client.py as a module (it is not on the path)."""
    spec = importlib.util.spec_from_file_location("generate_client", SCRIPT_PATH)
    assert spec and spec.loader, "could not build an import spec for the generator"
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# --- Config / command existence (no Java, no network required) ---------------


def test_generation_script_exists():
    """6.1/6.5: the single generation implementation is present and importable."""
    assert SCRIPT_PATH.is_file(), f"missing generator script: {SCRIPT_PATH}"
    module = _load_generator_module()
    assert callable(module.generate), "generate() entry point is missing"
    assert callable(module.main), "main() CLI entry point is missing"


def test_make_target_documents_the_single_command():
    """6.5: exactly one documented `make generate-client` target drives it."""
    makefile = MAKEFILE_PATH.read_text(encoding="utf-8")
    assert "generate-client:" in makefile, "missing `generate-client` make target"
    # The target delegates to the single pinned script -- no manual steps.
    assert "generate_client.py" in makefile


def test_generator_version_is_pinned():
    """6.1/6.5: the generator version is pinned for reproducible output."""
    module = _load_generator_module()
    assert module.OPENAPI_GENERATOR_VERSION == "7.11.0"
    # The python generator is the one the backend client is built from.
    assert module.GENERATOR_NAME == "python"


def test_valid_fixture_spec_exists():
    assert FIXTURE_SPEC.is_file(), f"missing fixture spec: {FIXTURE_SPEC}"


# --- End-to-end generation against the valid fixture --------------------------


def _generation_prerequisites_available(module) -> str | None:
    """Return a skip reason if the generator cannot run here, else None."""
    if shutil.which("java") is None:
        return "Java runtime not available; cannot run openapi-generator-cli."
    jar = module.JAR_PATH
    if not jar.exists():
        # A cold cache needs a network download of the pinned JAR; probe it.
        try:
            import urllib.request

            with urllib.request.urlopen(module.OPENAPI_GENERATOR_JAR_URL, timeout=5):
                pass
        except Exception as exc:  # pragma: no cover - environment dependent
            return f"generator JAR not cached and download unavailable: {exc}"
    return None


def test_valid_spec_generates_expected_client_modules(tmp_path):
    """6.1/6.2/6.5: the documented command, run against a valid fixture spec,
    produces the client with model and API operation modules, end-to-end and
    with no manual edits."""
    module = _load_generator_module()

    skip_reason = _generation_prerequisites_available(module)
    if skip_reason:
        pytest.skip(skip_reason)

    output = tmp_path / "generated"

    # Invoke the single documented entry point exactly as the make target does.
    exit_code = module.generate(spec=str(FIXTURE_SPEC), output_dir=output)
    assert exit_code == 0, "generation against a valid spec must succeed (6.2)"
    assert output.is_dir(), "generator must emit the client into the output dir"

    files = {p.name for p in output.rglob("*.py")}
    all_text = "\n".join(
        p.read_text(encoding="utf-8", errors="ignore")
        for p in output.rglob("*.py")
    )

    # Models: the Agent schema from the fixture must have a generated model.
    model_files = {p for p in output.rglob("*.py") if "models" in p.parts}
    assert model_files, "expected a generated models package (6.2)"
    assert any(
        "class Agent" in p.read_text(encoding="utf-8", errors="ignore")
        for p in model_files
    ), "expected a model type for the Agent schema (6.2)"

    # API operations: the getMyAgent operation from the fixture must exist.
    api_files = {p for p in output.rglob("*.py") if "api" in p.parts}
    assert api_files, "expected a generated api package with operations (6.2)"
    assert "get_my_agent" in all_text, (
        "expected the getMyAgent operation in the generated API (6.2)"
    )

    # Sanity: there is actual generated Python (not an empty tree).
    assert files, "the generated client should contain Python modules"
