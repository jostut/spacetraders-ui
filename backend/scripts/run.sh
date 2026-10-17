#!/usr/bin/env bash
# Run the backend (serves routes on http://127.0.0.1:8000).
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

exec "$PY" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
