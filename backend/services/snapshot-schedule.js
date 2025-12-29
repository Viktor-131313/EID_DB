/**
 * Сервис для автоматического создания снимков планерок по расписанию
 */

const fs = require('fs');
const path = require('path');
const dataAdapter = require('../database/adapter');

const SCHEDULE_FILE = path.join(__dirname, '..', 'data', 'snapshot-schedule.json');

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
                            name: smr.name || '',
                            generatedActs: 0,
                            sentForApproval: 0,
                            approvedActs: 0,
                            rejectedActs: 0,
                            signedActs: 0
                        });
                    }
                    const smrData = smrsMap.get(smr.id);
                    if (section.name === 'generatedActs') smrData.generatedActs = smr.count || 0;
                    if (section.name === 'sentForApproval') smrData.sentForApproval = smr.count || 0;
                    if (section.name === 'approvedActs') smrData.approvedActs = smr.count || 0;
                    if (section.name === 'rejectedActs') smrData.rejectedActs = smr.count || 0;
                    if (section.name === 'signedActs') smrData.signedActs = smr.count || 0;
                }
            });
        }
    });
    
    return Array.from(smrsMap.values());
}

// Функция для создания снимка
async function createSnapshot() {
    try {
        const data = await dataAdapter.readData();
        const snapshot = {
            id: Date.now(),
            date: new Date().toISOString(),
            type: 'meeting',
            containers: data.containers.map(container => ({
                id: container.id,
                name: container.name,
                objects: (container.objects || []).map(obj => ({
                    id: obj.id,
                    name: obj.name,
                    description: obj.description,
                    smrs: extractSMRsFromObject(obj)
                }))
            }))
        };

        await dataAdapter.addSnapshot(snapshot);
        console.log(`[Snapshot Schedule] Снимок успешно создан автоматически в ${new Date().toLocaleString('ru-RU')}`);
        return snapshot;
    } catch (error) {
        console.error('[Snapshot Schedule] Ошибка при создании снимка:', error);
        throw error;
    }
}

// Получить настройки расписания
function getSchedule() {
    try {
        if (fs.existsSync(SCHEDULE_FILE)) {
            const data = fs.readFileSync(SCHEDULE_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('[Snapshot Schedule] Ошибка чтения расписания:', error);
    }
    
    // Значения по умолчанию
    return {
        schedules: [
            { dayOfWeek: 2, hour: 9, minute: 40, enabled: true }, // Вторник 9:40
            { dayOfWeek: 4, hour: 10, minute: 20, enabled: true } // Четверг 10:20
        ]
    };
}

// Сохранить настройки расписания
function saveSchedule(scheduleData) {
    try {
        const dir = path.dirname(SCHEDULE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(scheduleData, null, 2), 'utf8');
        console.log('[Snapshot Schedule] Расписание сохранено');
        return true;
    } catch (error) {
        console.error('[Snapshot Schedule] Ошибка сохранения расписания:', error);
        return false;
    }
}

module.exports = {
    createSnapshot,
    getSchedule,
    saveSchedule
};

