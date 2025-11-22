#!/usr/bin/env pwsh
# Restart the development server

Write-Host "Restarting development server..." -ForegroundColor Cyan

# Stop the server
& "$PSScriptRoot\stop.ps1"

# Wait a moment for processes to fully terminate
Start-Sleep -Seconds 2

# Start the server
& "$PSScriptRoot\start.ps1"
