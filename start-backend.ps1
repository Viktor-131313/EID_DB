# Скрипт для запуска бэкенда

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\backend"

if (-not (Test-Path "node_modules")) {
    npm install
}

Write-Host "`nStarting Backend Server on http://localhost:3001..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Gray

node server.js

