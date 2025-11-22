#!/usr/bin/env pwsh
# Stop all node processes related to this project

Write-Host "Stopping development server..." -ForegroundColor Yellow

# Find and kill node processes running from this directory
$currentPath = (Get-Location).Path
Get-Process | Where-Object { $_.ProcessName -eq "node" } | ForEach-Object {
    try {
        $processPath = $_.Path
        # Check if this node process is related to our project
        if ($processPath -and (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" | Select-Object -ExpandProperty CommandLine) -like "*hand_tracking_app*") {
            Write-Host "Stopping process $($_.Id)..." -ForegroundColor Yellow
            Stop-Process -Id $_.Id -Force
        }
    }
    catch {
        # Process might have already exited
    }
}

# Alternative: Kill all node processes on ports 3000-3010 and 8081 (mouse server)
Write-Host "Checking for processes on ports 3000-3010 and 8081..." -ForegroundColor Yellow
$ports = 3000..3010 + 8081
$ports | ForEach-Object {
    $port = $_
    $connections = netstat -ano | Select-String ":$port " | Select-String "LISTENING"
    if ($connections) {
        $connections | ForEach-Object {
            $line = $_.Line
            if ($line -match '\s+(\d+)$') {
                $pid = $matches[1]
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process -and $process.ProcessName -eq "node") {
                        Write-Host "Stopping node process $pid on port $port..." -ForegroundColor Yellow
                        Stop-Process -Id $pid -Force
                    }
                }
                catch {
                    # Process might have already exited
                }
            }
        }
    }
}

Write-Host "Development server stopped." -ForegroundColor Green
