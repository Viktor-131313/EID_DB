# 🔐 Исправление ошибки 403 при push на GitHub

## Проблема

Ошибка:
```
remote: Permission to Viktor-131313/EID_DB.git denied to Viktor-1313.
fatal: unable to access 'https://github.com/Viktor-131313/EID_DB.git/': The requested URL returned error: 403
```

**Причина:** Несоответствие имени пользователя или проблема с аутентификацией.

## Решения

### Вариант 1: Использовать Personal Access Token (рекомендуется)

1. **Создайте токен на GitHub:**
   - Зайдите на GitHub.com
   - Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token (classic)
   - Дайте название: "EID_DB Access"
   - Выберите срок действия (например, 90 дней)
   - Отметьте права: **repo** (все галочки)
   - Нажмите "Generate token"
   - **ВАЖНО:** Скопируйте токен сразу! Он больше не будет показан.

2. **Используйте токен при push:**
   ```bash
   git push https://ВАШ_ТОКЕН@github.com/Viktor-131313/EID_DB.git main
   ```
   
   Или обновите remote URL:
   ```bash
   git remote set-url origin https://ВАШ_ТОКЕН@github.com/Viktor-131313/EID_DB.git
   git push -u origin main
   ```

3. **Или используйте GitHub CLI:**
   ```bash
   gh auth login
   git push -u origin main
   ```

### Вариант 2: Использовать SSH (альтернатива)

1. **Создайте SSH ключ (если нет):**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. **Добавьте публичный ключ на GitHub:**
   - Скопируйте содержимое `~/.ssh/id_ed25519.pub`
   - GitHub → Settings → SSH and GPG keys → New SSH key
   - Вставьте ключ и сохраните

3. **Измените remote URL на SSH:**
   ```bash
   git remote set-url origin git@github.com:Viktor-131313/EID_DB.git
   git push -u origin main
   ```

### Вариант 3: Проверить правильность имени пользователя

Если вы используете другой аккаунт GitHub:

```bash
# Проверить текущий remote
git remote -v

# Изменить на правильный репозиторий
git remote set-url origin https://github.com/ПРАВИЛЬНОЕ_ИМЯ/EID_DB.git
```

## Быстрое решение (для Windows с Git Credential Manager)

1. Зайдите в **Панель управления Windows** → **Учетные записи** → **Диспетчер учетных данных**
2. Найдите записи для `github.com`
3. Удалите старые записи
4. При следующем `git push` введите правильные данные

Или используйте:
```bash
git config --global credential.helper manager-core
```

## Проверка после исправления

```bash
git push -u origin main
```

Если все правильно, вы увидите:
```
Enumerating objects: ...
Writing objects: ...
To https://github.com/Viktor-131313/EID_DB.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```



