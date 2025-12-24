# Быстрая инструкция: Сохранение данных перед деплоем

## ⚠️ ВАЖНО: Сделайте это ПЕРЕД деплоем!

---

## Способ 1: Автоматический (Рекомендуется)

### Шаг 1: Скачайте данные с продакшена

1. Откройте файл `ID/scripts/download-production-data.js`
2. Измените `PRODUCTION_URL` на URL вашего продакшена (например, `https://praktis-id.onrender.com`)
3. Запустите скрипт:

```bash
cd ID
node scripts/download-production-data.js
```

Скрипт автоматически скачает все данные и сохранит их в `backend/data/`.

### Шаг 2: Добавьте данные в репозиторий

```bash
cd ID
git add backend/data/*.json
git commit -m "Backup: Сохранение данных с продакшена перед деплоем"
git push
```

### Шаг 3: Теперь можно безопасно деплоить!

Данные будут в репозитории и сохранятся при деплое.

---

## Способ 2: Ручной (через браузер)

### Шаг 1: Откройте консоль браузера на продакшене

Нажмите F12 → вкладка Console

### Шаг 2: Скачайте данные

Скопируйте и выполните этот код в консоли:

```javascript
// Функция для скачивания JSON
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Скачать контейнеры
fetch('/api/containers')
  .then(r => r.json())
  .then(data => {
    // Преобразуем в нужный формат
    const formatted = { containers: data };
    downloadJSON(formatted, 'objects.json');
    console.log('✓ objects.json скачан');
  });

// Скачать задачи
fetch('/api/tasks')
  .then(r => r.json())
  .then(data => {
    downloadJSON(data, 'tasks.json');
    console.log('✓ tasks.json скачан');
  });

// Скачать снимки
fetch('/api/snapshots')
  .then(r => r.json())
  .then(data => {
    downloadJSON(data, 'snapshots.json');
    console.log('✓ snapshots.json скачан');
  });
```

### Шаг 3: Сохраните файлы

1. Файлы автоматически скачаются в папку Downloads
2. Скопируйте их в `ID/backend/data/`:
   - `objects.json` → `ID/backend/data/objects.json`
   - `tasks.json` → `ID/backend/data/tasks.json`
   - `snapshots.json` → `ID/backend/data/snapshots.json`

### Шаг 4: Добавьте в репозиторий

```bash
cd ID
git add backend/data/*.json
git commit -m "Backup: Данные с продакшена"
git push
```

---

## Способ 3: Через Render.com Shell

### Шаг 1: Откройте Shell на Render.com

1. Зайдите в ваш сервис на Render.com
2. Нажмите "Shell" в меню

### Шаг 2: Скопируйте файлы

```bash
# Просмотрите содержимое файлов
cat backend/data/objects.json
cat backend/data/tasks.json
cat backend/data/snapshots.json
```

### Шаг 3: Скопируйте содержимое

1. Скопируйте JSON из каждого файла
2. Вставьте в соответствующие файлы локально:
   - `ID/backend/data/objects.json`
   - `ID/backend/data/tasks.json`
   - `ID/backend/data/snapshots.json`

### Шаг 4: Добавьте в репозиторий

```bash
cd ID
git add backend/data/*.json
git commit -m "Backup: Данные с продакшена"
git push
```

---

## Проверка после деплоя

После деплоя проверьте:

1. ✅ Контейнеры отображаются
2. ✅ Задачи для разработки на месте
3. ✅ Снимки статистики сохранены

Если что-то не так, данные можно восстановить из бэкапа в репозитории.

---

## ⚠️ Важные замечания

1. **Всегда делайте бэкап перед деплоем!**
2. Файлы данных должны быть в репозитории (проверьте `.gitignore`)
3. После деплоя данные из репозитория автоматически восстановятся
4. Если что-то пошло не так, можно откатить коммит с бэкапом

