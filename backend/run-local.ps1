$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = "sqlite:///./alienx-local.db"
}

if (-not $env:JWT_SECRET_KEY) {
    $env:JWT_SECRET_KEY = [Guid]::NewGuid().ToString("N") + [Guid]::NewGuid().ToString("N")
}

if (-not $env:FRONTEND_ORIGIN) {
    $env:FRONTEND_ORIGIN = "http://localhost:3000"
}

& .\.venv\Scripts\python.exe -m alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    throw "Database migration failed."
}

& .\.venv\Scripts\python.exe -m app.seed
if ($LASTEXITCODE -ne 0) {
    throw "Demo data initialization failed."
}

& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
