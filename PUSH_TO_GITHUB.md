# 🚀 Инструкция: Push на GitHub

## Текущая ситуация
Ваш репозиторий на GitHub: `https://github.com/Viktor-131313/EID_DB.git`

## Шаг 1: Проверьте текущий remote

```bash
cd ID
git remote -v
```

Если remote уже настроен правильно, переходите к шагу 3.

## Шаг 2: Если remote неправильный или его нет

```bash
# Удалите старый remote (если есть)
git remote remove origin

# Добавьте правильный remote
git remote add origin https://github.com/Viktor-131313/EID_DB.git
```

## Шаг 3: Решение проблемы аутентификации

GitHub больше не принимает пароли напрямую. Нужен **Personal Access Token**.

### Создайте токен:

**⚠️ ВАЖНО:** Не путайте с Deploy Keys! Токены находятся в другом месте.

1. Зайдите на GitHub.com
2. Нажмите на **ваш аватар** (правый верхний угол) → **Settings**
3. В левом меню прокрутите вниз до **Developer settings**
4. Нажмите **Personal access tokens** → **Tokens (classic)**
5. Нажмите **"Generate new token"** → **"Generate new token (classic)"**
6. Заполните:
   - **Note:** `EID_DB Push` (любое название)
   - **Expiration:** выберите срок (например, 90 days)
   - **Select scopes:** отметьте **repo** (все галочки в разделе repo)
7. Нажмите **"Generate token"** внизу
8. **СКОПИРУЙТЕ ТОКЕН СРАЗУ!** Он начинается с `ghp_` (показывается только один раз!)

**🔗 Прямая ссылка:** https://github.com/settings/tokens

### Используйте токен:

**Вариант А: В команде push (безопаснее)**
```bash
git push https://ВАШ_ТОКЕН@github.com/Viktor-131313/EID_DB.git main
```

**Вариант Б: В remote URL (удобнее для постоянного использования)**
```bash
git remote set-url origin https://ВАШ_ТОКЕН@github.com/Viktor-131313/EID_DB.git
git push -u origin main
```

**Вариант В: GitHub CLI (самый удобный)**
```bash
# Установите GitHub CLI если нет: https://cli.github.com/
gh auth login
git push -u origin main
```

## Шаг 4: Выполните push

```bash
git branch -M main
git push -u origin main
```

## Ожидаемый результат

Вы должны увидеть:
```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
Delta compression using up to X threads
Compressing objects: 100% (XX/XX), done.
Writing objects: 100% (XX/XX), XXX.XX KiB | XXX.XX KiB/s, done.
Total XX (delta X), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (X/X), done.
To https://github.com/Viktor-131313/EID_DB.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

## ❗ Если все еще ошибка 403

1. Проверьте правильность токена
2. Убедитесь, что токен имеет права **repo**
3. Попробуйте использовать SSH вместо HTTPS (см. `GITHUB_AUTH_FIX.md`)

