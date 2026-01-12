# 🔧 Настройка переменных окружения на Render.com

## ⚠️ ВАЖНО: Правильный раздел

На скриншоте показан раздел **"Secret Files"** — это НЕ то, что нужно!

Вам нужно перейти в раздел **"Environment"** (переменные окружения), а не "Secret Files".

---

## 📋 Пошаговая инструкция:

### 1. Найдите раздел "Environment" (НЕ "Secret Files")

В настройках вашего Web Service на Render.com найдите вкладку/раздел **"Environment"** (Переменные окружения).

### 2. Добавьте следующие переменные:

Нажмите "Add Environment Variable" и добавьте:

| Ключ (Key) | Значение (Value) |
|------------|------------------|
| `DATABASE_URL` | `postgresql://...` (ваш URL из раздела Connections) |
| `JWT_SECRET` | `e558667549f478078fc03fc2ab8361edc185c736f21a19796665d5f3a74d9d3f` |
| `ADMIN_PASSWORD` | `Admin2026!` |
| `ADMIN_USERNAME` | `admin` |
| `AIKONA_API_KEY` | `f48941fd-ab51-4edd-b1f2-f202597c9920` |

### 3. ⚠️ КРИТИЧЕСКИ ВАЖНО: DATABASE_URL

**Вы забыли про `DATABASE_URL`!** Это обязательная переменная для работы с базой данных на Render.

Чтобы получить `DATABASE_URL`:
1. Перейдите в настройки вашей PostgreSQL базы данных на Render
2. Откройте раздел "Connections"
3. Скопируйте **External Database URL** (полный URL с доменом)
4. Добавьте его как переменную `DATABASE_URL`

Пример:
```
DATABASE_URL=postgresql://user:pass@dpg-xxxxx-a.frankfurt-postgres.render.com:5432/dbname
```

---

## ❌ НЕ нужно деплоить на GitHub!

**После добавления переменных:**
1. Нажмите "Save Changes" на Render
2. Render **автоматически перезапустит** ваш сервис
3. Всё готово! ✅

**НЕ нужно:**
- ❌ Коммитить изменения в Git
- ❌ Пушнуть на GitHub
- ❌ Триггерить новый деплой

Render использует последний код из GitHub, просто перезапускает сервис с новыми переменными окружения.

---

## ✅ Полный список переменных для добавления:

```
DATABASE_URL = postgresql://... (ваш External Database URL)
JWT_SECRET = e558667549f478078fc03fc2ab8361edc185c736f21a19796665d5f3a74d9d3f
ADMIN_PASSWORD = Admin2026!
ADMIN_USERNAME = admin
AIKONA_API_KEY = f48941fd-ab51-4edd-b1f2-f202597c9920
```

---

## 🔍 Где найти раздел "Environment":

1. Откройте ваш Web Service на Render
2. В боковом меню или вкладках найдите **"Environment"**
3. Не путайте с "Secret Files" (это для файлов, не переменных)

---

## ⚠️ Рекомендация по безопасности:

Пароль `Admin2026!` — это дефолтный пароль из кода. Для продакшена **рекомендуется** изменить его на более безопасный:

- Минимум 12 символов
- Буквы, цифры, спецсимволы
- Не используйте простые слова

Пример: `MySecurePass123!@#`


