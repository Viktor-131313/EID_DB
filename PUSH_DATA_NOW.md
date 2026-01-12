# 🚨 СРОЧНО: Запушьте данные на GitHub!

## Проблема

Ваши данные закоммичены локально, но **НЕ запушены на GitHub**. 

Когда Render просыпается, он берет данные из GitHub → ваши данные теряются!

## ✅ РЕШЕНИЕ (выполните СЕЙЧАС):

### Шаг 1: Получите токен GitHub

1. Откройте: https://github.com/settings/tokens
2. Нажмите: **"Generate new token"** → **"Generate new token (classic)"**
3. Заполните:
   - **Note:** `EID_DB Push`
   - **Expiration:** 90 days (или нужный срок)
   - **Select scopes:** отметьте **repo** (все галочки)
4. Нажмите **"Generate token"**
5. **СКОПИРУЙТЕ ТОКЕН** (он начинается с `ghp_`)

### Шаг 2: Запушьте данные

**В PowerShell выполните:**

```powershell
cd C:\Users\Driga_VA\Academy_SetlSoft\ID

# Замените ВАШ_ТОКЕН на скопированный токен
$token = "ВАШ_ТОКЕН"
git push https://${token}@github.com/Viktor-131313/EID_DB.git main
```

**ИЛИ в одну строку (замените ВАШ_ТОКЕН):**

```powershell
git push https://ВАШ_ТОКЕН@github.com/Viktor-131313/EID_DB.git main
```

### Шаг 3: Проверьте успех

Должны увидеть что-то вроде:
```
Enumerating objects: ...
Writing objects: ...
To https://github.com/Viktor-131313/EID_DB.git
   5b04498..ab4c3cf  main -> main
```

### Шаг 4: Подождите деплой Render

После успешного пуша:
1. Подождите 1-2 минуты (Render автоматически задеплоит)
2. ИЛИ зайдите на Render.com → Manual Deploy → Deploy latest commit

### Шаг 5: Проверьте данные на продакшене

Откройте ваш сайт и проверьте, что данные появились!

---

## ⚠️ ВАЖНО: После этого

**ВСЕГДА после коммита данных делайте PUSH:**

```powershell
git add backend/data/*.json
git commit -m "Backup: Данные с продакшена"
git push origin main  # ⚠️ НЕ ЗАБЫВАЙТЕ ЭТУ КОМАНДУ!
```

Если `git push` не работает без токена, используйте:
```powershell
git push https://ВАШ_ТОКЕН@github.com/Viktor-131313/EID_DB.git main
```

---

## 🔍 Проверка: данные на GitHub?

После пуша проверьте:
- Откройте: https://github.com/Viktor-131313/EID_DB/blob/main/backend/data/objects.json
- Если файл содержит ваши данные (271 акт) → всё хорошо!
- Если файл пустой или старый → push не сработал, попробуйте снова

