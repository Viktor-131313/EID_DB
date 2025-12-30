-- Схема базы данных для Praktis ID Dashboard

-- Таблица контейнеров
CREATE TABLE IF NOT EXISTS containers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица объектов
CREATE TABLE IF NOT EXISTS objects (
    id SERIAL PRIMARY KEY,
    container_id INTEGER NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status TEXT,
    photo TEXT,
    aikona_object_id INTEGER,
    blocking_factors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица актов (все типы актов хранятся в одной таблице)
CREATE TABLE IF NOT EXISTS acts (
    id SERIAL PRIMARY KEY,
    object_id INTEGER NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
    smr_id INTEGER NOT NULL, -- ID СМР (вида работ)
    smr_name VARCHAR(255) NOT NULL,
    act_type VARCHAR(50) NOT NULL, -- 'generated', 'sent', 'approved', 'rejected', 'signed'
    count INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(object_id, smr_id, act_type)
);

-- Индекс для быстрого поиска актов по объекту и типу
CREATE INDEX IF NOT EXISTS idx_acts_object_type ON acts(object_id, act_type);
CREATE INDEX IF NOT EXISTS idx_acts_smr ON acts(object_id, smr_id);

-- Таблица задач разработки
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    task_number INTEGER,
    description TEXT NOT NULL,
    discovery_date DATE,
    status VARCHAR(50) DEFAULT 'To Do',
    planned_fix_month VARCHAR(2),
    planned_fix_year INTEGER,
    priority VARCHAR(50) DEFAULT 'non-critical',
    task_manager_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица снимков статистики
CREATE TABLE IF NOT EXISTS snapshots (
    id BIGSERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50) DEFAULT 'meeting',
    containers_data JSONB NOT NULL
);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_containers_updated_at BEFORE UPDATE ON containers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON objects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_acts_updated_at BEFORE UPDATE ON acts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
