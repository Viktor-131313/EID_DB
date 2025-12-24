# ✅ Финальные правильные команды для Render.com

## Если Root Directory = `ID`

Render автоматически переходит в папку ID перед выполнением команд, поэтому команды должны быть **относительно папки ID**.

### Build Command:
```
cd backend && npm install && cd ../frontend && npm install && npm run build
```

### Start Command:
```
cd backend && npm start
```

## ⚠️ Важно про префикс "ID/ $"

Если вы видите `ID/ $` в поле ввода - это **визуальный индикатор** того, что команды выполняются из папки ID. 

**Вы должны вводить команды БЕЗ этого префикса!**

Если Render показывает это как часть поля и вы не можете удалить - попробуйте:

1. **Скопируйте команду целиком:**
   ```
   cd backend && npm install && cd ../frontend && npm install && npm run build
   ```

2. **Выделите ВСЁ в поле ввода** (Ctrl+A) и **вставьте команду** (Ctrl+V)

3. Это должно перезаписать всё содержимое, включая префикс

## Альтернативный вариант (если префикс мешает):

Если префикс действительно является частью команды и не удаляется, используйте команды БЕЗ `cd`:

### Build Command (если Root Directory = ID):
```
npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend
```

### Start Command (если Root Directory = ID):
```
npm start --prefix backend
```

## Проверка правильности:

После сохранения команд, они должны выглядеть так:

**Build Command:**
```
cd backend && npm install && cd ../frontend && npm install && npm run build
```
(БЕЗ префикса ID/ $ в начале!)

**Start Command:**
```
cd backend && npm start
```
(БЕЗ префикса ID/ $ в начале!)

