/**
 * Функции для обновления отдельных объектов в базе данных
 * (без перезаписи всех данных)
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
        rejectUnauthorized: false
    }
});

/**
 * Обновить один объект в базе данных
 */
async function updateObject(containerId, objectId, objectData) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Обновляем объект
        // ВАЖНО: Для aikonaObjectId нужно проверять не только на truthy, но и на undefined
        // чтобы сохранять 0 и null явно, если они переданы
        const aikonaObjectIdValue = objectData.aikonaObjectId !== undefined && objectData.aikonaObjectId !== '' 
            ? (parseInt(objectData.aikonaObjectId) || null) 
            : null;
        
        console.log(`[updateObject] Updating object ${objectId}, aikonaObjectId: ${aikonaObjectIdValue} (original: ${objectData.aikonaObjectId})`);
        
        await client.query(
            `UPDATE objects 
             SET name = $1, 
                 description = $2, 
                 status = $3, 
                 photo = $4, 
                 aikona_object_id = $5, 
                 blocking_factors = $6::jsonb,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 AND container_id = $8`,
            [
                objectData.name || '',
                objectData.description || '',
                objectData.status || '',
                objectData.photo || null,
                aikonaObjectIdValue,
                JSON.stringify(objectData.blockingFactors || []),
                objectId,
                containerId
            ]
        );
        
        // Удаляем старые акты для этого объекта
        await client.query('DELETE FROM acts WHERE object_id = $1', [objectId]);
        
        // Вставляем новые акты
        const actsToInsert = [];
        
        // Генерированные акты
        (objectData.generatedActs || []).forEach(smr => {
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
        (objectData.sentForApproval || []).forEach(smr => {
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
        (objectData.approvedActs || []).forEach(smr => {
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
        (objectData.rejectedActs || []).forEach(smr => {
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
        (objectData.signedActs || []).forEach(smr => {
            actsToInsert.push({
                object_id: objectId,
                smr_id: smr.id,
                smr_name: smr.name,
                act_type: 'signed',
                count: smr.count || 0,
                total: smr.total || 0
            });
        });
        
        // Вставляем акты
        for (const act of actsToInsert) {
            await client.query(
                `INSERT INTO acts (object_id, smr_id, smr_name, act_type, count, total)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (object_id, smr_id, act_type) 
                 DO UPDATE SET count = EXCLUDED.count, total = EXCLUDED.total, updated_at = CURRENT_TIMESTAMP`,
                [act.object_id, act.smr_id, act.smr_name, act.act_type, act.count, act.total]
            );
        }
        
        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка при обновлении объекта:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Создать новый объект в базе данных
 */
async function createObject(containerId, objectData) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Вставляем объект БЕЗ указания ID - PostgreSQL сам сгенерирует через SERIAL
        // Затем получаем сгенерированный ID
        const insertResult = await client.query(
            `INSERT INTO objects (container_id, name, description, status, photo, aikona_object_id, blocking_factors)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
             RETURNING id`,
            [
                containerId,
                objectData.name || '',
                objectData.description || '',
                objectData.status || '',
                objectData.photo || null,
                objectData.aikonaObjectId || null,
                JSON.stringify(objectData.blockingFactors || [])
            ]
        );
        const objectId = insertResult.rows[0].id;
        
        // Вставляем акты
        const actsToInsert = [];
        
        (objectData.generatedActs || []).forEach(smr => {
            actsToInsert.push({ object_id: objectId, smr_id: smr.id, smr_name: smr.name, act_type: 'generated', count: smr.count || 0, total: smr.total || 0 });
        });
        (objectData.sentForApproval || []).forEach(smr => {
            actsToInsert.push({ object_id: objectId, smr_id: smr.id, smr_name: smr.name, act_type: 'sent', count: smr.count || 0, total: smr.total || 0 });
        });
        (objectData.approvedActs || []).forEach(smr => {
            actsToInsert.push({ object_id: objectId, smr_id: smr.id, smr_name: smr.name, act_type: 'approved', count: smr.count || 0, total: smr.total || 0 });
        });
        (objectData.rejectedActs || []).forEach(smr => {
            actsToInsert.push({ object_id: objectId, smr_id: smr.id, smr_name: smr.name, act_type: 'rejected', count: smr.count || 0, total: smr.total || 0 });
        });
        (objectData.signedActs || []).forEach(smr => {
            actsToInsert.push({ object_id: objectId, smr_id: smr.id, smr_name: smr.name, act_type: 'signed', count: smr.count || 0, total: smr.total || 0 });
        });
        
        for (const act of actsToInsert) {
            await client.query(
                `INSERT INTO acts (object_id, smr_id, smr_name, act_type, count, total)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [act.object_id, act.smr_id, act.smr_name, act.act_type, act.count, act.total]
            );
        }
        
        await client.query('COMMIT');
        return { id: objectId, ...objectData };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка при создании объекта:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Создать новый контейнер в базе данных
 */
async function createContainer(containerData) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Вставляем контейнер БЕЗ указания ID - PostgreSQL сам сгенерирует через SERIAL
        // Затем получаем сгенерированный ID
        // Получаем максимальный display_order для установки порядка нового контейнера
        const maxOrderResult = await client.query('SELECT COALESCE(MAX(display_order), 0) as max_order FROM containers');
        const nextOrder = (maxOrderResult.rows[0].max_order || 0) + 1;
        
        const insertResult = await client.query(
            'INSERT INTO containers (name, display_order) VALUES ($1, $2) RETURNING id',
            [containerData.name || 'Объекты', nextOrder]
        );
        const containerId = insertResult.rows[0].id;
        
        await client.query('COMMIT');
        return { id: containerId, name: containerData.name || 'Объекты', objects: [] };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка при создании контейнера:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Переместить контейнер вверх или вниз в списке
 * @param {number} containerId - ID контейнера для перемещения
 * @param {string} direction - 'up' или 'down'
 */
async function moveContainer(containerId, direction) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Получаем текущий display_order контейнера
        const currentResult = await client.query(
            'SELECT COALESCE(display_order, id) as display_order FROM containers WHERE id = $1',
            [containerId]
        );
        
        if (currentResult.rows.length === 0) {
            throw new Error('Container not found');
        }
        
        let currentOrder = currentResult.rows[0].display_order;
        
        // Если display_order NULL, используем id как порядок
        if (currentOrder === null || currentOrder === undefined) {
            currentOrder = containerId;
            // Обновляем display_order для этого контейнера
            await client.query('UPDATE containers SET display_order = $1 WHERE id = $2', [currentOrder, containerId]);
        }
        
        // Определяем направление и находим соседний контейнер
        let swapOrder;
        let swapContainerId;
        if (direction === 'up') {
            // Находим контейнер с максимальным display_order, который меньше текущего
            // Используем COALESCE для обработки NULL
            const prevResult = await client.query(
                `SELECT id, COALESCE(display_order, id) as display_order 
                 FROM containers 
                 WHERE COALESCE(display_order, id) < $1 
                 ORDER BY COALESCE(display_order, id) DESC LIMIT 1`,
                [currentOrder]
            );
            
            if (prevResult.rows.length === 0) {
                // Уже первый, ничего не делаем
                await client.query('COMMIT');
                return { success: true, message: 'Container is already first' };
            }
            
            swapOrder = prevResult.rows[0].display_order;
            swapContainerId = prevResult.rows[0].id;
        } else if (direction === 'down') {
            // Находим контейнер с минимальным display_order, который больше текущего
            // Используем COALESCE для обработки NULL
            const nextResult = await client.query(
                `SELECT id, COALESCE(display_order, id) as display_order 
                 FROM containers 
                 WHERE COALESCE(display_order, id) > $1 
                 ORDER BY COALESCE(display_order, id) ASC LIMIT 1`,
                [currentOrder]
            );
            
            if (nextResult.rows.length === 0) {
                // Уже последний, ничего не делаем
                await client.query('COMMIT');
                return { success: true, message: 'Container is already last' };
            }
            
            swapOrder = nextResult.rows[0].display_order;
            swapContainerId = nextResult.rows[0].id;
        } else {
            throw new Error('Invalid direction. Use "up" or "down"');
        }
        
        // Обновляем display_order для соседнего контейнера, если он NULL
        await client.query(
            'UPDATE containers SET display_order = COALESCE(display_order, id) WHERE id = $1 AND display_order IS NULL',
            [swapContainerId]
        );
        
        // Перечитываем display_order соседнего контейнера
        const swapResult = await client.query(
            'SELECT COALESCE(display_order, id) as display_order FROM containers WHERE id = $1',
            [swapContainerId]
        );
        swapOrder = swapResult.rows[0].display_order;
        
        // Меняем порядок: используем временное значение -1 для избежания конфликтов
        await client.query('UPDATE containers SET display_order = -1 WHERE id = $1', [containerId]);
        await client.query('UPDATE containers SET display_order = $1 WHERE display_order = $2', [currentOrder, swapOrder]);
        await client.query('UPDATE containers SET display_order = $1 WHERE id = $2', [swapOrder, containerId]);
        
        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка при перемещении контейнера:', error);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    updateObject,
    createObject,
    createContainer,
    moveContainer
};

