# 🔄 ПОПЫТКА ВОССТАНОВИТЬ ДАННЫЕ ИЗ RENDER

## Шаг 1: Проверьте Render.com Dashboard

1. Откройте https://dashboard.render.com
2. Войдите в свой аккаунт
3. Найдите сервис "eid-praktis-id" (или как он называется у вас)

## Шаг 2: Откройте Shell (если доступен)

В Render Dashboard найдите кнопку "Shell" или "Open Shell"

**Если Shell доступен**, выполните эти команды:

```bash
# Перейти в директорию с данными
cd /app/backend/data

# Посмотреть файлы
ls -la

# Проверить содержимое объектов
cat objects.json | head -100

# Проверить содержимое задач
cat tasks.json | head -100

# Проверить размеры файлов
du -h *.json
```

**Если файлы содержат ваши реальные данные**, скопируйте их содержимое:
1. Выделите весь текст файла (например, `objects.json`)
2. Скопируйте (Ctrl+C)
3. Вставьте в локальный файл `ID/backend/data/objects.json`

## Шаг 3: Или попробуйте через API (если сервер еще работает)

Откройте в браузере:
- https://eid-praktis-id.onrender.com/api/containers
- https://eid-praktis-id.onrender.com/api/tasks
- https://eid-praktis-id.onrender.com/api/snapshots

Скопируйте JSON ответы и сохраните их в файлы:
- `ID/backend/data/objects.json` (для `/api/containers`)
- `ID/backend/data/tasks.json` (для `/api/tasks`)
- `ID/backend/data/snapshots.json` (для `/api/snapshots`)

**ВАЖНО:** Формат `/api/containers` нужно обернуть в `{ "containers": [...] }`

## Шаг 4: Если удалось восстановить

После восстановления данных:

```bash
cd ID

# Проверьте файлы
git status backend/data/

# Добавьте в git
git add backend/data/*.json

# Закоммитьте
git commit -m "RESTORE: Восстановленные данные с продакшена"

# Запушьте
git push

# Деплой произойдет автоматически
```

## Если данные действительно потеряны

К сожалению, если данные уже перезаписаны на Render, их нельзя восстановить. Нужно будет заново ввести данные через интерфейс на продакшене.

**После ввода данных:**
1. НЕМЕДЛЕННО скачайте их скриптом
2. Закоммитьте в git
3. Запушьте в репозиторий


