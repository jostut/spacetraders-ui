# Run the backend test suite.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$venv = if ($env:VENV) { $env:VENV } else { ".venv" }
$py = Join-Path $venv "Scripts/python.exe"
if (-not (Test-Path $py)) { $py = "python" }

& $py -m pytest @args
