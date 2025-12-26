Write-Host "Запуск миграции данных в PostgreSQL..." -ForegroundColor Green
Set-Location backend
node scripts/migrate-local-data.js
Read-Host "Нажмите Enter для выхода"

