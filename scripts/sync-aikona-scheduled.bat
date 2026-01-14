@echo off
REM Скрипт для автоматического запуска синхронизации с Aikona API
REM Используется планировщиком заданий Windows

REM Устанавливаем переменную окружения с API ключом
set AIKONA_API_KEY=f48941fd-ab51-4edd-b1f2-f202597c9920

REM Переходим в директорию проекта
cd /d "%~dp0.."

REM Запускаем скрипт синхронизации
node scripts/sync-aikona-local.js

REM Если нужно логирование, раскомментируйте следующую строку:
REM node scripts/sync-aikona-local.js >> logs\sync-aikona-%date:~-4,4%%date:~-7,2%%date:~-10,2%.log 2>&1

