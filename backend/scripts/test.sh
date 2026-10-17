#!/usr/bin/env bash
# Run the backend test suite.
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

exec "$PY" -m pytest "$@"
