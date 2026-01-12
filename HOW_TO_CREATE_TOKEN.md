# 🔑 Как создать Personal Access Token на GitHub

## ⚠️ Важно: Deploy Keys ≠ Personal Access Token

Вы сейчас на странице **Deploy keys** (SSH ключи) - это НЕ то, что нужно!

## ✅ Правильный путь к токенам:

### Шаг 1: Откройте настройки токенов

1. Зайдите на GitHub.com
2. Нажмите на **ваш аватар** (правый верхний угол)
3. Выберите **Settings** (Настройки)
4. В левом меню прокрутите вниз до раздела **Developer settings**
5. Нажмите **Personal access tokens**
6. Выберите **Tokens (classic)** или **Fine-grained tokens**

### Шаг 2: Создайте токен

1. Нажмите **"Generate new token"** → **"Generate new token (classic)"**
2. Заполните форму:
   - **Note:** `EID_DB Push Access` (любое название)
   - **Expiration:** выберите срок (например, 90 days)
   - **Select scopes:** отметьте **repo** (все галочки в разделе repo)
3. Нажмите **"Generate token"** внизу страницы
4. **СКОПИРУЙТЕ ТОКЕН СРАЗУ!** Он начинается с `ghp_` или похожего

### Шаг 3: Используйте токен

В терминале:

```bash
cd ID
git push https://ВАШ_ТОКЕН@github.com/Viktor-131313/EID_DB.git main
```

Или сохраните в remote:

```bash
git remote set-url origin https://ВАШ_ТОКЕН@github.com/Viktor-131313/EID_DB.git
git push -u origin main
```

## 🔗 Прямая ссылка:

https://github.com/settings/tokens

Или:
1. https://github.com/settings/profile
2. Слева: Developer settings
3. Personal access tokens → Tokens (classic)

## 📝 Альтернатива: GitHub CLI

Если не хотите возиться с токенами:

1. Установите GitHub CLI: https://cli.github.com/
2. Выполните:
   ```bash
   gh auth login
   ```
3. Следуйте инструкциям
4. После этого `git push` будет работать автоматически



