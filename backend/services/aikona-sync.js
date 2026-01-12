/**
 * Сервис для синхронизации данных из API Айконы
 */

const axios = require('axios');

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
    
    // Логируем запрос (без ключа в логах для безопасности)
    const logUrl = `${AIKONA_API_URL}?ObjectId=${objectId}&ApiKey=***`;
    console.log(`[Aikona API] Запрос данных для объекта ID: ${objectId}`);
    console.log(`[Aikona API] URL: ${logUrl}`);
    
    // Повторяем запрос при сетевых обрывах
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        attempt += 1;
        try {
            const response = await axios.get(url, {
                timeout: 30000, // 30 секунд таймаут
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Praktis-ID-Dashboard/1.0'
                },
                // Читаем как текст, чтобы не падать на невалидном JSON и залогировать тело
                responseType: 'text',
                transformResponse: [data => data],
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                validateStatus: status => status >= 200 && status < 300 // считаем только 2xx успешными
            });
            
            console.log(`[Aikona API] Статус ответа: ${response.status} ${response.statusText || ''}`);
            
            // Парсим JSON вручную, чтобы поймать ошибки и залогировать тело
            let parsed;
            try {
                parsed = JSON.parse(response.data);
            } catch (e) {
                console.error(`[Aikona API] Не удалось распарсить JSON. Тело (первые 500 символов): ${response.data?.substring?.(0, 500) || ''}`);
                throw new Error('API_UNAVAILABLE: BAD_JSON');
            }
            
            console.log(`[Aikona API] Успешно получены данные для объекта ${objectId}`);
            
            if (!Array.isArray(parsed) || parsed.length === 0) {
                console.error(`[Aikona API] Пустой ответ или не массив для объекта ${objectId}`);
                throw new Error('OBJECT_NOT_FOUND');
            }
            
            return parsed[0];
        } catch (error) {
            // Обработка ошибок axios
            if (error.response) {
                const status = error.response.status;
                console.error(`[Aikona API] Ошибка HTTP: ${status} ${error.response.statusText || ''}`);
                
                if (status === 404) {
                    console.error(`[Aikona API] Объект не найден (404)`);
                    throw new Error('OBJECT_NOT_FOUND');
                }
                
                const body = error.response.data;
                const errorBody = typeof body === 'string' ? body : JSON.stringify(body);
                console.error(`[Aikona API] Тело ошибки: ${errorBody.substring(0, 500)}`);
                
                throw new Error(`API_UNAVAILABLE: HTTP ${status}`);
            } else if (error.request) {
                const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
                const isConnReset = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
                
                if (isTimeout) {
                    console.error(`[Aikona API] Таймаут запроса для объекта ${objectId} (попытка ${attempt}/${maxRetries})`);
                    if (attempt < maxRetries) {
                        await new Promise(r => setTimeout(r, 500 * attempt));
                        continue;
                    }
                    throw new Error('API_UNAVAILABLE: TIMEOUT');
                }
                
                if (isConnReset) {
                    console.error(`[Aikona API] Соединение оборвано (${error.code || error.message}) для объекта ${objectId} (попытка ${attempt}/${maxRetries})`);
                    if (attempt < maxRetries) {
                        await new Promise(r => setTimeout(r, 500 * attempt));
                        continue;
                    }
                    throw new Error('API_UNAVAILABLE: CONNECTION_TERMINATED');
                }
                
                console.error(`[Aikona API] Сетевая ошибка для объекта ${objectId}: ${error.code || error.message} (попытка ${attempt}/${maxRetries})`);
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 500 * attempt));
                    continue;
                }
                throw new Error(`API_UNAVAILABLE: ${error.code || error.message}`);
            } else {
                if (error.message === 'OBJECT_NOT_FOUND' || error.message.startsWith('API_UNAVAILABLE')) {
                    console.error(`[Aikona API] Ошибка: ${error.message}`);
                    throw error;
                }
                
                console.error(`[Aikona API] Неожиданная ошибка для объекта ${objectId}:`, error.message);
                console.error(`[Aikona API] Тип ошибки: ${error.name}`);
                console.error(`[Aikona API] Stack: ${error.stack}`);
                
                throw new Error(`API_UNAVAILABLE: ${error.message}`);
            }
        }
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

