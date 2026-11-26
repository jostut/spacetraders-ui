#!/usr/bin/env python3
"""Pinned, repeatable SpaceTraders API client generator.

This is the single, cross-platform implementation behind the
``make generate-client`` target (and its ``scripts/generate-client.sh`` /
``scripts/generate-client.ps1`` wrappers for machines without ``make``).

What it does (Requirement 6):

* Fetches the SpaceTraders OpenAPI specification as a pinned multi-file repo
  archive and generates from its ``reference/SpaceTraders.json`` entry point
  (6.1), or uses a spec passed via ``--spec`` (a local path or a single-file
  URL; used by the smoke / integration tests with fixtures).
* Runs the pinned ``openapi-generator-cli`` with the ``python`` generator and a
  fixed set of options so output is reproducible across machines and time
  (6.1, 6.2, 6.5).
* Generates into a *temporary* directory and only swaps it into place after the
  generator succeeds. On a malformed / invalid spec it aborts with a non-zero
  exit status, leaves any existing generated client untouched, and prints an
  ``invalid-spec`` error (6.3).

The generated tree is read-only build output; it must never be hand-edited —
regeneration is this one command (6.5).
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

# --- Pinned configuration (do not drift without a deliberate bump) -----------

# Pinned openapi-generator-cli release. Pinning keeps generated output
# reproducible across machines and over time (design: "Pinned version").
OPENAPI_GENERATOR_VERSION = "7.11.0"

# Maven Central coordinates for the pinned CLI JAR.
_MAVEN_BASE = "https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli"
OPENAPI_GENERATOR_JAR_URL = (
    f"{_MAVEN_BASE}/{OPENAPI_GENERATOR_VERSION}/"
    f"openapi-generator-cli-{OPENAPI_GENERATOR_VERSION}.jar"
)

# The official SpaceTraders OpenAPI specification (Requirement 6.1).
#
# The spec is published as a *multi-file* document: reference/SpaceTraders.json
# uses relative $refs to sibling files under models/ (e.g.
# ``../models/FactionSymbol.json``). A single downloaded file therefore cannot
# resolve those refs, so we fetch the whole api-docs repository as a pinned
# source archive and run the generator against the local reference entry point,
# letting the relative refs resolve from the extracted ``models/`` directory.
#
# Pinned to a specific commit so generation is reproducible over time (6.5).
SPEC_REPO_TARBALL_URL = (
    "https://codeload.github.com/SpaceTradersAPI/api-docs/tar.gz/"
    "45fbb04130aca3fa0bd9a634ab77b35fa6c468ab"
)
# The entry-point spec path *inside* the extracted archive, relative to the
# single top-level directory the GitHub tarball unpacks into.
SPEC_ENTRYPOINT_IN_ARCHIVE = "reference/SpaceTraders.json"

# Generator identity and pinned options (Requirement 6.1, 6.5).
GENERATOR_NAME = "python"
PACKAGE_NAME = "spacetraders_client"
PROJECT_NAME = "spacetraders-client"
# Pinned additional properties passed to the python generator. Keeping these
# fixed means the single documented command needs no manual edits (6.5).
ADDITIONAL_PROPERTIES = ",".join(
    [
        f"packageName={PACKAGE_NAME}",
        f"projectName={PROJECT_NAME}",
        "library=urllib3",
        "generateSourceCodeOnly=true",
    ]
)

# --- Paths -------------------------------------------------------------------

# backend/scripts/generate_client.py -> backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent
# Where the generated client is swapped into place (a build artifact).
OUTPUT_DIR = BACKEND_DIR / "app" / "generated"
# Cache location for the pinned generator JAR so we download it once.
JAR_CACHE_DIR = BACKEND_DIR / ".tools"
JAR_PATH = JAR_CACHE_DIR / f"openapi-generator-cli-{OPENAPI_GENERATOR_VERSION}.jar"


# --- Error type used to signal an invalid spec (non-zero exit, no overwrite) --

class InvalidSpecError(RuntimeError):
    """Raised when the OpenAPI spec is malformed or fails schema validation."""


def _eprint(message: str) -> None:
    print(message, file=sys.stderr)


def _ensure_java() -> None:
    if shutil.which("java") is None:
        _eprint(
            "error: 'java' was not found on PATH. The pinned openapi-generator-cli "
            "runs on the JVM; please install a Java runtime (JRE/JDK 11+)."
        )
        raise SystemExit(2)


def _ensure_generator_jar() -> Path:
    """Download the pinned generator JAR once and cache it under backend/.tools."""
    if JAR_PATH.exists():
        return JAR_PATH
    JAR_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    print(
        f"Downloading pinned openapi-generator-cli {OPENAPI_GENERATOR_VERSION} ..."
    )
    tmp_fd, tmp_name = tempfile.mkstemp(suffix=".jar", dir=str(JAR_CACHE_DIR))
    os.close(tmp_fd)
    tmp_jar = Path(tmp_name)
    try:
        with urllib.request.urlopen(OPENAPI_GENERATOR_JAR_URL) as resp, open(
            tmp_jar, "wb"
        ) as out:
            shutil.copyfileobj(resp, out)
        os.replace(tmp_jar, JAR_PATH)
    except urllib.error.URLError as exc:
        tmp_jar.unlink(missing_ok=True)
        _eprint(f"error: failed to download the generator JAR: {exc}")
        raise SystemExit(2)
    finally:
        if tmp_jar.exists():
            tmp_jar.unlink(missing_ok=True)
    return JAR_PATH


def _resolve_spec(spec: str | None, workdir: Path) -> str:
    """Return a local spec path for the generator to consume.

    Three cases:

    * ``spec`` is ``None`` (the default): the pinned SpaceTraders api-docs
      repository archive is downloaded and extracted into ``workdir``, and the
      path to its ``reference/SpaceTraders.json`` entry point is returned. The
      sibling ``models/`` directory travels with it, so the relative ``$ref``s
      in the spec resolve from disk.
    * ``spec`` is an ``http(s)`` URL: it is downloaded as a single file (used by
      callers that already have a self-contained/bundled spec).
    * ``spec`` is a local path: it is used directly (used by the smoke /
      integration tests with fixture specs).
    """
    if spec is None:
        return _fetch_spec_repo(workdir)

    # Explicit single-file URL (self-contained/bundled spec).
    if spec.startswith(("http://", "https://")):
        dest = workdir / "openapi-spec.json"
        print(f"Fetching OpenAPI spec from {spec} ...")
        try:
            with urllib.request.urlopen(spec) as resp, open(dest, "wb") as out:
                shutil.copyfileobj(resp, out)
        except urllib.error.URLError as exc:
            raise InvalidSpecError(
                f"could not fetch the OpenAPI spec from {spec}: {exc}"
            ) from exc
        return str(dest)

    local = Path(spec)
    if not local.exists():
        raise InvalidSpecError(f"spec file does not exist: {spec}")
    return str(local)


def _fetch_spec_repo(workdir: Path) -> str:
    """Download + extract the pinned api-docs archive; return the spec path.

    The GitHub tarball unpacks into a single top-level directory
    (``api-docs-<sha>/``). We extract under ``workdir`` and locate the pinned
    ``reference/SpaceTraders.json`` entry point beneath it. A download or
    extraction failure, or a missing entry point, is reported as an
    ``InvalidSpecError`` so the caller aborts without touching the existing
    client (6.3).
    """
    archive = workdir / "api-docs.tar.gz"
    extract_root = workdir / "spec-repo"
    print(f"Fetching OpenAPI spec repository from {SPEC_REPO_TARBALL_URL} ...")
    try:
        with urllib.request.urlopen(SPEC_REPO_TARBALL_URL) as resp, open(
            archive, "wb"
        ) as out:
            shutil.copyfileobj(resp, out)
    except urllib.error.URLError as exc:
        raise InvalidSpecError(
            f"could not fetch the SpaceTraders api-docs archive: {exc}"
        ) from exc

    extract_root.mkdir(parents=True, exist_ok=True)
    try:
        with tarfile.open(archive, "r:gz") as tar:
            _safe_extract(tar, extract_root)
    except (tarfile.TarError, OSError) as exc:
        raise InvalidSpecError(
            f"could not extract the SpaceTraders api-docs archive: {exc}"
        ) from exc

    # The tarball contains exactly one top-level directory (api-docs-<sha>/).
    top_dirs = [d for d in extract_root.iterdir() if d.is_dir()]
    if len(top_dirs) != 1:
        raise InvalidSpecError(
            "unexpected api-docs archive layout: expected a single top-level "
            f"directory, found {len(top_dirs)}"
        )
    entry = top_dirs[0] / SPEC_ENTRYPOINT_IN_ARCHIVE
    if not entry.exists():
        raise InvalidSpecError(
            f"spec entry point not found in archive: {SPEC_ENTRYPOINT_IN_ARCHIVE}"
        )
    return str(entry)


def _safe_extract(tar: tarfile.TarFile, dest: Path) -> None:
    """Extract ``tar`` into ``dest``, rejecting entries that escape ``dest``.

    Guards against path-traversal in archive member names (``..`` / absolute
    paths) so a malicious or malformed archive cannot write outside ``dest``.
    """
    dest = dest.resolve()
    for member in tar.getmembers():
        target = (dest / member.name).resolve()
        if dest != target and dest not in target.parents:
            raise InvalidSpecError(
                f"archive member escapes extraction directory: {member.name!r}"
            )
    tar.extractall(dest)


def _swap_into_place(generated: Path, output: Path) -> None:
    """Atomically replace ``output`` with ``generated`` (post-success only)."""
    output.parent.mkdir(parents=True, exist_ok=True)
    backup = output.with_name(output.name + ".bak")
    # Clear any stale backup from a previous interrupted run.
    if backup.exists():
        shutil.rmtree(backup)
    had_previous = output.exists()
    if had_previous:
        os.replace(output, backup)
    try:
        shutil.move(str(generated), str(output))
    except Exception:
        # Roll the previous client back on any swap failure (no overwrite).
        if had_previous and backup.exists():
            os.replace(backup, output)
        raise
    if backup.exists():
        shutil.rmtree(backup)


def _mark_read_only(root: Path) -> None:
    """Mark the generated tree read-only; it is build output, not source."""
    for path in root.rglob("*"):
        if path.is_file():
            mode = path.stat().st_mode
            path.chmod(mode & ~0o222)


def generate(spec: str | None = None, output_dir: Path | None = None) -> int:
    """Run the pinned generation pipeline. Returns a process exit code."""
    output = output_dir or OUTPUT_DIR
    _ensure_java()
    jar = _ensure_generator_jar()

    # All transient work happens under a temp dir; the real output tree is only
    # touched on success (Requirement 6.3).
    with tempfile.TemporaryDirectory(prefix="spacetraders-client-") as tmp:
        workdir = Path(tmp)
        gen_out = workdir / "out"
        try:
            spec_arg = _resolve_spec(spec, workdir)
        except InvalidSpecError as exc:
            _eprint(f"invalid-spec: {exc}")
            return 1

        cmd = [
            "java",
            "-jar",
            str(jar),
            "generate",
            "-g",
            GENERATOR_NAME,
            "-i",
            spec_arg,
            "-o",
            str(gen_out),
            "--additional-properties",
            ADDITIONAL_PROPERTIES,
        ]
        # NB: spec validation is ON by default in openapi-generator-cli; we do
        # NOT pass --skip-validate-spec, so a malformed/invalid spec makes the
        # generator exit non-zero and write nothing (Requirement 6.3).
        print("Running pinned openapi-generator-cli (python generator) ...")
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.stdout:
            print(result.stdout)
        if result.returncode != 0:
            # The generator writes nothing usable on a validation failure. Do
            # NOT touch the existing client; emit an invalid-spec error.
            _eprint(result.stderr.strip() or "openapi-generator-cli failed")
            _eprint(
                "invalid-spec: the OpenAPI specification is malformed or failed "
                "schema validation; the existing generated client was left "
                "unchanged."
            )
            return result.returncode or 1

        if not gen_out.exists() or not any(gen_out.iterdir()):
            _eprint(
                "invalid-spec: the generator produced no output; the existing "
                "generated client was left unchanged."
            )
            return 1

        _swap_into_place(gen_out, output)
        _mark_read_only(output)
        print(f"Generated client written to {output}")
        return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Generate the SpaceTraders API client from the OpenAPI spec using "
            "the pinned openapi-generator-cli (python generator)."
        )
    )
    parser.add_argument(
        "--spec",
        default=None,
        help=(
            "OpenAPI spec: a local file path or a single-file http(s) URL. When "
            "omitted, the pinned SpaceTraders api-docs repository archive is "
            "fetched and its reference/SpaceTraders.json entry point is used."
        ),
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output directory for the generated client (defaults to app/generated).",
    )
    args = parser.parse_args(argv)
    output = Path(args.output) if args.output else None
    try:
        return generate(spec=args.spec, output_dir=output)
    except InvalidSpecError as exc:
        _eprint(f"invalid-spec: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
