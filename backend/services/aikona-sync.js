/**
 * Сервис для синхронизации данных из API Айконы
 */

const https = require('https');
const { URL } = require('url');

// Используем ER32 endpoint (работает после обновления API Айконы)
const AIKONA_API_URL = 'https://icona.setl.ru/rest_api/api/ER32';
const AIKONA_API_KEY = process.env.AIKONA_API_KEY;

if (!AIKONA_API_KEY) {
    console.warn('⚠️  AIKONA_API_KEY не установлен в переменных окружения. Функции синхронизации с Айконой не будут работать.');
}

/**
 * Получить данные объекта из API Айконы через встроенный https модуль
 * Используем https напрямую для большей стабильности при проблемах с соединением
 * @param {number} objectId - ID объекта в Айконе
 * @returns {Promise<Object>} Данные объекта из Айконы
 */
async function fetchAikonaObjectData(objectId) {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        attempt += 1;
        try {
            return await fetchAikonaObjectDataSingle(objectId);
        } catch (error) {
            const isRetryable = error.message.includes('CONNECTION_TERMINATED') || 
                               error.message.includes('TIMEOUT') ||
                               error.message.includes('ECONNRESET') ||
                               error.message.includes('ETIMEDOUT');
            
            if (isRetryable && attempt < maxRetries) {
                console.error(`[Aikona API] Ошибка для объекта ${objectId} (попытка ${attempt}/${maxRetries}): ${error.message}`);
                await new Promise(r => setTimeout(r, 1000 * attempt)); // Увеличиваем задержку с каждой попыткой
                continue;
            }
            
            // Если не ретраится или попытки закончились - пробрасываем ошибку
            throw error;
        }
    }
}

function fetchAikonaObjectDataSingle(objectId) {
    return new Promise((resolve, reject) => {
        if (!AIKONA_API_KEY) {
            reject(new Error('AIKONA_API_KEY не настроен в переменных окружения'));
            return;
        }
        
        // ER32 использует параметр key вместо ApiKey, и id_construction вместо ObjectId
        // Но для обратной совместимости используем objectId как id_construction
        const url = `${AIKONA_API_URL}?key=${AIKONA_API_KEY}`;
        const logUrl = `${AIKONA_API_URL}?key=***`;
        console.log(`[Aikona API] Запрос данных для объекта ID: ${objectId}`);
        console.log(`[Aikona API] URL: ${logUrl}`);
        
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Praktis-ID-Dashboard/1.0',
                'Connection': 'close' // Отключаем keep-alive для избежания проблем
            },
            timeout: 30000 // 30 секунд таймаут
        };
        
        const req = https.request(options, (res) => {
            console.log(`[Aikona API] Статус ответа: ${res.statusCode} ${res.statusMessage}`);
            
            if (res.statusCode === 404) {
                console.error(`[Aikona API] Объект не найден (404)`);
                reject(new Error('OBJECT_NOT_FOUND'));
                return;
            }
            
            if (res.statusCode < 200 || res.statusCode >= 300) {
                console.error(`[Aikona API] Ошибка HTTP: ${res.statusCode} ${res.statusMessage}`);
                reject(new Error(`API_UNAVAILABLE: HTTP ${res.statusCode}`));
                return;
            }
            
            // Собираем данные по частям
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk.toString('utf8');
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    console.log(`[Aikona API] Успешно получены данные для объекта ${objectId}`);
                    
                    // ER32 возвращает массив объектов, нужно найти нужный по id_construction
                    if (!Array.isArray(parsed) || parsed.length === 0) {
                        console.error(`[Aikona API] Пустой ответ или не массив для объекта ${objectId}`);
                        reject(new Error('OBJECT_NOT_FOUND'));
                        return;
                    }
                    
                    // Ищем объект с нужным id_construction
                    const foundObject = parsed.find(obj => 
                        obj.id_construction === parseInt(objectId) || 
                        obj.id_construction === objectId
                    );
                    
                    if (!foundObject) {
                        console.error(`[Aikona API] Объект с id_construction=${objectId} не найден в ответе`);
                        console.error(`[Aikona API] Доступные id_construction: ${parsed.map(o => o.id_construction).join(', ')}`);
                        reject(new Error('OBJECT_NOT_FOUND'));
                        return;
                    }
                    
                    resolve(foundObject);
                } catch (parseError) {
                    console.error(`[Aikona API] Ошибка парсинга JSON для объекта ${objectId}:`, parseError.message);
                    console.error(`[Aikona API] Первые 500 символов ответа:`, data.substring(0, 500));
                    reject(new Error(`API_UNAVAILABLE: Invalid JSON response`));
                }
            });
            
            res.on('error', (error) => {
                console.error(`[Aikona API] Ошибка чтения ответа для объекта ${objectId}:`, error.message);
                reject(new Error(`API_UNAVAILABLE: ${error.message}`));
            });
        });
        
        req.on('error', (error) => {
            console.error(`[Aikona API] Ошибка запроса для объекта ${objectId}:`, error.message);
            console.error(`[Aikona API] Код ошибки: ${error.code}`);
            
            if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                reject(new Error(`API_UNAVAILABLE: CONNECTION_TERMINATED`));
            } else {
                reject(new Error(`API_UNAVAILABLE: ${error.code || error.message}`));
            }
        });
        
        req.on('timeout', () => {
            console.error(`[Aikona API] Таймаут запроса для объекта ${objectId}`);
            req.destroy();
            reject(new Error('API_UNAVAILABLE: TIMEOUT'));
        });
        
        req.setTimeout(30000);
        req.end();
    });
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
    
    // ER32 возвращает stk (маленькими буквами) вместо STKs
    if (!aikonaData.STKs && !aikonaData.stks && !aikonaData.stk) {
        // Нет СТК в ответе
        return object;
    }
    
    const stks = aikonaData.STKs || aikonaData.stks || aikonaData.stk || [];
    
    // Обновляем total для каждого СМР
    const updatedGeneratedActs = (object.generatedActs || []).map(smr => {
        const matchingSTK = findMatchingSTK(smr.name, stks);
        
        if (matchingSTK) {
            // ER32 возвращает fact_sz (процент выполнения) вместо Locations
            // Используем fact_sz для подсчета, если Locations нет
            let completedCount = 0;
            
            if (matchingSTK.Locations || matchingSTK.locations) {
                completedCount = countCompletedLocations(matchingSTK.Locations || matchingSTK.locations || []);
            } else if (matchingSTK.fact_sz !== undefined) {
                // Если нет Locations, используем fact_sz как приблизительный показатель
                // fact_sz - это процент выполнения (0-100), но нам нужно количество
                // Пока оставляем 0, если нет Locations
                completedCount = 0;
            }
            
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

