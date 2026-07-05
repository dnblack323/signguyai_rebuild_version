$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$python = "python"
$yarn = "yarn.cmd"
$review = Join-Path $root ".review"

New-Item -ItemType Directory -Force -Path $review | Out-Null

function Stop-ProcessTree($processId) {
    if ($processId) {
        Start-Process -FilePath "taskkill.exe" -ArgumentList "/PID", $processId, "/T", "/F" -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue | Out-Null
    }
}

function Stop-RecordedProcess([string]$name) {
    $pidFile = Join-Path $review "$name.pid"
    if (Test-Path $pidFile) {
        $processId = Get-Content $pidFile -ErrorAction SilentlyContinue
        Stop-ProcessTree $processId
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
}

Stop-RecordedProcess "frontend"
Stop-RecordedProcess "backend"

foreach ($port in @(3000, 8001)) {
    Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object { Stop-ProcessTree $_ }
}

& $python -c "import fastapi, uvicorn" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Python must have FastAPI and Uvicorn installed. Run: python -m pip install -r backend\requirements.txt"
    exit 1
}

$backend = Start-Process -FilePath $python -ArgumentList "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8001" -WorkingDirectory (Join-Path $root "backend") -RedirectStandardOutput (Join-Path $review "backend.log") -RedirectStandardError (Join-Path $review "backend-error.log") -WindowStyle Hidden -PassThru
$frontend = Start-Process -FilePath $yarn -ArgumentList "start" -WorkingDirectory (Join-Path $root "frontend") -RedirectStandardOutput (Join-Path $review "frontend.log") -RedirectStandardError (Join-Path $review "frontend-error.log") -WindowStyle Hidden -PassThru

$backend.Id | Set-Content (Join-Path $review "backend.pid")
$frontend.Id | Set-Content (Join-Path $review "frontend.pid")

$deadline = (Get-Date).AddSeconds(20)
do {
    Start-Sleep -Milliseconds 500
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/health" -TimeoutSec 2
        $frontendReady = (Invoke-WebRequest -Uri "http://127.0.0.1:3000/" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200
    } catch {
        $health = $null
        $frontendReady = $false
    }
} until (($health -and $frontendReady) -or (Get-Date) -gt $deadline)

if (-not ($health -and $frontendReady)) {
    Write-Host "Review environment did not start. Check .review logs."
    exit 1
}

Write-Host "SignGuyAI review environment is ready."
Write-Host "Full app: http://127.0.0.1:3000/"
Write-Host "Webstores standalone: http://127.0.0.1:3000/?mode=webstores"
Write-Host "Wrap Lab: http://127.0.0.1:3000/?mode=wrap-lab"
Write-Host "Backend API docs: http://127.0.0.1:8001/docs"
