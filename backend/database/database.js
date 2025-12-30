/**
 * Модуль для работы с PostgreSQL базой данных
 */

const { Pool } = require('pg');

// Создаем connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
        rejectUnauthorized: false
    }
});

// Проверка подключения
pool.on('connect', () => {
    console.log('✅ Подключение к PostgreSQL установлено');
});

pool.on('error', (err) => {
    console.error('❌ Ошибка подключения к PostgreSQL:', err);
});

/**
 * Инициализация базы данных (создание таблиц, если их нет)
 */
async function initializeDatabase() {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Выполняем SQL схему
        await pool.query(schema);
        console.log('✅ База данных инициализирована');
        
        // Проверяем и добавляем колонку aikona_object_id, если её нет (миграция)
        try {
            await pool.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'objects' 
                        AND column_name = 'aikona_object_id'
                    ) THEN
                        ALTER TABLE objects ADD COLUMN aikona_object_id INTEGER;
                        RAISE NOTICE 'Column aikona_object_id added to objects table';
                    END IF;
                END $$;
            `);
            console.log('✅ Миграция aikona_object_id проверена/выполнена');
        } catch (migrationError) {
            // Игнорируем ошибку, если колонка уже существует
            if (!migrationError.message.includes('already exists')) {
                console.warn('⚠️  Предупреждение при миграции aikona_object_id:', migrationError.message);
            }
        }

        // Проверяем и изменяем task_number на nullable (миграция)
        try {
            await pool.query(`
                DO $$ 
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'tasks' 
                        AND column_name = 'task_number'
                        AND is_nullable = 'NO'
                    ) THEN
                        ALTER TABLE tasks ALTER COLUMN task_number DROP NOT NULL;
                        RAISE NOTICE 'Column task_number changed to nullable';
                    END IF;
                END $$;
            `);
            console.log('✅ Миграция task_number (nullable) проверена/выполнена');
        } catch (migrationError) {
            console.warn('⚠️  Предупреждение при миграции task_number:', migrationError.message);
        }

        // Проверяем и добавляем колонку task_manager_link, если её нет (миграция)
        try {
            await pool.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'tasks' 
                        AND column_name = 'task_manager_link'
                    ) THEN
                        ALTER TABLE tasks ADD COLUMN task_manager_link TEXT;
                        RAISE NOTICE 'Column task_manager_link added to tasks table';
                    END IF;
                END $$;
            `);
            console.log('✅ Миграция task_manager_link проверена/выполнена');
        } catch (migrationError) {
            if (!migrationError.message.includes('already exists')) {
                console.warn('⚠️  Предупреждение при миграции task_manager_link:', migrationError.message);
            }
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
        throw error;
    }
}

/**
 * Получить все контейнеры с объектами и актами
 */
