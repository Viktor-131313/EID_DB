# ✅ ИСПРАВЛЕНИЕ: Подключение API на Render.com

## ❌ Проблема

После деплоя на Render.com фронтенд пытается подключиться к `localhost:3001`, что вызывает ошибки `ERR_CONNECTION_REFUSED`.

## ✅ Решение

На Render.com фронтенд и бэкенд работают на **одном домене**, поэтому API запросы должны использовать **относительные пути** `/api/*` вместо `http://localhost:3001/api`.

## 🔧 Изменения в коде

Файлы обновлены:
- `ID/frontend/src/services/api-containers.js`
- `ID/frontend/src/services/api-tasks.js`

Теперь по умолчанию используется `/api` вместо `http://localhost:3001/api`.

## 🚀 Что нужно сделать на Render.com

1. **НЕ указывайте** переменную окружения `REACT_APP_API_URL` в настройках Render (или удалите её, если указана)

2. **Пересоберите и задеплойте** проект на Render:
   - Либо сделайте новый коммит и пуш на GitHub (Render автоматически передеплоит)
   - Либо нажмите "Manual Deploy" → "Deploy latest commit"

## 💻 Для локальной разработки

В файле `ID/frontend/package.json` уже есть настройка прокси:
```json
"proxy": "http://localhost:3001"
```

Это означает, что при запуске `npm start` в development режиме запросы к `/api/*` автоматически будут перенаправляться на `http://localhost:3001/api/*`.

Если вы хотите явно указать API URL для локальной разработки, создайте файл `.env` в папке `frontend/`:
```
REACT_APP_API_URL=http://localhost:3001/api
```

**ВАЖНО:** Не коммитьте файл `.env` в Git! Он уже должен быть в `.gitignore`.

## ✅ Итог

- **Production (Render.com):** Используется `/api` (относительный путь)
- **Development (локально):** Используется прокси из `package.json` или `.env` файл



