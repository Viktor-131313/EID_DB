# 🗄️ Настройка PostgreSQL базы данных на Render.com

## ✅ Преимущества PostgreSQL

После настройки PostgreSQL:
- ✅ Данные сохраняются **автоматически** в базе данных
- ✅ **НЕ нужно** пулить/пушить данные вручную
- ✅ Данные **НЕ теряются** при пробуждении Render
- ✅ Можно работать как в обычном приложении

---

## 📋 Пошаговая инструкция

### Шаг 1: Создать PostgreSQL базу данных на Render.com

1. Зайдите на https://dashboard.render.com
2. Нажмите **"New +"** → **"PostgreSQL"**
3. Заполните форму:
   - **Name:** `eid-praktis-id-db` (или любое имя)
   - **Database:** `eid_db` (или любое имя)
   - **User:** автоматически сгенерируется
   - **Region:** выберите тот же регион, что у вашего Web Service (для скорости)
   - **PostgreSQL Version:** 15 (рекомендуется)
   - **Plan:** Free (1 ГБ достаточно для начала)
4. Нажмите **"Create Database"**
5. Подождите 1-2 минуты, пока база создается

### Шаг 2: Скопировать Internal Database URL

1. После создания базы данных, откройте её в Dashboard
2. Найдите раздел **"Connections"** или **"Internal Database URL"**
3. **СКОПИРУЙТЕ Internal Database URL** - он выглядит примерно так:
   ```
   postgres://user:password@dpg-xxxxx-a.frankfurt-postgres.render.com:5432/eid_db
   ```
   ⚠️ **ВАЖНО:** Используйте именно **Internal Database URL**, а не External!

### Шаг 3: Подключить базу данных к Web Service

1. Зайдите в настройки вашего **Web Service** на Render.com
2. Перейдите в раздел **"Environment"**
3. Нажмите **"Add Environment Variable"**
4. Добавьте:
   - **Key:** `DATABASE_URL`
   - **Value:** вставьте скопированный Internal Database URL
5. Нажмите **"Save Changes"**

### Шаг 4: Обновить код (автоматически)

Код уже обновлен для работы с PostgreSQL! Просто:

1. Закоммитьте изменения:
   ```bash
   cd ID
   git add .
   git commit -m "Migrate to PostgreSQL database"
   git push origin main
   ```

2. Render автоматически задеплоит изменения

3. При первом запуске база данных автоматически инициализируется (создадутся таблицы)

### Шаг 5: Мигрировать существующие данные (опционально)

Если у вас уже есть данные в JSON файлах:

1. **Скачайте данные с продакшена** (если они там есть):
   ```bash
   cd ID
   node scripts/download-production-data.js
   ```

2. **Локально мигрируйте данные в PostgreSQL:**
   - Создайте файл `.env` в папке `backend/`:
     ```
     DATABASE_URL=postgres://user:password@host:5432/dbname
     ```
   - Или используйте External Database URL для локальной миграции
   - Запустите миграцию:
     ```bash
     cd ID/backend
     node scripts/migrate-to-database.js
     ```

3. **Или просто работайте с нуля** - данные будут сохраняться в базу автоматически

---

## 🔍 Проверка работы

После деплоя:

1. Откройте ваш сайт на Render.com
2. Добавьте тестовый объект
3. Подождите 1-2 минуты
4. Обновите страницу
5. Объект должен сохраниться ✅

**Если объект сохранился** → миграция прошла успешно! 🎉

---

## ⚠️ Важные замечания

1. **Internal vs External URL:**
   - Используйте **Internal Database URL** для Web Service на Render
   - Используйте **External Database URL** только для локальной разработки

2. **Бесплатный план:**
   - PostgreSQL на бесплатном плане дает 1 ГБ места
   - База данных "засыпает" после 90 дней неактивности
   - Для production лучше использовать платный план (но для начала free достаточно)

3. **Бэкапы:**
   - Данные теперь хранятся в базе данных
   - Render делает автоматические бэкапы
   - Но можно делать ручные бэкапы через pg_dump

---

## 🔄 Откат к JSON (если что-то пошло не так)

Если нужно временно вернуться к JSON файлам:

1. В `server.js` закомментируйте строки с импортом `database.js`
2. Раскомментируйте старые функции `readData()` и `writeData()`
3. Удалите переменную `DATABASE_URL` из Environment Variables
4. Задеплойте

Но лучше исправить проблему, так как PostgreSQL - правильное решение для production! 💪

---

## 📝 Дополнительная информация

- [Документация Render PostgreSQL](https://render.com/docs/databases)
- [Документация pg (Node.js PostgreSQL)](https://node-postgres.com/)

---

**После настройки PostgreSQL вы больше НЕ будете терять данные!** 🎉