async function getAllContainers() {
    try {
        // Автоматически добавляем колонку aikona_object_id, если её нет
        try {
            await pool.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'objects' 
                        AND column_name = 'aikona_object_id'
                    ) THEN
                        ALTER TABLE objects ADD COLUMN aikona_object_id INTEGER;
                        RAISE NOTICE 'Column aikona_object_id added';
                    END IF;
                END $$;
            `);
        } catch (migrationError) {
            // Игнорируем ошибки миграции, если колонка уже существует
            if (!migrationError.message.includes('already exists')) {
                console.warn('⚠️  Предупреждение при проверке миграции:', migrationError.message);
            }
        }
        
        // Автоматически добавляем колонку display_order, если её нет (миграция)
        try {
            await pool.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'containers' 
                        AND column_name = 'display_order'
                    ) THEN
                        ALTER TABLE containers ADD COLUMN display_order INTEGER DEFAULT 0;
                        -- Устанавливаем display_order для существующих записей
                        UPDATE containers SET display_order = id;
                        RAISE NOTICE 'Column display_order added to containers table';
                    END IF;
                END $$;
            `);
        } catch (migrationError) {
            if (!migrationError.message.includes('already exists')) {
                console.warn('⚠️  Предупреждение при миграции display_order:', migrationError.message);
            }
        }
        
        // Получаем контейнеры, сортируя по display_order
        const containersResult = await pool.query(
            'SELECT id, name, display_order, created_at, updated_at FROM containers ORDER BY display_order, id'
        );
        
        const containers = [];
        
        for (const containerRow of containersResult.rows) {
            // Получаем объекты контейнера
            const objectsResult = await pool.query(
                `SELECT id, name, description, status, photo, aikona_object_id, blocking_factors, 
                        created_at, updated_at 
                 FROM objects 
                 WHERE container_id = $1 
                 ORDER BY id`,
                [containerRow.id]
            );
            
            const objects = [];
            
            for (const objectRow of objectsResult.rows) {
                // Получаем акты объекта
                const actsResult = await pool.query(
                    `SELECT smr_id, smr_name, act_type, count, total 
                     FROM acts 
                     WHERE object_id = $1 
                     ORDER BY smr_id, act_type`,
                    [objectRow.id]
                );
                
                // Группируем акты по типам и СМР
                const actsByType = {
                    generated: [],
                    sent: [],
                    approved: [],
                    rejected: [],
                    signed: []
                };
                
                const smrMap = new Map();
                
                actsResult.rows.forEach(act => {
                    if (!smrMap.has(act.smr_id)) {
                        smrMap.set(act.smr_id, {
                            id: act.smr_id,
                            name: act.smr_name
                        });
                    }
                    
                    const typeMap = {
                        'generated': 'generatedActs',
                        'sent': 'sentForApproval',
                        'approved': 'approvedActs',
                        'rejected': 'rejectedActs',
                        'signed': 'signedActs'
                    };
                    
                    const key = typeMap[act.act_type];
                    if (!actsByType[key]) {
                        actsByType[key] = [];
                    }
                    
                    actsByType[key].push({
                        id: act.smr_id,
                        name: act.smr_name,
                        count: act.count,
                        total: act.total
                    });
                });
                
                objects.push({
                    id: objectRow.id,
                    name: objectRow.name,
                    description: objectRow.description || '',
                    status: objectRow.status || '',
                    photo: objectRow.photo || null,
                    aikonaObjectId: objectRow.aikona_object_id || null,
                    generatedActs: actsByType.generatedActs || [],
                    sentForApproval: actsByType.sentForApproval || [],
                    approvedActs: actsByType.approvedActs || [],
                    rejectedActs: actsByType.rejectedActs || [],
                    signedActs: actsByType.signedActs || [],
                    blockingFactors: objectRow.blocking_factors || [],
                    createdAt: objectRow.created_at.toISOString(),
                    updatedAt: objectRow.updated_at.toISOString()
                });
            }
            
            containers.push({
                id: containerRow.id,
                name: containerRow.name,
                objects: objects
            });
        }
        
        return { containers };
    } catch (error) {
        console.error('Ошибка при получении контейнеров:', error);
        console.error('Stack trace:', error.stack);
        // Возвращаем пустую структуру вместо выброса ошибки
        // Это позволит приложению работать даже если база данных еще не инициализирована
        return { containers: [] };
    }
}

/**
 * Сохранить контейнеры с объектами и актами
 */
