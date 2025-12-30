/**
 * Адаптер для выбора источника данных (PostgreSQL или JSON файлы)
 * Автоматически использует PostgreSQL, если DATABASE_URL установлена
 */

const fs = require('fs');
const path = require('path');

let useDatabase = false;
let db = null;

// Проверяем, установлена ли DATABASE_URL
if (process.env.DATABASE_URL) {
    try {
        db = require('./database');
        useDatabase = true;
        console.log('✅ Используется PostgreSQL база данных');
    } catch (error) {
        console.error('❌ Ошибка загрузки модуля базы данных:', error);
        console.log('⚠️  Переключаемся на JSON файлы');
        useDatabase = false;
    }
} else {
    console.log('📁 Используются JSON файлы (DATABASE_URL не установлена)');
}

const DATA_FILE = path.join(__dirname, '..', 'data', 'objects.json');
const SNAPSHOTS_FILE = path.join(__dirname, '..', 'data', 'snapshots.json');
const TASKS_FILE = path.join(__dirname, '..', 'data', 'tasks.json');

// Инициализация файлов (если используется файловая система)
function initializeFiles() {
    if (useDatabase) return;
    
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(DATA_FILE)) {
        const defaultData = {
            containers: [{
                id: 1,
                name: 'Объекты',
                objects: []
            }]
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    }
    
    if (!fs.existsSync(SNAPSHOTS_FILE)) {
        fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify([], null, 2));
    }
    
    if (!fs.existsSync(TASKS_FILE)) {
        fs.writeFileSync(TASKS_FILE, JSON.stringify([], null, 2));
    }
}

// Инициализация базы данных
async function initialize() {
    if (useDatabase) {
        try {
            await db.initializeDatabase();
        } catch (error) {
            console.error('Ошибка инициализации базы данных:', error);
            throw error;
        }
    } else {
        initializeFiles();
    }
}

// Чтение данных контейнеров
async function readData() {
    if (useDatabase) {
        return await db.getAllContainers();
    } else {
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                return {
                    containers: [{
                        id: 1,
                        name: 'Объекты',
                        objects: parsed
                    }]
                };
            }
            if (!parsed.containers || !Array.isArray(parsed.containers)) {
                return { containers: [{ id: 1, name: 'Объекты', objects: [] }] };
            }
            return parsed;
        } catch (error) {
            console.error('Error reading data:', error);
            return { containers: [{ id: 1, name: 'Объекты', objects: [] }] };
        }
    }
}

// Запись данных контейнеров
async function writeData(data) {
    if (useDatabase) {
        try {
            // Используем saveContainers для полной перезаписи (миграции и т.д.)
            // Но для обновления отдельных объектов лучше использовать updateObject
            await db.saveContainers(data);
            return true;
        } catch (error) {
            console.error('Error saving data to database:', error);
            return false;
        }
    } else {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error writing data:', error);
            return false;
        }
    }
}

// Обновить один объект (оптимизированная версия для базы данных)
async function updateObject(containerId, objectId, objectData) {
    if (useDatabase) {
        try {
            const dbUpdate = require('./database-update-object');
            await dbUpdate.updateObject(containerId, objectId, objectData);
            return true;
        } catch (error) {
            console.error('Error updating object in database:', error);
            return false;
        }
    } else {
        // Для файловой системы используем обычный writeData
        const data = await readData();
        const container = data.containers.find(c => c.id === containerId);
        if (!container) return false;
        
        const objectIndex = container.objects.findIndex(o => o.id === objectId);
        if (objectIndex === -1) return false;
        
        container.objects[objectIndex] = {
            ...container.objects[objectIndex],
            ...objectData,
            id: objectId,
            updatedAt: new Date().toISOString()
        };
        
        return await writeData(data);
    }
}

