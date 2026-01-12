# 🚀 Быстрый старт: Коммит на GitHub и деплой

## Шаг 1: Коммит на GitHub

### Вариант А: Если Git еще не инициализирован

```bash
cd ID
git init
git add .
git commit -m "Initial commit: Praktis ID Dashboard"
git branch -M main
git remote add origin https://github.com/ваш-username/ваш-репозиторий.git
git push -u origin main
```

### Вариант Б: Если репозиторий уже существует

```bash
cd ID
git add .
git commit -m "Update: добавлены функции удаления контейнеров и снимков, экспорт в PDF"
git push
```

## Шаг 2: Деплой на Render.com

1. Зайдите на [render.com](https://render.com) (войдите через GitHub)

2. Нажмите **"New +"** → **"Web Service"**

3. Подключите ваш GitHub репозиторий

4. Настройте:
   - **Name:** `praktis-id-dashboard` (или любое имя)
   - **Region:** `Frankfurt` (ближайший к России)
   - **Branch:** `main`
   - **Root Directory:** `ID` (если репозиторий содержит папку ID, иначе оставьте пустым)
   - **Runtime:** `Node`
   - **Build Command:** 
     ```bash
     cd backend && npm install && cd ../frontend && npm install && npm run build
     ```
   - **Start Command:**
     ```bash
     cd backend && npm start
     ```
   - **Instance Type:** `Free`

5. В разделе **Environment** добавьте:
   - **Key:** `NODE_ENV` → **Value:** `production`

6. Нажмите **"Create Web Service"**

7. Подождите 5-10 минут пока деплой завершится

8. Ваш сайт будет доступен по адресу: `https://praktis-id-dashboard.onrender.com`

## ⚠️ Важные замечания

1. **Файлы данных (JSON)** коммитятся в Git. Если вы не хотите хранить данные в репозитории, раскомментируйте в `.gitignore`:
   ```
   backend/data/*.json
   ```

2. **На бесплатном тарифе Render.com** данные в файловой системе могут пропасть после перезапуска! Для production рекомендуется использовать базу данных.

3. **Первый деплой** займет 5-10 минут из-за установки зависимостей.

4. **Автоматический деплой**: каждый `git push` будет автоматически передеплоить проект.

## 🔄 Обновление проекта

После изменения кода:

```bash
git add .
git commit -m "Описание изменений"
git push
```

Render.com автоматически обнаружит изменения и передеплоит проект.

## ❓ Проблемы?

Смотрите подробную инструкцию в файле [`DEPLOY.md`](DEPLOY.md)



