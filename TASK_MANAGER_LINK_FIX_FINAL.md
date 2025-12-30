# 🔧 Финальное исправление проблемы с сохранением ссылки на таск-менеджер

## Проблема

При сохранении задачи поле `taskManagerLink` не отправлялось на сервер, хотя было заполнено в форме.

## Причина

При использовании spread operator `...formData` и последующем переопределении полей, поле `taskManagerLink` могло не включаться в объект, если оно было пустой строкой или undefined.

## ✅ Исправление

Изменен способ формирования объекта `taskData` в `handleSubmit` функции `TaskModal`:

**Было:**
```javascript
const taskData = {
  ...formData,
  taskNumber: formData.taskNumber ? parseInt(formData.taskNumber) : null,
  plannedFixMonth: formData.plannedFixMonth || null,
  plannedFixYear: formData.plannedFixYear ? parseInt(formData.plannedFixYear) : null,
  taskManagerLink: formData.taskManagerLink || null
};
```

**Стало:**
```javascript
const taskData = {
  taskNumber: formData.taskNumber ? parseInt(formData.taskNumber) : null,
  description: formData.description || '',
  discoveryDate: formData.discoveryDate || new Date().toISOString().split('T')[0],
  status: formData.status || 'To Do',
  plannedFixMonth: formData.plannedFixMonth || null,
  plannedFixYear: formData.plannedFixYear ? parseInt(formData.plannedFixYear) : null,
  priority: formData.priority || 'non-critical',
  taskManagerLink: (formData.taskManagerLink && formData.taskManagerLink.trim() !== '') ? formData.taskManagerLink.trim() : null
};
```

Теперь все поля явно перечислены, что гарантирует их включение в запрос.

## 🔄 Что нужно сделать

1. **Закоммитьте и запушьте изменения:**
   ```bash
   git add .
   git commit -m "Fix: явное формирование taskData для гарантии передачи taskManagerLink"
   git push
   ```

2. **Render автоматически задеплоит изменения**

3. **Попробуйте снова добавить ссылку на таск-менеджер**

4. **Проверьте консоль браузера** - должно быть видно:
   - `TaskModal: Submitting task data:` с полем `taskManagerLink`
   - `TaskModal: taskManagerLink value:` с конкретным значением

---

**После деплоя ссылка должна сохраняться и кнопка должна появляться!**

