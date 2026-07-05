$root = Split-Path -Parent $PSScriptRoot
$review = Join-Path $root ".review"

function Stop-ProcessTree($processId) {
    if ($processId) {
        Start-Process -FilePath "taskkill.exe" -ArgumentList "/PID", $processId, "/T", "/F" -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue | Out-Null
    }
}

foreach ($name in @("frontend", "backend")) {
    $pidFile = Join-Path $review "$name.pid"
    if (Test-Path $pidFile) {
        $processId = Get-Content $pidFile -ErrorAction SilentlyContinue
        Stop-ProcessTree $processId
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
}

foreach ($port in @(3000, 8001)) {
    Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object { Stop-ProcessTree $_ }
}

Write-Host "SignGuyAI review environment stopped."
