# Перенос локальных данных в PostgreSQL базу данных

## Шаги для миграции:

### 1. Получить External Database URL

1. Зайдите в настройки вашей PostgreSQL базы данных на Render.com
2. Откройте раздел "Connections"
3. Нажмите на иконку глаза рядом с **"External Database URL"**
4. Скопируйте URL (он начинается с `postgresql://`)

### 2. Установить DATABASE_URL локально

**Вариант А: Через переменную окружения (для Windows PowerShell):**
```powershell
cd ID\backend
$env:DATABASE_URL="postgresql://user:password@host:5432/database"
node scripts/migrate-to-database.js
```

**Вариант Б: Через .env файл (рекомендуется):**
1. Создайте файл `.env` в папке `ID/backend/`
2. Добавьте туда:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```
   (замените на ваш External Database URL)

3. Установите пакет для чтения .env (если еще не установлен):
   ```bash
   cd ID/backend
   npm install dotenv
   ```

4. Обновите скрипт миграции, чтобы он читал .env файл

### 3. Запустить миграцию

```bash
cd ID/backend
node scripts/migrate-to-database.js
```

Скрипт автоматически:
- Инициализирует базу данных (создаст таблицы)
- Мигрирует данные из `data/objects.json`
- Мигрирует задачи из `data/tasks.json`
- Мигрирует снимки из `data/snapshots.json`

### 4. Проверить результат

После миграции:
1. Обновите страницу на продакшене
2. Данные должны появиться

