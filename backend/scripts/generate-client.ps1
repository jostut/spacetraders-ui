# Regenerate the SpaceTraders API client from the OpenAPI spec.
#
# This is the single, documented, repeatable generation command for machines
# without `make`. It delegates all logic to scripts/generate_client.py, which
# runs the pinned openapi-generator-cli, generates into a temp location, and
# only swaps the result into place on success. Any extra args are forwarded
# (e.g. --spec <path/url>, --output <dir>).
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$venv = if ($env:VENV) { $env:VENV } else { ".venv" }
$py = Join-Path $venv "Scripts/python.exe"
if (-not (Test-Path $py)) { $py = "python" }

& $py scripts/generate_client.py @args
exit $LASTEXITCODE
