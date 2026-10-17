# SpaceTraders Agent-Login Backend

A deliberately stateless Python backend for the agent-login feature. It accepts
a login request carrying a SpaceTraders API token, calls the SpaceTraders API
through a generated client using that token as a per-request bearer credential,
and returns a compact `Agent_Details` shape. Nothing is persisted.

- Framework: FastAPI (served with uvicorn)
- Tests: pytest + Hypothesis

## Setup

Create a virtual environment and install pinned dependencies:

```bash
make install
```

Without `make` (e.g. Windows without the tool installed):

```bash
python -m venv .venv
# bash:
.venv/Scripts/python -m pip install -r requirements-dev.txt   # Windows
.venv/bin/python     -m pip install -r requirements-dev.txt   # macOS/Linux
```

## Run the backend

```bash
make run                 # or
scripts/run.sh           # bash
scripts/run.ps1          # PowerShell
```

Serves on http://127.0.0.1:8000 (health check at `/health`).

## Run the tests

```bash
make test                # or
scripts/test.sh          # bash
scripts/test.ps1         # PowerShell
```

## Generate the API client

The SpaceTraders API client is a **read-only build artifact** generated from the
official OpenAPI specification with a pinned `openapi-generator-cli` (python
generator). Never hand-edit the generated tree under `app/generated/` —
regenerate it with the single documented command:

```bash
make generate-client     # or
scripts/generate-client.sh      # bash
scripts/generate-client.ps1     # PowerShell
```

The command fetches the spec, runs the pinned generator into a temporary
location, and swaps it into `app/generated/` only on success. If the spec is
malformed or fails validation, it aborts with a non-zero exit status, leaves the
existing client untouched, and prints an `invalid-spec` error.

Requires a Java runtime (JRE/JDK 11+) on `PATH`; the pinned generator JAR is
downloaded once into `.tools/`. Point at an alternate spec with
`--spec <path-or-url>` (or `make generate-client SPEC=<path-or-url>`).

## Layout

| Path                              | Purpose                                                   |
| --------------------------------- | --------------------------------------------------------- |
| `app/main.py`                     | FastAPI app factory, wires routes                         |
| `app/login_handler.py`            | `POST /api/login` handler (task 4.2)                      |
| `app/map_agent.py`                | Pure upstream → `Agent_Details` mapping (task 3.1)        |
| `app/classify_error.py`           | Pure upstream-outcome → HTTP status classifier (task 3.3) |
| `app/generated_client_adapter.py` | Per-request bearer client adapter (task 4.1)              |
| `app/models.py`                   | Request/response data shapes                              |
| `app/generated/`                  | Read-only generated API client (`make generate-client`)   |
| `scripts/generate_client.py`      | Pinned client-generation pipeline (task 2.1)              |
| `tests/`                          | pytest + Hypothesis test suite                            |

Modules beyond `app/main.py` and `app/models.py` are placeholders with stable
import paths; later tasks fill in their bodies.
