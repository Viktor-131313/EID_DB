# Исправление проблемы сохранения данных на продакшене

## Проблема

На Render.com файловая система эфемерная - данные, сохраненные в JSON файлы, теряются при перезапуске сервера. Поэтому данные НЕ сохраняются между деплоями.

## Решение

**Обязательно нужно использовать PostgreSQL базу данных на Render.com!**

### Шаги для настройки:

1. **Создать PostgreSQL базу данных на Render.com:**
   - Зайти в Dashboard Render.com
   - Создать новый PostgreSQL сервис
   - Скопировать `Internal Database URL` или `External Database URL`

2. **Добавить переменную окружения DATABASE_URL:**
   - В настройках вашего Web Service на Render.com
   - Environment → Add Environment Variable
   - Key: `DATABASE_URL`
   - Value: `postgresql://user:password@host:port/database` (из шага 1)

3. **Инициализировать схему базы данных:**
   - При первом запуске сервера схема создастся автоматически
   - Или можно выполнить SQL из `backend/database/schema.sql` вручную

4. **Выполнить миграцию для добавления поля aikona_object_id:**
   - Выполнить SQL из `backend/database/migrations/001_add_aikona_object_id.sql`
   - Или подождать, пока схема создастся автоматически (если поле уже есть в schema.sql)

### Что было исправлено в коде:

1. **Создана оптимизированная функция `updateObject`** в `database-update-object.js`
   - Обновляет только один объект, а не перезаписывает все данные
   - Правильно сохраняет `aikonaObjectId`

2. **Обновлен адаптер** (`database/adapter.js`)
   - Добавлены функции `updateObject` и `createObject`
   - Используют оптимизированные функции для базы данных

3. **Обновлены endpoints** в `server.js`
   - PUT `/api/containers/:containerId/objects/:objectId` теперь использует `updateObject`
   - POST `/api/containers/:containerId/objects` теперь использует `createObject`

## Важно!

- **Без DATABASE_URL данные будут теряться** при каждом перезапуске сервера
- **С DATABASE_URL данные сохраняются навсегда** в PostgreSQL
- После добавления DATABASE_URL нужно перезапустить сервис на Render.com

## Проверка

После настройки DATABASE_URL в логах сервера должно появиться:
```
✅ Используется PostgreSQL база данных
✅ База данных инициализирована
```

Если видите:
```
📁 Используются JSON файлы (DATABASE_URL не установлена)
```
То DATABASE_URL не настроена, и данные будут теряться!


