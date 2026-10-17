"""Integration test for malformed / invalid-spec abort behavior (Task 2.3).

Requirement 6.3: when the generation command runs against a spec that is
malformed or fails schema validation, the system aborts generation WITHOUT
overwriting the existing Generated_API_Client and emits an error indicating the
specification is invalid.

These tests drive the real generator script (``backend/scripts/generate_client.py``)
as a subprocess -- the same entry point behind ``make generate-client`` -- and
assert the three externally observable abort guarantees:

1. a non-zero exit status,
2. the pre-existing generated client (its output directory) is left untouched,
3. an ``invalid-spec`` error is emitted on stderr.

A non-existent / unreadable local spec path is rejected by the script before the
JVM-based generator ever runs (``InvalidSpecError`` -> exit 1, ``invalid-spec:``
on stderr), so the key abort assertions are verified without requiring Java to
be installed. A second case feeds a structurally malformed spec file; it needs
the generator (and thus Java) to perform schema validation, so it is skipped
when ``java`` is unavailable.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

# backend/tests/ -> backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent
GENERATOR = BACKEND_DIR / "scripts" / "generate_client.py"

# A sentinel file we drop into a fake "existing client" directory. If the
# generator wrongly touched the output on an invalid spec, this content would be
# gone -- so its survival proves the existing client was not overwritten.
SENTINEL_NAME = "existing_client_marker.py"
SENTINEL_CONTENT = "# pre-existing generated client -- must survive an invalid-spec abort\n"


def _seed_existing_client(output_dir: Path) -> Path:
    """Create a stand-in for an already-generated client with a sentinel file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    sentinel = output_dir / SENTINEL_NAME
    sentinel.write_text(SENTINEL_CONTENT, encoding="utf-8")
    return sentinel


def _run_generator(spec: Path | str, output_dir: Path) -> subprocess.CompletedProcess:
    """Invoke the real generator script exactly as the make target would."""
    return subprocess.run(
        [
            sys.executable,
            str(GENERATOR),
            "--spec",
            str(spec),
            "--output",
            str(output_dir),
        ],
        capture_output=True,
        text=True,
        cwd=str(BACKEND_DIR),
    )


def test_nonexistent_spec_aborts_without_overwriting(tmp_path: Path):
    """A missing local spec path aborts non-zero, emits invalid-spec, no overwrite.

    This path is handled before the generator (and Java) runs, so it exercises
    the abort guarantees of Requirement 6.3 on any machine.
    """
    output_dir = tmp_path / "generated"
    sentinel = _seed_existing_client(output_dir)
    missing_spec = tmp_path / "does-not-exist.json"
    assert not missing_spec.exists()

    result = _run_generator(missing_spec, output_dir)

    # 1. Non-zero exit status.
    assert result.returncode != 0, (
        f"expected a non-zero exit for an invalid spec, got {result.returncode}; "
        f"stderr={result.stderr!r}"
    )

    # 3. An invalid-spec error is emitted (on stderr).
    assert "invalid-spec" in result.stderr, (
        f"expected an 'invalid-spec' error on stderr, got stderr={result.stderr!r}"
    )

    # 2. The pre-existing client is left untouched.
    assert sentinel.exists(), "the pre-existing generated client was removed"
    assert sentinel.read_text(encoding="utf-8") == SENTINEL_CONTENT, (
        "the pre-existing generated client was overwritten"
    )
    # Nothing else should have been swapped into place.
    assert {p.name for p in output_dir.iterdir()} == {SENTINEL_NAME}


def test_invalid_spec_does_not_leave_backup_artifacts(tmp_path: Path):
    """On an invalid-spec abort, no partial/backup output tree is left behind."""
    output_dir = tmp_path / "generated"
    _seed_existing_client(output_dir)
    missing_spec = tmp_path / "nope.json"

    result = _run_generator(missing_spec, output_dir)

    assert result.returncode != 0
    # The atomic swap only runs on success; a ``.bak`` sibling would signal an
    # interrupted overwrite of the existing client.
    backup = output_dir.with_name(output_dir.name + ".bak")
    assert not backup.exists(), "an invalid-spec abort left a backup artifact behind"


@pytest.mark.skipif(
    shutil.which("java") is None,
    reason="schema validation of a malformed spec requires the JVM-based generator",
)
def test_malformed_spec_file_aborts_without_overwriting(tmp_path: Path):
    """A structurally malformed OpenAPI spec fails schema validation and aborts.

    Unlike the missing-file case, a present-but-invalid file reaches the
    generator, which validates the spec and exits non-zero; the script then
    emits an invalid-spec error and leaves the existing client untouched.
    """
    output_dir = tmp_path / "generated"
    sentinel = _seed_existing_client(output_dir)

    malformed_spec = tmp_path / "malformed-openapi.json"
    # Valid JSON, but not a valid OpenAPI document (no openapi/info/paths, etc.).
    malformed_spec.write_text('{"this": "is not an openapi spec"}', encoding="utf-8")

    result = _run_generator(malformed_spec, output_dir)

    assert result.returncode != 0, (
        f"expected a non-zero exit for a malformed spec, got {result.returncode}; "
        f"stderr={result.stderr!r}"
    )
    assert "invalid-spec" in result.stderr, (
        f"expected an 'invalid-spec' error on stderr, got stderr={result.stderr!r}"
    )
    assert sentinel.exists() and sentinel.read_text(encoding="utf-8") == SENTINEL_CONTENT, (
        "the pre-existing generated client was overwritten on a malformed spec"
    )
