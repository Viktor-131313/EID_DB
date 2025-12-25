# Инструкция по сохранению данных при деплое на Render.com

## Проблема
При деплое на Render.com файлы данных из папки `backend/data/` могут быть перезаписаны, если они не находятся в репозитории, или удалены при пересборке.

## Решение: Бэкап и восстановление данных

### Вариант 1: Сохранение данных в репозитории (Рекомендуется)

**Шаг 1: Скачайте данные с продакшена**

1. Зайдите на ваш сервис на Render.com
2. Откройте Shell (в настройках сервиса)
3. Выполните команды для скачивания файлов данных:

```bash
# Создайте временную папку для бэкапа
mkdir -p /tmp/backup

# Скопируйте файлы данных
cp backend/data/objects.json /tmp/backup/
cp backend/data/snapshots.json /tmp/backup/
cp backend/data/tasks.json /tmp/backup/

# Или используйте cat для просмотра содержимого и копирования вручную
cat backend/data/objects.json
cat backend/data/snapshots.json
cat backend/data/tasks.json
```

**Шаг 2: Добавьте данные в локальный репозиторий**

1. Скопируйте содержимое файлов с продакшена в локальные файлы:
   - `ID/backend/data/objects.json`
   - `ID/backend/data/snapshots.json`
   - `ID/backend/data/tasks.json`

2. Убедитесь, что файлы данных НЕ в `.gitignore`:

```bash
# Проверьте .gitignore
cat ID/.gitignore
```

Если там есть `backend/data/*.json`, удалите эту строку.

3. Добавьте файлы в git:

```bash
cd ID
git add backend/data/objects.json
git add backend/data/snapshots.json
git add backend/data/tasks.json
git commit -m "Backup: Сохранение данных с продакшена"
git push
```

**Шаг 3: Деплой**

После этого можно безопасно деплоить - данные будут в репозитории и сохранятся при деплое.

---

### Вариант 2: Использование Render.com Disk (Постоянное хранилище)

Если у вас есть Render.com Disk, можно настроить хранение данных там.

**Шаг 1: Создайте Disk на Render.com**

1. В Dashboard Render.com создайте новый Disk
2. Примонтируйте его к вашему сервису

**Шаг 2: Измените пути к файлам данных в `server.js`**

Измените пути к файлам данных, чтобы они указывали на Disk:

```javascript
// Вместо:
const DATA_FILE = path.join(__dirname, 'data', 'objects.json');

// Используйте:
const DATA_FILE = process.env.DATA_PATH 
  ? path.join(process.env.DATA_PATH, 'objects.json')
  : path.join(__dirname, 'data', 'objects.json');
```

**Шаг 3: Настройте переменную окружения**

В настройках сервиса на Render.com добавьте:
- `DATA_PATH` = путь к смонтированному диску (например, `/mnt/disk/data`)

---

### Вариант 3: Ручной бэкап через API

**Шаг 1: Скачайте данные через API**

Откройте консоль браузера на продакшене и выполните:

```javascript
// Скачать контейнеры и объекты
fetch('/api/containers')
  .then(r => r.json())
  .then(data => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'containers-backup.json';
    a.click();
  });

// Скачать задачи
fetch('/api/tasks')
  .then(r => r.json())
  .then(data => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = 'tasks-backup.json';
    a.href = url;
    a.click();
  });

// Скачать снимки
fetch('/api/snapshots')
  .then(r => r.json())
  .then(data => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = 'snapshots-backup.json';
    a.href = url;
    a.click();
  });
```

**Шаг 2: Сохраните файлы локально**

Скопируйте скачанные файлы в:
- `ID/backend/data/objects.json` (для контейнеров)
- `ID/backend/data/tasks.json`
- `ID/backend/data/snapshots.json`

**Шаг 3: Добавьте в репозиторий и задеплойте**

```bash
cd ID
git add backend/data/*.json
git commit -m "Backup: Сохранение данных перед деплоем"
git push
```

---

## Проверка после деплоя

После деплоя проверьте, что данные сохранились:

1. Откройте приложение на продакшене
2. Проверьте наличие контейнеров и задач
3. Если данные не отображаются, проверьте логи на Render.com

---

## Важно!

⚠️ **Всегда делайте бэкап перед деплоем!**

Если что-то пошло не так, вы сможете восстановить данные из бэкапа.


