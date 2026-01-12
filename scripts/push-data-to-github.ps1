# Скрипт для безопасного пуша данных на GitHub
# Использование: .\scripts\push-data-to-github.ps1

Write-Host "🚀 Пуш данных на GitHub..." -ForegroundColor Cyan

# Проверяем, что мы в правильной директории
if (-not (Test-Path "backend\data\objects.json")) {
    Write-Host "❌ Ошибка: файлы данных не найдены!" -ForegroundColor Red
    Write-Host "Запустите скрипт из папки ID" -ForegroundColor Yellow
    exit 1
}

# Проверяем статус git
Write-Host "`n📋 Проверка статуса git..." -ForegroundColor Cyan
$status = git status --short backend/data/*.json
if ($status) {
    Write-Host "⚠️  Есть незакоммиченные изменения в данных!" -ForegroundColor Yellow
    Write-Host "Сначала закоммитьте данные:" -ForegroundColor Yellow
    Write-Host "  git add backend/data/*.json" -ForegroundColor White
    Write-Host "  git commit -m 'Backup: Данные с продакшена'" -ForegroundColor White
    exit 1
}

# Проверяем последний коммит
Write-Host "`n🔍 Проверка последнего коммита с данными..." -ForegroundColor Cyan
$lastCommit = git log --oneline -1 -- backend/data/objects.json
if ($lastCommit) {
    Write-Host "  $lastCommit" -ForegroundColor Green
} else {
    Write-Host "⚠️  Не найден коммит с данными!" -ForegroundColor Yellow
    exit 1
}

# Проверяем, запушен ли коммит
Write-Host "`n🔍 Проверка удаленного репозитория..." -ForegroundColor Cyan
git fetch origin 2>&1 | Out-Null
$localCommit = git log HEAD --oneline -1 -- backend/data/objects.json | ForEach-Object { $_.Split(' ')[0] }
$remoteCommit = git log origin/main --oneline -1 -- backend/data/objects.json 2>&1 | ForEach-Object { if ($_ -notmatch 'fatal') { $_.Split(' ')[0] } }

if ($localCommit -eq $remoteCommit) {
    Write-Host "✅ Данные уже запушены на GitHub!" -ForegroundColor Green
    Write-Host "   Локальный коммит: $localCommit" -ForegroundColor Gray
    Write-Host "   Удаленный коммит: $remoteCommit" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "⚠️  Данные НЕ запушены!" -ForegroundColor Yellow
    Write-Host "   Локальный коммит: $localCommit" -ForegroundColor Gray
    if ($remoteCommit) {
        Write-Host "   Удаленный коммит: $remoteCommit" -ForegroundColor Gray
    } else {
        Write-Host "   Удаленный коммит: не найден" -ForegroundColor Red
    }
}

# Пытаемся запушить
Write-Host "`n🚀 Пуш данных на GitHub..." -ForegroundColor Cyan
$pushResult = git push origin main 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Данные успешно запушены на GitHub!" -ForegroundColor Green
    Write-Host "`n📝 Следующие шаги:" -ForegroundColor Cyan
    Write-Host "1. Подождите 1-2 минуты (Render автоматически задеплоит)" -ForegroundColor White
    Write-Host "2. ИЛИ зайдите на Render.com → Manual Deploy" -ForegroundColor White
    Write-Host "3. Проверьте данные на продакшене" -ForegroundColor White
} else {
    Write-Host "❌ Ошибка при пуше!" -ForegroundColor Red
    Write-Host $pushResult -ForegroundColor Red
    Write-Host "`n💡 Решение:" -ForegroundColor Yellow
    Write-Host "Используйте Personal Access Token:" -ForegroundColor White
    Write-Host '  git push https://ВАШ_ТОКЕН@github.com/Viktor-131313/EID_DB.git main' -ForegroundColor Cyan
    Write-Host "`nСоздайте токен: https://github.com/settings/tokens" -ForegroundColor White
}