async function saveContainers(containersData) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Очищаем существующие данные (или можно делать upsert)
        await client.query('DELETE FROM acts');
        await client.query('DELETE FROM objects');
        await client.query('DELETE FROM containers');
        
        for (const container of containersData.containers || []) {
            // Вставляем контейнер
            const containerResult = await client.query(
                'INSERT INTO containers (id, name, display_order) VALUES ($1, $2, $3) RETURNING id',
                [container.id, container.name, container.display_order || container.id || 0]
            );
            
            const containerId = containerResult.rows[0].id;
            
            for (const obj of container.objects || []) {
                // Вставляем объект
                const objectResult = await client.query(
                    `INSERT INTO objects (id, container_id, name, description, status, photo, aikona_object_id, blocking_factors)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
                     RETURNING id`,
                    [
                        obj.id,
                        containerId,
                        obj.name || '',
                        obj.description || '',
                        obj.status || '',
                        obj.photo || null,
                        obj.aikonaObjectId || null,
                        JSON.stringify(obj.blockingFactors || [])
                    ]
                );
                
                const objectId = objectResult.rows[0].id;
                
                // Вставляем акты
                const actsToInsert = [];
                
                // Генерированные акты
                (obj.generatedActs || []).forEach(smr => {
                    actsToInsert.push({
                        object_id: objectId,
                        smr_id: smr.id,
                        smr_name: smr.name,
                        act_type: 'generated',
                        count: smr.count || 0,
                        total: smr.total || 0
                    });
                });
                
                // Отправленные акты
                (obj.sentForApproval || []).forEach(smr => {
                    actsToInsert.push({
                        object_id: objectId,
                        smr_id: smr.id,
                        smr_name: smr.name,
                        act_type: 'sent',
                        count: smr.count || 0,
                        total: smr.total || 0
                    });
                });
                
                // Согласованные акты
                (obj.approvedActs || []).forEach(smr => {
                    actsToInsert.push({
                        object_id: objectId,
                        smr_id: smr.id,
                        smr_name: smr.name,
                        act_type: 'approved',
                        count: smr.count || 0,
                        total: smr.total || 0
                    });
                });
                
                // Отклоненные акты
                (obj.rejectedActs || []).forEach(smr => {
                    actsToInsert.push({
                        object_id: objectId,
                        smr_id: smr.id,
                        smr_name: smr.name,
                        act_type: 'rejected',
                        count: smr.count || 0,
                        total: smr.total || 0
                    });
                });
                
                // Подписанные акты
                (obj.signedActs || []).forEach(smr => {
                    actsToInsert.push({
                        object_id: objectId,
                        smr_id: smr.id,
                        smr_name: smr.name,
                        act_type: 'signed',
                        count: smr.count || 0,
                        total: smr.total || 0
                    });
                });
                
                // Вставляем акты пакетами для производительности
                for (const act of actsToInsert) {
                    await client.query(
                        `INSERT INTO acts (object_id, smr_id, smr_name, act_type, count, total)
                         VALUES ($1, $2, $3, $4, $5, $6)
                         ON CONFLICT (object_id, smr_id, act_type) 
                         DO UPDATE SET count = EXCLUDED.count, total = EXCLUDED.total, updated_at = CURRENT_TIMESTAMP`,
                        [act.object_id, act.smr_id, act.smr_name, act.act_type, act.count, act.total]
                    );
                }
            }
        }
        
        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка при сохранении контейнеров:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Получить все задачи
 */
