/**
 * Сервис для автоматической синхронизации данных из API Айконы
 */

const { syncObjectFromAikona } = require('./aikona-sync');
const dataAdapter = require('../database/adapter');
const fs = require('fs');
const path = require('path');

const SYNC_LOG_FILE = path.join(__dirname, '..', 'data', 'aikona-sync-log.json');

/**
 * Синхронизировать все объекты с указанным aikonaObjectId
 */
async function syncAllObjectsFromAikona() {
    try {
        console.log(`[Aikona Auto-Sync] Начало автоматической синхронизации в ${new Date().toISOString()}`);
        
        const data = await dataAdapter.readData();
        const containers = data.containers || [];
        
        let syncedCount = 0;
        let errorCount = 0;
        const errors = [];
        const syncedObjects = [];
        const failedObjects = [];
        
        for (const container of containers) {
            for (const object of container.objects || []) {
                // Проверяем, есть ли у объекта ID в Айконе
                if (!object.aikonaObjectId) {
                    continue; // Пропускаем объекты без ID в Айконе
                }
                
                try {
                    // Синхронизируем объект
                    const updatedObject = await syncObjectFromAikona(object);
                    
                    // Обновляем объект в данных
                    const containerIndex = containers.findIndex(c => c.id === container.id);
                    if (containerIndex !== -1) {
                        const objectIndex = containers[containerIndex].objects.findIndex(o => o.id === object.id);
                        if (objectIndex !== -1) {
                            containers[containerIndex].objects[objectIndex] = {
                                ...containers[containerIndex].objects[objectIndex],
                                ...updatedObject,
                                updatedAt: new Date().toISOString()
                            };
                        }
                    }
                    
                    syncedCount++;
                    syncedObjects.push({
                        name: object.name,
                        containerName: container.name,
                        aikonaId: object.aikonaObjectId
                    });
                    console.log(`[Aikona Auto-Sync] Объект "${object.name}" (ID: ${object.id}, Aikona ID: ${object.aikonaObjectId}) успешно синхронизирован`);
                } catch (error) {
                    errorCount++;
                    const errorMsg = `Объект "${object.name}" (ID: ${object.id}, Aikona ID: ${object.aikonaObjectId}): ${error.message}`;
                    errors.push(errorMsg);
                    failedObjects.push({
                        name: object.name,
                        containerName: container.name,
                        objectId: object.id,
                        aikonaId: object.aikonaObjectId,
                        error: error.message
                    });
                    console.error(`[Aikona Auto-Sync] Ошибка синхронизации ${errorMsg}`);
                }
            }
        }
        
        // Сохраняем все изменения
        if (syncedCount > 0) {
            const updatedData = {
                ...data,
                containers
            };
            const saved = await dataAdapter.writeData(updatedData);
            if (!saved) {
                console.error('[Aikona Auto-Sync] Ошибка сохранения данных после синхронизации');
            } else {
                console.log(`[Aikona Auto-Sync] Данные успешно сохранены`);
            }
        }
        
        console.log(`[Aikona Auto-Sync] Синхронизация завершена. Успешно: ${syncedCount}, Ошибок: ${errorCount}`);
        
        if (errors.length > 0) {
            console.error('[Aikona Auto-Sync] Ошибки синхронизации:', errors);
        }
        
        // Сохраняем лог синхронизации
        const syncTimestamp = new Date().toISOString();
        const syncTime = new Date(syncTimestamp).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const syncLog = {
            lastSync: syncTimestamp,
            timestamp: syncTime,
            success: errorCount === 0 && syncedCount > 0,
            syncedCount,
            errorCount,
            syncedObjects,
            failedObjects,
            message: errorCount === 0 
                ? `Синхронизация выполнена успешно в ${syncTime}. Синхронизировано объектов: ${syncedCount}`
                : `Синхронизация завершена с ошибками в ${syncTime}. Успешно: ${syncedCount}, Ошибок: ${errorCount}`
        };
        
        // Сохраняем лог в файл (перезаписываем предыдущий)
        try {
            fs.writeFileSync(SYNC_LOG_FILE, JSON.stringify(syncLog, null, 2), 'utf8');
            console.log('[Aikona Auto-Sync] Лог синхронизации сохранен');
        } catch (logError) {
            console.error('[Aikona Auto-Sync] Ошибка сохранения лога:', logError);
        }
        
        return {
            success: true,
            syncedCount,
            errorCount,
            errors,
            syncLog
        };
    } catch (error) {
        console.error('[Aikona Auto-Sync] Критическая ошибка при синхронизации:', error);
        
        // Сохраняем лог об ошибке
        const syncTimestamp = new Date().toISOString();
        const syncTime = new Date(syncTimestamp).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const syncLog = {
            lastSync: syncTimestamp,
            timestamp: syncTime,
            success: false,
            syncedCount: 0,
            errorCount: 1,
            syncedObjects: [],
            failedObjects: [],
            message: `Критическая ошибка синхронизации в ${syncTime}: ${error.message}`
        };
        
        try {
            fs.writeFileSync(SYNC_LOG_FILE, JSON.stringify(syncLog, null, 2), 'utf8');
        } catch (logError) {
            console.error('[Aikona Auto-Sync] Ошибка сохранения лога:', logError);
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Получить последний лог синхронизации
 */
function getLastSyncLog() {
    try {
        if (fs.existsSync(SYNC_LOG_FILE)) {
            const logData = fs.readFileSync(SYNC_LOG_FILE, 'utf8');
            return JSON.parse(logData);
        }
    } catch (error) {
        console.error('[Aikona Auto-Sync] Ошибка чтения лога:', error);
    }
    
    return {
        lastSync: null,
        timestamp: null,
        success: false,
        syncedObjects: [],
        failedObjects: [],
        message: "Синхронизация еще не выполнялась"
    };
}

module.exports = {
    syncAllObjectsFromAikona,
    getLastSyncLog
};

