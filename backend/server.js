const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Путь к файлу данных
const DATA_FILE = path.join(__dirname, 'data', 'objects.json');
const SNAPSHOTS_FILE = path.join(__dirname, 'data', 'snapshots.json');
const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');

// Создаем директорию для данных, если её нет
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Инициализация файла данных, если его нет
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

// Инициализация файла снимков, если его нет
if (!fs.existsSync(SNAPSHOTS_FILE)) {
    fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify([], null, 2));
}

// Инициализация файла задач, если его нет
if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify([], null, 2));
}

// Вспомогательная функция для чтения данных
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        // Миграция старых данных
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

// Вспомогательная функция для записи данных
function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing data:', error);
        return false;
    }
}

// Вспомогательная функция для чтения снимков
function readSnapshots() {
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

// Вспомогательная функция для записи снимков
function writeSnapshots(snapshots) {
    try {
        fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(snapshots, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing snapshots:', error);
        return false;
    }
}

// Функция для создания снимка текущего состояния
function createSnapshot() {
    const data = readData();
    const snapshot = {
        id: Date.now(),
        date: new Date().toISOString(),
        type: 'meeting',
        containers: data.containers.map(container => ({
            id: container.id,
            name: container.name,
            objects: container.objects.map(obj => ({
                id: obj.id,
                name: obj.name,
                description: obj.description,
                smrs: extractSMRsFromObject(obj)
            }))
        }))
    };
    return snapshot;
}

// Функция для извлечения данных СМР из объекта
function extractSMRsFromObject(obj) {
    const smrsMap = new Map();
    
    // Собираем все уникальные СМР из всех секций
    const sections = [
        { name: 'generatedActs', data: obj.generatedActs || [] },
        { name: 'sentForApproval', data: obj.sentForApproval || [] },
        { name: 'approvedActs', data: obj.approvedActs || [] },
        { name: 'rejectedActs', data: obj.rejectedActs || [] },
        { name: 'signedActs', data: obj.signedActs || [] }
    ];
    
    sections.forEach(section => {
        if (Array.isArray(section.data)) {
            section.data.forEach(smr => {
                if (smr && smr.id) {
                    if (!smrsMap.has(smr.id)) {
                        smrsMap.set(smr.id, {
                            id: smr.id,
                            name: smr.name || 'Без названия',
                            generatedActs: 0,
                            sentForApproval: 0,
                            approvedActs: 0,
                            rejectedActs: 0,
                            signedActs: 0
                        });
                    }
                    const smrData = smrsMap.get(smr.id);
                    if (section.name === 'generatedActs') {
                        smrData.generatedActs = smr.count || 0;
                        smrData.generatedTotal = smr.total || 0;
                    } else if (section.name === 'sentForApproval') {
                        smrData.sentForApproval = smr.count || 0;
                    } else if (section.name === 'approvedActs') {
                        smrData.approvedActs = smr.count || 0;
                    } else if (section.name === 'rejectedActs') {
                        smrData.rejectedActs = smr.count || 0;
                    } else if (section.name === 'signedActs') {
                        smrData.signedActs = smr.count || 0;
                    }
                }
            });
        }
    });
    
    return Array.from(smrsMap.values());
}

// Функция для сравнения двух снимков
function compareSnapshots(oldSnapshot, newSnapshot) {
    const changes = [];
    const summary = {
        generatedActs: { old: 0, new: 0, delta: 0 },
        sentForApproval: { old: 0, new: 0, delta: 0 },
        approvedActs: { old: 0, new: 0, delta: 0 },
        rejectedActs: { old: 0, new: 0, delta: 0 },
        signedActs: { old: 0, new: 0, delta: 0 }
    };
    
    // Создаем карту для быстрого поиска объектов в старом снимке
    const oldMap = new Map();
    oldSnapshot.containers.forEach(container => {
        container.objects.forEach(obj => {
            const key = `${container.id}-${obj.id}`;
            oldMap.set(key, { container, object: obj });
        });
    });
    
    // Проходим по новому снимку и сравниваем
    newSnapshot.containers.forEach(container => {
        container.objects.forEach(obj => {
            const key = `${container.id}-${obj.id}`;
            const oldData = oldMap.get(key);
            
            if (oldData) {
                // Объект существует в обоих снимках - сравниваем СМР
                const oldSMRs = new Map();
                (oldData.object.smrs || []).forEach(smr => {
                    oldSMRs.set(smr.id, smr);
                });
                
                (obj.smrs || []).forEach(smr => {
                    const oldSMR = oldSMRs.get(smr.id);
                    
                    if (oldSMR) {
                        // СМР существует в обоих снимках - вычисляем изменения
                        const deltas = {
                            generatedActs: smr.generatedActs - (oldSMR.generatedActs || 0),
                            sentForApproval: smr.sentForApproval - (oldSMR.sentForApproval || 0),
                            approvedActs: smr.approvedActs - (oldSMR.approvedActs || 0),
                            rejectedActs: smr.rejectedActs - (oldSMR.rejectedActs || 0),
                            signedActs: smr.signedActs - (oldSMR.signedActs || 0)
                        };
                        
                        // Добавляем в summary
                        summary.generatedActs.old += oldSMR.generatedActs || 0;
                        summary.generatedActs.new += smr.generatedActs;
                        summary.generatedActs.delta += deltas.generatedActs;
                        
                        summary.sentForApproval.old += oldSMR.sentForApproval || 0;
                        summary.sentForApproval.new += smr.sentForApproval;
                        summary.sentForApproval.delta += deltas.sentForApproval;
                        
                        summary.approvedActs.old += oldSMR.approvedActs || 0;
                        summary.approvedActs.new += smr.approvedActs;
                        summary.approvedActs.delta += deltas.approvedActs;
                        
                        summary.rejectedActs.old += oldSMR.rejectedActs || 0;
                        summary.rejectedActs.new += smr.rejectedActs;
                        summary.rejectedActs.delta += deltas.rejectedActs;
                        
                        summary.signedActs.old += oldSMR.signedActs || 0;
                        summary.signedActs.new += smr.signedActs;
                        summary.signedActs.delta += deltas.signedActs;
                        
                        // Если есть изменения, добавляем в список изменений
                        if (Object.values(deltas).some(delta => delta !== 0)) {
                            changes.push({
                                containerId: container.id,
                                containerName: container.name,
                                objectId: obj.id,
                                objectName: obj.name,
                                smrId: smr.id,
                                smrName: smr.name,
                                oldValues: {
                                    generatedActs: oldSMR.generatedActs || 0,
                                    sentForApproval: oldSMR.sentForApproval || 0,
                                    approvedActs: oldSMR.approvedActs || 0,
                                    rejectedActs: oldSMR.rejectedActs || 0,
                                    signedActs: oldSMR.signedActs || 0
                                },
                                newValues: {
                                    generatedActs: smr.generatedActs,
                                    sentForApproval: smr.sentForApproval,
                                    approvedActs: smr.approvedActs,
                                    rejectedActs: smr.rejectedActs,
                                    signedActs: smr.signedActs
                                },
                                deltas
                            });
                        }
                    } else {
                        // Новый СМР - добавляем как новое
                        changes.push({
                            containerId: container.id,
                            containerName: container.name,
                            objectId: obj.id,
                            objectName: obj.name,
                            smrId: smr.id,
                            smrName: smr.name,
                            oldValues: null,
                            newValues: {
                                generatedActs: smr.generatedActs,
                                sentForApproval: smr.sentForApproval,
                                approvedActs: smr.approvedActs,
                                rejectedActs: smr.rejectedActs,
                                signedActs: smr.signedActs
                            },
                            deltas: {
                                generatedActs: smr.generatedActs,
                                sentForApproval: smr.sentForApproval,
                                approvedActs: smr.approvedActs,
                                rejectedActs: smr.rejectedActs,
                                signedActs: smr.signedActs
                            },
                            isNew: true
                        });
                    }
                });
            } else {
                // Новый объект - добавляем все его СМР как новые
                (obj.smrs || []).forEach(smr => {
                    changes.push({
                        containerId: container.id,
                        containerName: container.name,
                        objectId: obj.id,
                        objectName: obj.name,
                        smrId: smr.id,
                        smrName: smr.name,
                        oldValues: null,
                        newValues: {
                            generatedActs: smr.generatedActs,
                            sentForApproval: smr.sentForApproval,
                            approvedActs: smr.approvedActs,
                            rejectedActs: smr.rejectedActs,
                            signedActs: smr.signedActs
                        },
                        deltas: {
                            generatedActs: smr.generatedActs,
                            sentForApproval: smr.sentForApproval,
                            approvedActs: smr.approvedActs,
                            rejectedActs: smr.rejectedActs,
                            signedActs: smr.signedActs
                        },
                        isNew: true
                    });
                });
            }
        });
    });
    
    return {
        oldSnapshotDate: oldSnapshot.date,
        newSnapshotDate: newSnapshot.date,
        summary,
        changes
    };
}

// API Routes

// GET /api/containers - получить все контейнеры
app.get('/api/containers', (req, res) => {
    try {
        const data = readData();
        res.json(data.containers || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read containers' });
    }
});

// POST /api/containers - создать новый контейнер
app.post('/api/containers', (req, res) => {
    try {
        const data = readData();
        const newContainer = {
            id: data.containers.length > 0 ? Math.max(...data.containers.map(c => c.id)) + 1 : 1,
            name: req.body.name || 'Объекты',
            objects: []
        };
        data.containers.push(newContainer);
        if (writeData(data)) {
            res.status(201).json(newContainer);
        } else {
            res.status(500).json({ error: 'Failed to save container' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to create container' });
    }
});

// PUT /api/containers/:containerId - обновить контейнер
app.put('/api/containers/:containerId', (req, res) => {
    try {
        const data = readData();
        const index = data.containers.findIndex(c => c.id === parseInt(req.params.containerId));
        if (index === -1) {
            return res.status(404).json({ error: 'Container not found' });
        }
        if (req.body.name !== undefined) {
            data.containers[index].name = req.body.name;
        }
        if (writeData(data)) {
            res.json(data.containers[index]);
        } else {
            res.status(500).json({ error: 'Failed to update container' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update container' });
    }
});

// DELETE /api/containers/:containerId - удалить контейнер
app.delete('/api/containers/:containerId', (req, res) => {
    try {
        const data = readData();
        const filteredContainers = data.containers.filter(c => c.id !== parseInt(req.params.containerId));
        if (filteredContainers.length === data.containers.length) {
            return res.status(404).json({ error: 'Container not found' });
        }
        data.containers = filteredContainers;
        if (writeData(data)) {
            res.json({ message: 'Container deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete container' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete container' });
    }
});

// GET /api/containers/:containerId/objects - получить объекты контейнера
app.get('/api/containers/:containerId/objects', (req, res) => {
    try {
        const data = readData();
        const container = data.containers.find(c => c.id === parseInt(req.params.containerId));
        if (!container) {
            return res.status(404).json({ error: 'Container not found' });
        }
        res.json(container.objects || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read objects' });
    }
});

// POST /api/containers/:containerId/objects - создать объект в контейнере
app.post('/api/containers/:containerId/objects', (req, res) => {
    try {
        console.log('POST /api/containers/:containerId/objects - Request body:', JSON.stringify(req.body, null, 2));
        const data = readData();
        const container = data.containers.find(c => c.id === parseInt(req.params.containerId));
        if (!container) {
            console.log('Container not found:', req.params.containerId);
            return res.status(404).json({ error: 'Container not found' });
        }

        const newObject = {
            id: container.objects.length > 0 ? Math.max(...container.objects.map(o => o.id)) + 1 : 1,
            name: req.body.name || '',
            description: req.body.description || '',
            status: req.body.status || '',
            generatedActs: Array.isArray(req.body.generatedActs) ? req.body.generatedActs : [],
            sentForApproval: Array.isArray(req.body.sentForApproval) ? req.body.sentForApproval : [],
            approvedActs: Array.isArray(req.body.approvedActs) ? req.body.approvedActs : [],
            rejectedActs: Array.isArray(req.body.rejectedActs) ? req.body.rejectedActs : [],
            signedActs: Array.isArray(req.body.signedActs) ? req.body.signedActs : [],
            blockingFactors: Array.isArray(req.body.blockingFactors) ? req.body.blockingFactors : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        console.log('New object:', JSON.stringify(newObject, null, 2));

        // Валидация
        const totalGenerated = newObject.generatedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
        const totalSent = newObject.sentForApproval.reduce((sum, smr) => sum + (smr.count || 0), 0);
        const totalApproved = newObject.approvedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
        const totalRejected = newObject.rejectedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
        const totalSigned = newObject.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
        
        console.log('Validation totals:', { totalGenerated, totalSent, totalApproved, totalRejected, totalSigned });
        
        if (totalSent > totalGenerated) {
            console.log('Validation failed: totalSent > totalGenerated');
            return res.status(400).json({ error: 'Отправленных на согласование актов не может быть больше сгенерированных' });
        }
        if (totalApproved + totalRejected > totalSent) {
            console.log('Validation failed: totalApproved + totalRejected > totalSent');
            return res.status(400).json({ error: 'Сумма согласованных и отклоненных актов не может быть больше отправленных на согласование' });
        }
        if (totalSigned > totalApproved) {
            console.log('Validation failed: totalSigned > totalApproved');
            return res.status(400).json({ error: 'Подписанных актов не может быть больше согласованных' });
        }

        container.objects.push(newObject);
        if (writeData(data)) {
            console.log('Object created successfully');
            res.status(201).json(newObject);
        } else {
            console.log('Failed to write data');
            res.status(500).json({ error: 'Failed to save object' });
        }
    } catch (error) {
        console.error('Error creating object:', error);
        res.status(500).json({ error: 'Failed to create object', details: error.message });
    }
});

// PUT /api/containers/:containerId/objects/:objectId - обновить объект
app.put('/api/containers/:containerId/objects/:objectId', (req, res) => {
    try {
        console.log('PUT /api/containers/:containerId/objects/:objectId - Request body:', JSON.stringify(req.body, null, 2));
        const data = readData();
        const container = data.containers.find(c => c.id === parseInt(req.params.containerId));
        if (!container) {
            console.log('Container not found:', req.params.containerId);
            return res.status(404).json({ error: 'Container not found' });
        }

        const objectIndex = container.objects.findIndex(o => o.id === parseInt(req.params.objectId));
        if (objectIndex === -1) {
            console.log('Object not found:', req.params.objectId);
            return res.status(404).json({ error: 'Object not found' });
        }

        const updatedObject = {
            ...container.objects[objectIndex],
            name: req.body.name !== undefined ? req.body.name : container.objects[objectIndex].name,
            description: req.body.description !== undefined ? req.body.description : container.objects[objectIndex].description,
            status: req.body.status !== undefined ? req.body.status : container.objects[objectIndex].status || '',
            generatedActs: Array.isArray(req.body.generatedActs) ? req.body.generatedActs : container.objects[objectIndex].generatedActs || [],
            sentForApproval: Array.isArray(req.body.sentForApproval) ? req.body.sentForApproval : container.objects[objectIndex].sentForApproval || [],
            approvedActs: Array.isArray(req.body.approvedActs) ? req.body.approvedActs : (container.objects[objectIndex].approvedActs || []),
            rejectedActs: Array.isArray(req.body.rejectedActs) ? req.body.rejectedActs : (container.objects[objectIndex].rejectedActs || []),
            signedActs: Array.isArray(req.body.signedActs) ? req.body.signedActs : (container.objects[objectIndex].signedActs || []),
            blockingFactors: Array.isArray(req.body.blockingFactors) ? req.body.blockingFactors : (container.objects[objectIndex].blockingFactors || []),
            updatedAt: new Date().toISOString()
        };

        console.log('Updated object:', JSON.stringify(updatedObject, null, 2));

        // Валидация
        const totalGenerated = updatedObject.generatedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
        const totalSent = updatedObject.sentForApproval.reduce((sum, smr) => sum + (smr.count || 0), 0);
        const totalApproved = updatedObject.approvedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
        const totalRejected = updatedObject.rejectedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
        const totalSigned = updatedObject.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
        
        console.log('Validation totals:', { totalGenerated, totalSent, totalApproved, totalRejected, totalSigned });
        
        if (totalSent > totalGenerated) {
            console.log('Validation failed: totalSent > totalGenerated');
            return res.status(400).json({ error: 'Отправленных на согласование актов не может быть больше сгенерированных' });
        }
        if (totalApproved + totalRejected > totalSent) {
            console.log('Validation failed: totalApproved + totalRejected > totalSent');
            return res.status(400).json({ error: 'Сумма согласованных и отклоненных актов не может быть больше отправленных на согласование' });
        }
        if (totalSigned > totalApproved) {
            console.log('Validation failed: totalSigned > totalApproved');
            return res.status(400).json({ error: 'Подписанных актов не может быть больше согласованных' });
        }

        container.objects[objectIndex] = updatedObject;
        if (writeData(data)) {
            console.log('Object updated successfully');
            res.json(updatedObject);
        } else {
            console.log('Failed to write data');
            res.status(500).json({ error: 'Failed to update object' });
        }
    } catch (error) {
        console.error('Error updating object:', error);
        res.status(500).json({ error: 'Failed to update object', details: error.message });
    }
});

// DELETE /api/containers/:containerId/objects/:objectId - удалить объект
app.delete('/api/containers/:containerId/objects/:objectId', (req, res) => {
    try {
        const data = readData();
        const container = data.containers.find(c => c.id === parseInt(req.params.containerId));
        if (!container) {
            return res.status(404).json({ error: 'Container not found' });
        }

        const filteredObjects = container.objects.filter(o => o.id !== parseInt(req.params.objectId));
        if (filteredObjects.length === container.objects.length) {
            return res.status(404).json({ error: 'Object not found' });
        }

        container.objects = filteredObjects;
        if (writeData(data)) {
            res.json({ message: 'Object deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete object' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete object' });
    }
});

// GET /api/stats - получить общую статистику по всем контейнерам
app.get('/api/stats', (req, res) => {
    try {
        const data = readData();
        let totalObjects = 0;
        let generatedActs = 0;
        let sentActs = 0;
        let approvedActs = 0;
        let rejectedActs = 0;

        data.containers.forEach(container => {
            container.objects.forEach(obj => {
                totalObjects++;
                const totalGenerated = Array.isArray(obj.generatedActs) 
                    ? obj.generatedActs.reduce((sum, smr) => sum + (smr.count || 0), 0)
                    : 0;
                const totalSent = Array.isArray(obj.sentForApproval)
                    ? obj.sentForApproval.reduce((sum, smr) => sum + (smr.count || 0), 0)
                    : 0;

                generatedActs += totalGenerated;
                sentActs += totalSent;
                
                const totalApproved = Array.isArray(obj.approvedActs) 
                    ? obj.approvedActs.reduce((sum, smr) => sum + (smr.count || 0), 0)
                    : 0;
                const totalRejected = Array.isArray(obj.rejectedActs)
                    ? obj.rejectedActs.reduce((sum, smr) => sum + (smr.count || 0), 0)
                    : 0;
                const totalSigned = Array.isArray(obj.signedActs)
                    ? obj.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0)
                    : 0;
                
                approvedActs += totalApproved;
                rejectedActs += totalRejected;
            });
        });

        let signedActs = 0;
        data.containers.forEach(container => {
            container.objects.forEach(obj => {
                const totalSigned = Array.isArray(obj.signedActs)
                    ? obj.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0)
                    : 0;
                signedActs += totalSigned;
            });
        });

        const stats = {
            totalObjects,
            generatedActs,
            sentActs,
            approvedActs,
            rejectedActs,
            signedActs,
            approvedPercent: sentActs > 0 ? Math.round((approvedActs / sentActs) * 100) : 0,
            rejectedPercent: sentActs > 0 ? Math.round((rejectedActs / sentActs) * 100) : 0,
            signedPercent: approvedActs > 0 ? Math.round((signedActs / approvedActs) * 100) : 0
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to calculate stats' });
    }
});

// GET /api/containers/:containerId/stats - получить статистику контейнера
app.get('/api/containers/:containerId/stats', (req, res) => {
    try {
        const data = readData();
        const container = data.containers.find(c => c.id === parseInt(req.params.containerId));
        if (!container) {
            return res.status(404).json({ error: 'Container not found' });
        }

        let generatedActs = 0;
        let sentActs = 0;
        let approvedActs = 0;
        let rejectedActs = 0;
        let signedActs = 0;

        container.objects.forEach(obj => {
            const totalGenerated = Array.isArray(obj.generatedActs) 
                ? obj.generatedActs.reduce((sum, smr) => sum + (smr.count || 0), 0)
                : 0;
            const totalSent = Array.isArray(obj.sentForApproval)
                ? obj.sentForApproval.reduce((sum, smr) => sum + (smr.count || 0), 0)
                : 0;

            generatedActs += totalGenerated;
            sentActs += totalSent;
            
            const totalApproved = Array.isArray(obj.approvedActs) 
                ? obj.approvedActs.reduce((sum, smr) => sum + (smr.count || 0), 0)
                : 0;
            const totalRejected = Array.isArray(obj.rejectedActs)
                ? obj.rejectedActs.reduce((sum, smr) => sum + (smr.count || 0), 0)
                : 0;
            const totalSigned = Array.isArray(obj.signedActs)
                ? obj.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0)
                : 0;
            
                approvedActs += totalApproved;
                rejectedActs += totalRejected;
                signedActs += totalSigned;
            });

            const stats = {
                totalObjects: container.objects.length,
                generatedActs,
                sentActs,
                approvedActs,
                rejectedActs,
                signedActs,
                approvedPercent: sentActs > 0 ? Math.round((approvedActs / sentActs) * 100) : 0,
                rejectedPercent: sentActs > 0 ? Math.round((rejectedActs / sentActs) * 100) : 0,
                signedPercent: approvedActs > 0 ? Math.round((signedActs / approvedActs) * 100) : 0
            };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to calculate stats' });
    }
});

// API Routes for Snapshots

// GET /api/snapshots - получить все снимки
app.get('/api/snapshots', (req, res) => {
    try {
        const snapshots = readSnapshots();
        res.json(snapshots);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read snapshots' });
    }
});

// POST /api/snapshots - создать новый снимок
app.post('/api/snapshots', (req, res) => {
    try {
        const snapshots = readSnapshots();
        const newSnapshot = createSnapshot();
        snapshots.push(newSnapshot);
        
        if (writeSnapshots(snapshots)) {
            res.status(201).json(newSnapshot);
        } else {
            res.status(500).json({ error: 'Failed to save snapshot' });
        }
    } catch (error) {
        console.error('Error creating snapshot:', error);
        res.status(500).json({ error: 'Failed to create snapshot' });
    }
});

// DELETE /api/snapshots/:snapshotId - удалить снимок
app.delete('/api/snapshots/:snapshotId', (req, res) => {
    try {
        const snapshots = readSnapshots();
        const filteredSnapshots = snapshots.filter(s => s.id !== parseInt(req.params.snapshotId));
        if (filteredSnapshots.length === snapshots.length) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }
        if (writeSnapshots(filteredSnapshots)) {
            res.json({ message: 'Snapshot deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete snapshot' });
        }
    } catch (error) {
        console.error('Error deleting snapshot:', error);
        res.status(500).json({ error: 'Failed to delete snapshot' });
    }
});

// GET /api/snapshots/latest/compare - сравнить текущее состояние с последним снимком
app.get('/api/snapshots/latest/compare', (req, res) => {
    try {
        const snapshots = readSnapshots();
        if (snapshots.length === 0) {
            return res.json({
                hasPreviousSnapshot: false,
                message: 'No previous snapshots found'
            });
        }
        
        const latestSnapshot = snapshots[snapshots.length - 1];
        const currentSnapshot = createSnapshot();
        const comparison = compareSnapshots(latestSnapshot, currentSnapshot);
        
        res.json({
            hasPreviousSnapshot: true,
            latestSnapshotDate: latestSnapshot.date,
            snapshotDate: latestSnapshot.date, // Для совместимости
            currentSnapshotDate: currentSnapshot.date,
            newSnapshotDate: currentSnapshot.date, // Для совместимости
            oldSnapshotDate: latestSnapshot.date, // Для совместимости
            comparison
        });
    } catch (error) {
        console.error('Error comparing with latest snapshot:', error);
        res.status(500).json({ error: 'Failed to compare with latest snapshot' });
    }
});

// GET /api/snapshots/compare/:snapshotId - сравнить текущее состояние с указанным снимком
app.get('/api/snapshots/compare/:snapshotId', (req, res) => {
    try {
        const snapshots = readSnapshots();
        const snapshot = snapshots.find(s => s.id === parseInt(req.params.snapshotId));
        
        if (!snapshot) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }
        
        const currentSnapshot = createSnapshot();
        const comparison = compareSnapshots(snapshot, currentSnapshot);
        
        // Унифицируем структуру ответа с /api/snapshots/latest/compare
        res.json({
            hasPreviousSnapshot: true,
            snapshotDate: snapshot.date,
            latestSnapshotDate: snapshot.date, // Для совместимости
            oldSnapshotDate: snapshot.date, // Для совместимости
            currentSnapshotDate: currentSnapshot.date,
            newSnapshotDate: currentSnapshot.date, // Для совместимости
            comparison
        });
    } catch (error) {
        console.error('Error comparing with snapshot:', error);
        res.status(500).json({ error: 'Failed to compare with snapshot' });
    }
});

// Вспомогательные функции для работы с задачами
function readTasks() {
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

function writeTasks(tasks) {
    try {
        fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing tasks:', error);
        return false;
    }
}

// API Routes for Tasks

// GET /api/tasks - получить все задачи
app.get('/api/tasks', (req, res) => {
    try {
        const tasks = readTasks();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read tasks' });
    }
});

// POST /api/tasks - создать новую задачу
app.post('/api/tasks', (req, res) => {
    try {
        const tasks = readTasks();
        const newTask = {
            id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
            taskNumber: req.body.taskNumber || null,
            description: req.body.description || '',
            discoveryDate: req.body.discoveryDate || new Date().toISOString(),
            status: req.body.status || 'To Do',
            plannedFixMonth: req.body.plannedFixMonth || null,
            plannedFixYear: req.body.plannedFixYear || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        tasks.push(newTask);
        if (writeTasks(tasks)) {
            res.status(201).json(newTask);
        } else {
            res.status(500).json({ error: 'Failed to save task' });
        }
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// PUT /api/tasks/:taskId - обновить задачу
app.put('/api/tasks/:taskId', (req, res) => {
    try {
        const tasks = readTasks();
        const index = tasks.findIndex(t => t.id === parseInt(req.params.taskId));
        if (index === -1) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const updatedTask = {
            ...tasks[index],
            taskNumber: req.body.taskNumber !== undefined ? req.body.taskNumber : tasks[index].taskNumber,
            description: req.body.description !== undefined ? req.body.description : tasks[index].description,
            discoveryDate: req.body.discoveryDate !== undefined ? req.body.discoveryDate : tasks[index].discoveryDate,
            status: req.body.status !== undefined ? req.body.status : tasks[index].status,
            plannedFixMonth: req.body.plannedFixMonth !== undefined ? req.body.plannedFixMonth : tasks[index].plannedFixMonth,
            plannedFixYear: req.body.plannedFixYear !== undefined ? req.body.plannedFixYear : tasks[index].plannedFixYear,
            updatedAt: new Date().toISOString()
        };

        tasks[index] = updatedTask;
        if (writeTasks(tasks)) {
            res.json(updatedTask);
        } else {
            res.status(500).json({ error: 'Failed to update task' });
        }
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// DELETE /api/tasks/:taskId - удалить задачу
app.delete('/api/tasks/:taskId', (req, res) => {
    try {
        const tasks = readTasks();
        const filteredTasks = tasks.filter(t => t.id !== parseInt(req.params.taskId));
        if (filteredTasks.length === tasks.length) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (writeTasks(filteredTasks)) {
            res.json({ message: 'Task deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete task' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Раздача статических файлов React в production (должно быть ПОСЛЕ всех API routes)
if (process.env.NODE_ENV === 'production') {
    const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
    app.use(express.static(frontendBuildPath));
    
    // Все неизвестные маршруты отправляем на React приложение
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
}

// Start server
const serverPort = process.env.PORT || PORT;
app.listen(serverPort, () => {
    console.log(`Backend server running on port ${serverPort}`);
    if (process.env.NODE_ENV === 'production') {
        console.log('Serving React build from frontend/build');
    }
});
