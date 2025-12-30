/**
 * Сервис для синхронизации данных из API Айконы
 */

// Используем node-fetch для Node.js (если нет встроенного fetch)
let fetch;
try {
    // Проверяем, есть ли встроенный fetch (Node.js 18+)
    if (typeof globalThis.fetch !== 'undefined') {
        fetch = globalThis.fetch;
    } else {
        // Используем node-fetch для старых версий Node.js
        fetch = require('node-fetch');
    }
} catch (e) {
    // Если node-fetch не установлен, попробуем использовать встроенный
    fetch = globalThis.fetch;
    if (!fetch) {
        throw new Error('Fetch is not available. Please install node-fetch or use Node.js 18+');
    }
}

const AIKONA_API_URL = 'https://icona.setl.ru/rest_api/api/IntegrationObjectInfo';
const AIKONA_API_KEY = process.env.AIKONA_API_KEY;

if (!AIKONA_API_KEY) {
    console.warn('⚠️  AIKONA_API_KEY не установлен в переменных окружения. Функции синхронизации с Айконой не будут работать.');
}

/**
 * Получить данные объекта из API Айконы
 * @param {number} objectId - ID объекта в Айконе
 * @returns {Promise<Object>} Данные объекта из Айконы
 */
async function fetchAikonaObjectData(objectId) {
    if (!AIKONA_API_KEY) {
        throw new Error('AIKONA_API_KEY не настроен в переменных окружения');
    }
    
    const url = `${AIKONA_API_URL}?ObjectId=${objectId}&ApiKey=${AIKONA_API_KEY}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('OBJECT_NOT_FOUND');
            }
            throw new Error('API_UNAVAILABLE');
        }
        
        const data = await response.json();
        
        // API возвращает массив с одним объектом
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('OBJECT_NOT_FOUND');
        }
        
        return data[0];
    } catch (error) {
        if (error.message === 'OBJECT_NOT_FOUND' || error.message === 'API_UNAVAILABLE') {
            throw error;
        }
        // Сетевая ошибка или другая проблема
        throw new Error('API_UNAVAILABLE');
    }
}

/**
 * Сопоставить СМР из нашей системы с СТК из Айконы
 * @param {string} smrName - Название СМР в нашей системе
 * @param {Array} stks - Массив СТК из Айконы
 * @returns {Object|null} Найденный СТК или null
 */
function findMatchingSTK(smrName, stks) {
    // Нормализуем название СМР (убираем лишние пробелы, учитываем экранированные кавычки)
    const normalizedSmrName = smrName.trim();
    
    for (const stk of stks) {
        const stkName = stk.STKName || stk.stkName || '';
        const normalizedStkName = stkName.trim();
        
        // Точное совпадение
        if (normalizedSmrName === normalizedStkName) {
            return stk;
        }
        
        // Также проверяем с учетом экранированных кавычек
        // В JSON кавычки могут быть экранированы как \" или просто "
        const smrNameUnescaped = normalizedSmrName.replace(/\\"/g, '"');
        const stkNameUnescaped = normalizedStkName.replace(/\\"/g, '"');
        
        if (smrNameUnescaped === stkNameUnescaped) {
            return stk;
        }
    }
    
    return null;
}

/**
 * Подсчитать количество выполненных локаций (SZCompletion === 100)
 * @param {Array} locations - Массив локаций
 * @returns {number} Количество выполненных локаций
 */
function countCompletedLocations(locations) {
    if (!Array.isArray(locations)) {
        return 0;
    }
    
    return locations.filter(location => {
        // Проверяем, что SZCompletion равен 100 (может быть как число, так и строка)
        const completion = location.SZCompletion !== undefined 
            ? location.SZCompletion 
            : location.szCompletion;
        
        // Проверяем точное равенство 100 (с учетом разных типов данных)
        return completion === 100 || completion === '100' || completion === 100.0 || parseFloat(completion) === 100;
    }).length;
}

/**
 * Синхронизировать данные объекта из Айконы
 * @param {Object} object - Объект из нашей системы
 * @returns {Promise<Object>} Обновленный объект с новыми значениями total для СМР
 */
async function syncObjectFromAikona(object) {
    if (!object.aikonaObjectId) {
        throw new Error('AIKONA_ID_NOT_SET');
    }
    
    // Получаем данные из Айконы
    const aikonaData = await fetchAikonaObjectData(object.aikonaObjectId);
    
    if (!aikonaData.STKs && !aikonaData.stks) {
        // Нет СТК в ответе
        return object;
    }
    
    const stks = aikonaData.STKs || aikonaData.stks || [];
    
    // Обновляем total для каждого СМР
    const updatedGeneratedActs = (object.generatedActs || []).map(smr => {
        const matchingSTK = findMatchingSTK(smr.name, stks);
        
        if (matchingSTK) {
            const completedCount = countCompletedLocations(matchingSTK.Locations || matchingSTK.locations || []);
            return {
                ...smr,
                total: completedCount
            };
        }
        
        // Если не найден - оставляем total = 0 (или существующее значение, если оно было)
        return {
            ...smr,
            total: smr.total || 0
        };
    });
    
    // Возвращаем обновленный объект
    return {
        ...object,
        generatedActs: updatedGeneratedActs
    };
}

module.exports = {
    syncObjectFromAikona,
    fetchAikonaObjectData
};

