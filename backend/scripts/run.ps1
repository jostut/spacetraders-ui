# Run the backend (serves routes on http://127.0.0.1:8000).
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$venv = if ($env:VENV) { $env:VENV } else { ".venv" }
$py = Join-Path $venv "Scripts/python.exe"
if (-not (Test-Path $py)) { $py = "python" }

& $py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
