# Скрипт для запуска бэкенда и фронтенда одновременно

Write-Host "Starting Praktis ID Dashboard..." -ForegroundColor Green

# Запуск бэкенда
Write-Host "`nStarting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm install; npm start"

# Ждем немного перед запуском фронтенда
Start-Sleep -Seconds 3

# Запуск фронтенда
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm install; npm start"

Write-Host "`nBackend will run on http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend will run on http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

