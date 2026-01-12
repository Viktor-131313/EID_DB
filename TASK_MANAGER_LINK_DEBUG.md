# 🔍 Диагностика проблемы с taskManagerLink

## Проблема

После сохранения задачи с ссылкой на таск-менеджер:
1. Ссылка не отображается при повторном открытии формы редактирования
2. Кнопка с иконкой не появляется в таблице задач

## Добавлено логирование

### Фронтенд:
1. В `TaskModal.handleSubmit` - логирование отправляемых данных
2. В `api-tasks.updateTask` - логирование данных перед отправкой и в ответе
3. В `api-tasks.fetchTasks` - логирование загруженных задач

### Бэкенд:
1. В `POST /api/tasks` - логирование тела запроса и созданной задачи
2. В `PUT /api/tasks/:taskId` - логирование тела запроса, текущей и обновленной задачи
3. В `database.saveTasks` - логирование taskManagerLink при сохранении
4. В `database.getAllTasks` - логирование taskManagerLink при загрузке

## Что нужно проверить

1. **В консоли браузера** после сохранения задачи:
   - `api-tasks: taskManagerLink in response:` - должно показать значение из ответа сервера
   - `api-tasks: Fetched tasks:` - должно показать все задачи с taskManagerLink
   - `api-tasks: First task taskManagerLink:` - должно показать taskManagerLink первой задачи

2. **В логах Render** после сохранения задачи:
   - `[PUT /api/tasks/X] Updated task:` - должно показать taskManagerLink в обновленной задаче
   - `[saveTasks] Saving task X with taskManagerLink:` - должно показать значение при сохранении
   - `[getAllTasks] Task X taskManagerLink:` - должно показать значение при загрузке

## Следующие шаги

После деплоя и тестирования нужно проверить логи, чтобы понять:
1. Сохраняется ли taskManagerLink в базу данных
2. Загружается ли taskManagerLink из базы данных
3. Передается ли taskManagerLink в ответе сервера
4. Получает ли фронтенд taskManagerLink в ответе

---

**Используйте логи для диагностики проблемы!**


