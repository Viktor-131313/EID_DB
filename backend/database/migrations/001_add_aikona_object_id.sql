-- Миграция: Добавление поля aikona_object_id в таблицу objects
-- Выполнить вручную на существующей базе данных, если поле еще не добавлено

ALTER TABLE objects 
ADD COLUMN IF NOT EXISTS aikona_object_id INTEGER;

-- Комментарий к полю
COMMENT ON COLUMN objects.aikona_object_id IS 'ID объекта в системе Айкона для синхронизации данных';

