#!/usr/bin/env bash
# Regenerate the SpaceTraders API client from the OpenAPI spec.
#
# This is the single, documented, repeatable generation command for machines
# without `make`. It delegates all logic to scripts/generate_client.py, which
# runs the pinned openapi-generator-cli, generates into a temp location, and
# only swaps the result into place on success. Any extra args are forwarded
# (e.g. --spec <path/url>, --output <dir>).
set -euo pipefail
cd "$(dirname "$0")/.."

VENV="${VENV:-.venv}"
if [ -x "$VENV/bin/python" ]; then
  PY="$VENV/bin/python"
elif [ -x "$VENV/Scripts/python.exe" ]; then
  PY="$VENV/Scripts/python.exe"
else
  PY="python"
fi

exec "$PY" scripts/generate_client.py "$@"
