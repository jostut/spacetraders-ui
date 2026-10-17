# Backend developer tasks for the SpaceTraders agent-login service.
#
# These targets assume a virtual environment. Create one with `make venv`.
# On machines without `make`, equivalent scripts live in `scripts/`
# (run.sh / test.sh for bash, run.ps1 / test.ps1 for PowerShell).

VENV ?= .venv

ifeq ($(OS),Windows_NT)
PY := $(VENV)/Scripts/python.exe
else
PY := $(VENV)/bin/python
endif

.PHONY: venv install run test clean generate-client

venv:
	python -m venv $(VENV)

install: venv
	$(PY) -m pip install --upgrade pip
	$(PY) -m pip install -r requirements-dev.txt

# Run the backend (serves routes on http://127.0.0.1:8000).
run:
	$(PY) -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Run the backend test suite.
test:
	$(PY) -m pytest

# Regenerate the SpaceTraders API client from the OpenAPI specification.
#
# Single, documented, repeatable command (Requirement 6.5). It runs the pinned
# openapi-generator-cli (python generator) via scripts/generate_client.py,
# generating into a temporary location and only swapping it into app/generated
# on success. A malformed/invalid spec aborts non-zero without overwriting the
# existing client and emits an invalid-spec error (6.3). The generated tree is
# read-only build output -- never hand-edit it.
#
# Override the spec source with: make generate-client SPEC=path/or/url
generate-client:
	$(PY) scripts/generate_client.py $(if $(SPEC),--spec $(SPEC),)

clean:
	rm -rf $(VENV) .pytest_cache
