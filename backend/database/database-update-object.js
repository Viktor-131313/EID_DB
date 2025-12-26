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
        
        // Получаем следующий ID для объекта
        const idResult = await client.query(
            'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM objects WHERE container_id = $1',
            [containerId]
        );
        const objectId = idResult.rows[0].next_id;
        
        // Вставляем объект
        await client.query(
            `INSERT INTO objects (id, container_id, name, description, status, photo, aikona_object_id, blocking_factors)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
            [
                objectId,
                containerId,
                objectData.name || '',
                objectData.description || '',
                objectData.status || '',
                objectData.photo || null,
                objectData.aikonaObjectId || null,
                JSON.stringify(objectData.blockingFactors || [])
            ]
        );
        
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
        
        // Получаем следующий ID для контейнера
        const idResult = await client.query(
            'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM containers'
        );
        const containerId = idResult.rows[0].next_id;
        
        // Вставляем контейнер
        await client.query(
            'INSERT INTO containers (id, name) VALUES ($1, $2)',
            [containerId, containerData.name || 'Объекты']
        );
        
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

module.exports = {
    updateObject,
    createObject,
    createContainer
};

