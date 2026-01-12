# ⚠️ ВАЖНО: Internal vs External Database URL

## 🎯 Главное правило:

- **В Web Service на Render.com** → Используйте **Internal Database URL**
- **Для локальной миграции с компьютера** → Используйте **External Database URL**

## 📋 Почему так?

### Internal Database URL:
- Используется для подключения между сервисами **внутри Render.com**
- Web Service и PostgreSQL находятся в одной инфраструктуре
- Быстрее и безопаснее
- Формат: `postgresql://user:pass@host/database` (без домена .render.com)

### External Database URL:
- Используется для подключения **извне Render.com**
- С вашего локального компьютера
- Через интернет
- Формат: `postgresql://user:pass@host.frankfurt-postgres.render.com/database` (с полным доменом)

## ✅ Правильная настройка:

1. **В Web Service на Render.com (Environment Variables):**
   - Key: `DATABASE_URL`
   - Value: **Internal Database URL** (из раздела Connections вашей PostgreSQL базы)

2. **В скрипте миграции (`migrate-local-data.js`):**
   - Используется **External Database URL** (для подключения с локального компьютера)

## 🔄 После миграции:

После того, как вы мигрируете данные локально, они попадут в базу данных, к которой подключен ваш Web Service через Internal URL. Всё будет работать!