async function getAllTasks() {
    try {
        // Проверяем, существует ли колонка task_manager_link
        const columnCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            AND column_name = 'task_manager_link'
        `);
        
        const hasTaskManagerLink = columnCheck.rows.length > 0;
        
        const query = hasTaskManagerLink
            ? `SELECT id, task_number, description, discovery_date, status, 
                      planned_fix_month, planned_fix_year, priority, task_manager_link,
                      created_at, updated_at
               FROM tasks
               ORDER BY 
                   CASE priority 
                       WHEN 'critical' THEN 1 
                       WHEN 'non-critical' THEN 2 
                       WHEN 'user-request' THEN 3 
                       ELSE 4 
                   END,
                   id`
            : `SELECT id, task_number, description, discovery_date, status, 
                      planned_fix_month, planned_fix_year, priority,
                      created_at, updated_at
               FROM tasks
               ORDER BY 
                   CASE priority 
                       WHEN 'critical' THEN 1 
                       WHEN 'non-critical' THEN 2 
                       WHEN 'user-request' THEN 3 
                       ELSE 4 
                   END,
                   id`;
        
        const result = await pool.query(query);
        
        return result.rows.map(row => ({
            id: row.id,
            taskNumber: row.task_number,
            description: row.description,
            discoveryDate: row.discovery_date ? row.discovery_date.toISOString().split('T')[0] : null,
            status: row.status,
            plannedFixMonth: row.planned_fix_month,
            plannedFixYear: row.planned_fix_year,
            priority: row.priority,
            taskManagerLink: row.task_manager_link || null,
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString()
        }));
    } catch (error) {
        console.error('Ошибка при получении задач:', error);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

/**
 * Сохранить задачи
 */
async function saveTasks(tasks) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Удаляем все задачи и вставляем заново (можно делать upsert)
        await client.query('DELETE FROM tasks');
        
        // Проверяем, существует ли колонка task_manager_link
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            AND column_name = 'task_manager_link'
        `);
        const hasTaskManagerLink = columnCheck.rows.length > 0;
        
        for (const task of tasks || []) {
            try {
                if (hasTaskManagerLink) {
                    await client.query(
                        `INSERT INTO tasks (id, task_number, description, discovery_date, status, 
                                          planned_fix_month, planned_fix_year, priority, task_manager_link)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                        [
                            task.id,
                            task.taskNumber || null,
                            task.description || '',
                            task.discoveryDate || null,
                            task.status || 'To Do',
                            task.plannedFixMonth || null,
                            task.plannedFixYear || null,
                            task.priority || 'non-critical',
                            (task.taskManagerLink && typeof task.taskManagerLink === 'string' && task.taskManagerLink.trim() !== '' ? task.taskManagerLink.trim() : null)
                        ]
                    );
                } else {
                    await client.query(
                        `INSERT INTO tasks (id, task_number, description, discovery_date, status, 
                                          planned_fix_month, planned_fix_year, priority)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            task.id,
                            task.taskNumber || null,
                            task.description || '',
                            task.discoveryDate || null,
                            task.status || 'To Do',
                            task.plannedFixMonth || null,
                            task.plannedFixYear || null,
                            task.priority || 'non-critical'
                        ]
                    );
                }
            } catch (insertError) {
                console.error(`Ошибка при вставке задачи ${task.id}:`, insertError);
                console.error(`Task data:`, JSON.stringify(task, null, 2));
                throw insertError;
            }
        }
        
        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка при сохранении задач:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Получить все снимки
 */
async function getAllSnapshots() {
    try {
        const result = await pool.query(
            'SELECT id, date, type, containers_data FROM snapshots ORDER BY date DESC'
        );
        
        return result.rows.map(row => ({
            id: row.id,
            date: row.date.toISOString(),
            type: row.type,
            containers: row.containers_data
        }));
    } catch (error) {
        console.error('Ошибка при получении снимков:', error);
        throw error;
    }
}

/**
 * Сохранить снимок
 */
async function saveSnapshot(snapshot) {
    try {
        const result = await pool.query(
            `INSERT INTO snapshots (id, date, type, containers_data)
             VALUES ($1, $2, $3, $4::jsonb)
             RETURNING id`,
            [
                snapshot.id,
                snapshot.date,
                snapshot.type || 'meeting',
                JSON.stringify(snapshot.containers || [])
            ]
        );
        
        return result.rows[0].id;
    } catch (error) {
        console.error('Ошибка при сохранении снимка:', error);
        throw error;
    }
}

/**
 * Удалить снимок
 */
async function deleteSnapshot(snapshotId) {
    try {
        await pool.query('DELETE FROM snapshots WHERE id = $1', [snapshotId]);
        return true;
    } catch (error) {
        console.error('Ошибка при удалении снимка:', error);
        throw error;
    }
}

// Импортируем функции для обновления отдельных объектов
const { updateObject: updateObjectDirect, createObject: createObjectDirect, createContainer: createContainerDirect } = require('./database-update-object');

module.exports = {
    pool,
    initializeDatabase,
    getAllContainers,
    saveContainers,
    getAllTasks,
    saveTasks,
    getAllSnapshots,
    saveSnapshot,
    deleteSnapshot,
    updateObject: updateObjectDirect,
    createObject: createObjectDirect,
    createContainer: createContainerDirect
};
