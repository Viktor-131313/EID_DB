@echo off
echo Запуск миграции данных в PostgreSQL...
cd backend
node scripts/migrate-local-data.js
pause