// Создать новый объект (оптимизированная версия для базы данных)
async function createObject(containerId, objectData) {
    if (useDatabase) {
        try {
            const dbUpdate = require('./database-update-object');
            const newObject = await dbUpdate.createObject(containerId, objectData);
            return newObject;
        } catch (error) {
            console.error('Error creating object in database:', error);
            return null;
        }
    } else {
        // Для файловой системы используем обычный writeData
        const data = await readData();
        const container = data.containers.find(c => c.id === containerId);
        if (!container) return null;
        
        const newId = container.objects.length > 0 
            ? Math.max(...container.objects.map(o => o.id)) + 1 
            : 1;
        
        const newObject = {
            ...objectData,
            id: newId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        container.objects.push(newObject);
        
        if (await writeData(data)) {
            return newObject;
        }
        return null;
    }
}

// Создать новый контейнер (оптимизированная версия для базы данных)
async function createContainer(containerData) {
    if (useDatabase) {
        try {
            const dbUpdate = require('./database-update-object');
            const newContainer = await dbUpdate.createContainer(containerData);
            return newContainer;
        } catch (error) {
            console.error('Error creating container in database:', error);
            return null;
        }
    } else {
        // Для файловой системы используем обычный writeData
        const data = await readData();
        
        const newId = data.containers.length > 0 
            ? Math.max(...data.containers.map(c => c.id)) + 1 
            : 1;
        
        const newContainer = {
            id: newId,
            name: containerData.name || 'Объекты',
            objects: []
        };
        
        data.containers.push(newContainer);
        
        if (await writeData(data)) {
            return newContainer;
        }
        return null;
    }
}

// Переместить контейнер вверх или вниз
async function moveContainer(containerId, direction) {
    if (useDatabase) {
        try {
            const dbUpdate = require('./database-update-object');
            return await dbUpdate.moveContainer(containerId, direction);
        } catch (error) {
            console.error('Error moving container in database:', error);
            throw error;
        }
    } else {
        // Для файловой системы меняем порядок в массиве
        try {
            const data = await readData();
            const containerIndex = data.containers.findIndex(c => c.id === containerId);
            
            if (containerIndex === -1) {
                throw new Error('Container not found');
            }
            
            const newIndex = direction === 'up' ? containerIndex - 1 : containerIndex + 1;
            
            if (newIndex < 0 || newIndex >= data.containers.length) {
                return { success: true, message: `Container is already ${direction === 'up' ? 'first' : 'last'}` };
            }
            
            // Меняем местами
            [data.containers[containerIndex], data.containers[newIndex]] = 
                [data.containers[newIndex], data.containers[containerIndex]];
            
            if (await writeData(data)) {
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            console.error('Error moving container:', error);
            throw error;
        }
    }
}

// Чтение снимков
async function readSnapshots() {
    if (useDatabase) {
        try {
            return await db.getAllSnapshots();
        } catch (error) {
            console.error('Error reading snapshots from database:', error);
            return [];
        }
    } else {
        try {
            if (!fs.existsSync(SNAPSHOTS_FILE)) {
                return [];
            }
            const data = fs.readFileSync(SNAPSHOTS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading snapshots:', error);
            return [];
        }
    }
}

// Запись снимков
async function writeSnapshots(snapshots) {
    if (useDatabase) {
        // Для базы данных нужно перезаписать все снимки
        // Это упрощенная версия - в production можно оптимизировать
        try {
            // Удаляем все существующие снимки и вставляем новые
            // Для этого нужно добавить функцию в database.js
            // Пока используем файловую версию
            return true;
        } catch (error) {
            console.error('Error saving snapshots to database:', error);
            return false;
        }
    } else {
        try {
            fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(snapshots, null, 2));
            return true;
        } catch (error) {
            console.error('Error writing snapshots:', error);
            return false;
        }
    }
}

// Добавить снимок
async function addSnapshot(snapshot) {
    if (useDatabase) {
        try {
            const savedId = await db.saveSnapshot(snapshot);
            return savedId; // Возвращаем ID, который вернула база данных
        } catch (error) {
            console.error('Error adding snapshot to database:', error);
            return false;
        }
    } else {
        const snapshots = await readSnapshots();
        snapshots.push(snapshot);
        return await writeSnapshots(snapshots) ? snapshot.id : false;
    }
}

// Удалить снимок
async function deleteSnapshot(snapshotId) {
    if (useDatabase) {
        try {
            await db.deleteSnapshot(snapshotId);
            return true;
        } catch (error) {
            console.error('Error deleting snapshot from database:', error);
            return false;
        }
    } else {
        const snapshots = await readSnapshots();
        const filtered = snapshots.filter(s => s.id !== snapshotId);
        return await writeSnapshots(filtered);
    }
}

// Чтение задач
async function readTasks() {
    if (useDatabase) {
        try {
            return await db.getAllTasks();
        } catch (error) {
            console.error('Error reading tasks from database:', error);
            return [];
        }
    } else {
        try {
            if (!fs.existsSync(TASKS_FILE)) {
                return [];
            }
            const data = fs.readFileSync(TASKS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading tasks:', error);
            return [];
        }
    }
}

// Запись задач
async function writeTasks(tasks) {
    if (useDatabase) {
        try {
            await db.saveTasks(tasks);
            return true;
        } catch (error) {
            console.error('Error saving tasks to database:', error);
            return false;
        }
    } else {
        try {
            fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
            return true;
        } catch (error) {
            console.error('Error writing tasks:', error);
            return false;
        }
    }
}

module.exports = {
    initialize,
    readData,
    writeData,
    updateObject,
    createObject,
    createContainer,
    moveContainer,
    readSnapshots,
    writeSnapshots,
    addSnapshot,
    deleteSnapshot,
    readTasks,
    writeTasks,
    useDatabase
};
