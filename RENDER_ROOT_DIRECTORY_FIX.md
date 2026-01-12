# 🔧 ИСПРАВЛЕНИЕ: Root Directory не найден

## ❌ Проблема

Render.com выдаёт ошибку:
```
Root directory "ID" does not exist
```

## 🔍 Причина

Скорее всего, ваш GitHub репозиторий был создан **из папки ID**, а не из родительской папки. Это значит, что:
- В GitHub корень репозитория = содержимое папки ID
- Папки "ID" в репозитории НЕТ (она была корнем)
- Render ищет папку ID, которой не существует

## ✅ Решение

Если репозиторий содержит напрямую `backend/` и `frontend/` (без папки ID), то:

### Вариант 1: Root Directory пустой (РЕКОМЕНДУЕТСЯ)

1. На Render.com откройте **Settings** → **Build & Deploy**
2. **Root Directory:** оставьте **ПУСТЫМ** (не указывайте "ID")
3. **Build Command:**
   ```
   cd backend && npm install && cd ../frontend && npm install && npm run build
   ```
4. **Start Command:**
   ```
   cd backend && npm start
   ```

### Вариант 2: Если в репозитории всё-таки есть папка ID

Если вы создали репозиторий из папки `Academy_SetlSoft` (родительской), то:

1. **Root Directory:** `ID` (заглавными буквами)
2. **Build Command:**
   ```
   cd backend && npm install && cd ../frontend && npm install && npm run build
   ```
3. **Start Command:**
   ```
   cd backend && npm start
   ```

## 🔍 Как проверить структуру репозитория

Зайдите на GitHub: `https://github.com/Viktor-131313/EID_DB`

Посмотрите, что находится в корне:
- Если сразу видны `backend/`, `frontend/`, `README.md` → **Root Directory пустой**
- Если есть папка `ID/`, а внутри неё `backend/`, `frontend/` → **Root Directory: ID**

## 📋 Пошаговая инструкция

1. Откройте: `https://github.com/Viktor-131313/EID_DB`
2. Посмотрите структуру в корне
3. На Render.com в настройках:
   - Если в корне сразу `backend/` и `frontend/` → **Root Directory оставьте пустым**
   - Если в корне папка `ID/` → **Root Directory: ID**
4. Сохраните настройки
5. Нажмите **Manual Deploy** → **Deploy latest commit**



