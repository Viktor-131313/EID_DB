/**
 * Сервис для синхронизации данных из API Айконы
 */

const https = require('https');
const { URL } = require('url');

// Используем IntegrationObjectInfo endpoint (работает, как показано в Swagger)
const AIKONA_API_URL = 'https://icona.setl.ru/rest_api/api/IntegrationObjectInfo';
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
        
        // IntegrationObjectInfo использует ObjectId и ApiKey
        const url = `${AIKONA_API_URL}?ObjectId=${objectId}&ApiKey=${AIKONA_API_KEY}`;
        const logUrl = `${AIKONA_API_URL}?ObjectId=${objectId}&ApiKey=***`;
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
            timeout: 180000 // 180 секунд (3 минуты) таймаут для больших ответов IntegrationObjectInfo
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
                    
                    // IntegrationObjectInfo возвращает массив объектов, каждый содержит поле STKs
                    // Структура: [{ ObjectId, ObjectName, STKs: [{ STKId, STKName, Locations: [...] }, ...] }, ...]
                    console.log(`[Aikona API] Структура ответа:`, Array.isArray(parsed) ? 'массив' : 'объект');
                    
                    let stksArray = [];
                    
                    if (Array.isArray(parsed)) {
                        // Если ответ - массив объектов, каждый объект содержит поле STKs
                        console.log(`[Aikona API] Ответ - массив из ${parsed.length} элементов`);
                        
                        // Собираем все СТК из всех объектов
                        parsed.forEach((obj, index) => {
                            console.log(`[Aikona API] Элемент #${index + 1} - ключи:`, Object.keys(obj || {}));
                            
                            if (obj && obj.STKs && Array.isArray(obj.STKs)) {
                                console.log(`[Aikona API] Элемент #${index + 1} содержит ${obj.STKs.length} СТК`);
                                stksArray = stksArray.concat(obj.STKs);
                            } else if (obj && obj.STKName) {
                                // Если элемент сам является СТК (прямо в массиве)
                                console.log(`[Aikona API] Элемент #${index + 1} - это СТК: "${obj.STKName}"`);
                                stksArray.push(obj);
                            }
                        });
                        
                        console.log(`[Aikona API] Всего собрано ${stksArray.length} СТК из массива`);
                    } else if (parsed && parsed.STKs && Array.isArray(parsed.STKs)) {
                        // Если ответ - объект с полем STKs
                        stksArray = parsed.STKs;
                        console.log(`[Aikona API] Ответ - объект с полем STKs, извлечено ${stksArray.length} СТК`);
                    } else {
                        console.error(`[Aikona API] Неожиданная структура ответа для объекта ${objectId}`);
                        console.error(`[Aikona API] Тип:`, typeof parsed, `Ключи:`, Object.keys(parsed || {}));
                        reject(new Error('OBJECT_NOT_FOUND'));
                        return;
                    }
                    
                    if (stksArray.length === 0) {
                        console.error(`[Aikona API] Пустой массив СТК для объекта ${objectId}`);
                        reject(new Error('OBJECT_NOT_FOUND'));
                        return;
                    }
                    
                    // Логируем первый СТК для отладки
                    const firstSTK = stksArray[0];
                    if (firstSTK) {
                        console.log(`[Aikona API] Первый СТК - ключи:`, Object.keys(firstSTK || {}));
                        console.log(`[Aikona API] Первый СТК - STKName: "${firstSTK.STKName || firstSTK.stkName || 'НЕТ'}"`);
                        console.log(`[Aikona API] Первый СТК - Locations: ${Array.isArray(firstSTK.Locations) ? firstSTK.Locations.length : 'НЕТ'} локаций`);
                    }
                    
                    // Возвращаем массив СТК
                    resolve({ STKs: stksArray });
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
        
        req.setTimeout(180000); // 180 секунд (3 минуты) для больших ответов
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
    if (!stks || !Array.isArray(stks) || stks.length === 0) {
        console.log(`[Aikona Sync] findMatchingSTK: stks пустой или не массив`);
        return null;
    }
    
    // Нормализуем название СМР (убираем лишние пробелы, учитываем экранированные кавычки)
    const normalizedSmrName = smrName.trim();
    
    console.log(`[Aikona Sync] findMatchingSTK: ищем СТК "${normalizedSmrName}" среди ${stks.length} СТК`);
    
    // Логируем первые несколько СТК для отладки
    const stksToLog = stks.slice(0, 5);
    stksToLog.forEach((stk, index) => {
        const stkName = stk.STKName || stk.stkName || stk.name || stk.name_stk || '';
        console.log(`[Aikona Sync] findMatchingSTK: СТК #${index + 1}: "${stkName}"`);
    });
    if (stks.length > 5) {
        console.log(`[Aikona Sync] findMatchingSTK: ... и еще ${stks.length - 5} СТК`);
    }
    
    for (let i = 0; i < stks.length; i++) {
        const stk = stks[i];
        
        // Логируем структуру первого СТК для отладки
        if (i === 0) {
            console.log(`[Aikona Sync] findMatchingSTK: Структура первого СТК:`, Object.keys(stk || {}));
        }
        
        // IntegrationObjectInfo использует STKName (с большой буквы)
        const stkName = stk.STKName || stk.stkName || stk.name || stk.name_stk || '';
        const normalizedStkName = stkName.trim();
        
        if (i < 3) {
            console.log(`[Aikona Sync] findMatchingSTK: СТК #${i + 1}: STKName="${stk.STKName}", stkName="${stk.stkName}", name="${stk.name}", name_stk="${stk.name_stk}", итого: "${normalizedStkName}"`);
        }
        
        // Точное совпадение
        if (normalizedSmrName === normalizedStkName) {
            console.log(`[Aikona Sync] findMatchingSTK: ✓ ТОЧНОЕ СОВПАДЕНИЕ! "${normalizedSmrName}" === "${normalizedStkName}"`);
            return stk;
        }
        
        // Также проверяем с учетом экранированных кавычек
        // В JSON кавычки могут быть экранированы как \" или просто "
        const smrNameUnescaped = normalizedSmrName.replace(/\\"/g, '"');
        const stkNameUnescaped = normalizedStkName.replace(/\\"/g, '"');
        
        if (smrNameUnescaped === stkNameUnescaped) {
            console.log(`[Aikona Sync] findMatchingSTK: ✓ СОВПАДЕНИЕ после удаления экранированных кавычек! "${smrNameUnescaped}" === "${stkNameUnescaped}"`);
            return stk;
        }
        
        // Дополнительная проверка: сравниваем без учета регистра и лишних пробелов
        const smrNameNormalized = normalizedSmrName.toLowerCase().replace(/\s+/g, ' ').trim();
        const stkNameNormalized = normalizedStkName.toLowerCase().replace(/\s+/g, ' ').trim();
        
        if (smrNameNormalized === stkNameNormalized) {
            console.log(`[Aikona Sync] findMatchingSTK: ✓ СОВПАДЕНИЕ после нормализации! "${smrNameNormalized}" === "${stkNameNormalized}"`);
            return stk;
        }
    }
    
    console.log(`[Aikona Sync] findMatchingSTK: ✗ СТК "${normalizedSmrName}" НЕ НАЙДЕН среди ${stks.length} СТК`);
    return null;
}

/**
 * Парсить LocationName для извлечения корпуса и секции
 * Формат: "Корпус 8.2_Секция 2_Этаж 4"
 * @param {string} locationName - Название локации из Айконы
 * @returns {Object|null} { building: "8.2", section: "2" } или null
 */
function parseLocationName(locationName) {
    if (!locationName || typeof locationName !== 'string') {
        console.log(`[Aikona Sync] parseLocationName: пустое или не строка: ${locationName}`);
        return null;
    }
    
    // Разделяем по подчеркиваниям
    const parts = locationName.split('_');
    if (parts.length < 2) {
        console.log(`[Aikona Sync] parseLocationName: недостаточно частей в "${locationName}" (ожидается минимум 2, получено ${parts.length})`);
        return null;
    }
    
    // Первая часть: "Корпус 8.2" -> извлекаем "8.2"
    const buildingPart = parts[0].trim();
    const buildingMatch = buildingPart.match(/корпус\s+(.+)/i);
    const building = buildingMatch ? buildingMatch[1].trim() : null;
    
    if (!building) {
        console.log(`[Aikona Sync] parseLocationName: не удалось извлечь корпус из "${buildingPart}"`);
    }
    
    // Вторая часть: "Секция 2" -> извлекаем "2"
    const sectionPart = parts[1].trim();
    const sectionMatch = sectionPart.match(/секция\s+(.+)/i);
    const section = sectionMatch ? sectionMatch[1].trim() : null;
    
    if (!section) {
        console.log(`[Aikona Sync] parseLocationName: не удалось извлечь секцию из "${sectionPart}"`);
    }
    
    if (!building || !section) {
        console.log(`[Aikona Sync] parseLocationName: результат null для "${locationName}" (building: ${building}, section: ${section})`);
        return null;
    }
    
    console.log(`[Aikona Sync] parseLocationName: "${locationName}" -> building: "${building}", section: "${section}"`);
    return { building, section };
}

/**
 * Подсчитать количество выполненных локаций (SZCompletion === 100) для конкретной комбинации корпус/секция
 * @param {Array} locations - Массив локаций из Айконы
 * @param {string} targetBuilding - Название корпуса (например, "8.2")
 * @param {string} targetSection - Название секции (например, "2")
 * @returns {Object} { count: количество с SZCompletion=100, total: общее количество }
 */
function countLocationsForBuildingSection(locations, targetBuilding, targetSection) {
    if (!Array.isArray(locations)) {
        console.log(`[Aikona Sync] countLocationsForBuildingSection: locations не массив`);
        return { count: 0, total: 0 };
    }
    
    // Нормализуем названия для сравнения (убираем лишние пробелы, приводим к строке)
    const normalizedTargetBuilding = String(targetBuilding || '').trim();
    const normalizedTargetSection = String(targetSection || '').trim();
    
    console.log(`[Aikona Sync] Ищем локации для корпуса "${normalizedTargetBuilding}", секции "${normalizedTargetSection}"`);
    console.log(`[Aikona Sync] Всего локаций для проверки: ${locations.length}`);
    
    // ШАГ 1: Фильтруем локации по корпусу (сначала корпус!)
    const buildingMatches = locations.filter(location => {
        const locationName = location.LocationName || location.locationName || '';
        const parsed = parseLocationName(locationName);
        
        if (!parsed) {
            return false;
        }
        
        // Нормализуем извлеченные значения
        const normalizedParsedBuilding = String(parsed.building || '').trim();
        
        // Сравниваем корпус
        const buildingMatch = normalizedParsedBuilding === normalizedTargetBuilding;
        
        if (buildingMatch) {
            console.log(`[Aikona Sync] ✓ Найден корпус "${normalizedParsedBuilding}" в локации: "${locationName}"`);
        }
        
        return buildingMatch;
    });
    
    console.log(`[Aikona Sync] После фильтрации по корпусу: ${buildingMatches.length} локаций`);
    
    // ШАГ 2: Фильтруем по секции (только среди локаций с нужным корпусом)
    const matchingLocations = buildingMatches.filter(location => {
        const locationName = location.LocationName || location.locationName || '';
        const parsed = parseLocationName(locationName);
        
        if (!parsed) {
            return false;
        }
        
        // Нормализуем извлеченные значения
        const normalizedParsedSection = String(parsed.section || '').trim();
        
        // Сравниваем секцию
        const sectionMatch = normalizedParsedSection === normalizedTargetSection;
        
        if (sectionMatch) {
            console.log(`[Aikona Sync] ✓ Найдена секция "${normalizedParsedSection}" в локации: "${locationName}"`);
        }
        
        return sectionMatch;
    });
    
    console.log(`[Aikona Sync] После фильтрации по корпусу и секции: ${matchingLocations.length} локаций`);
    
    // Считаем общее количество локаций для этой комбинации
    const total = matchingLocations.length;
    
    // ШАГ 3: Считаем количество локаций с SZCompletion = 100 (это и есть количество актов)
    const count = matchingLocations.filter(location => {
        const completion = location.SZCompletion !== undefined 
            ? location.SZCompletion 
            : location.szCompletion;
        
        // Проверяем точное равенство 100 (с учетом разных типов данных)
        const isCompleted = completion === 100 || completion === '100' || completion === 100.0 || parseFloat(completion) === 100;
        
        if (isCompleted) {
            const locationName = location.LocationName || location.locationName || '';
            console.log(`[Aikona Sync] ✓ Завершенная локация (SZCompletion=100): "${locationName}"`);
        }
        
        return isCompleted;
    }).length;
    
    console.log(`[Aikona Sync] ИТОГО: count = ${count} (этажей с SZCompletion=100), total = ${total} (всего этажей)`);
    
    return { count, total };
}

/**
 * Синхронизировать данные объекта из Айконы
 * Обновляет generatedActs для каждого СТК у каждого подрядчика в каждой секции каждого корпуса
 * @param {Object} object - Объект из нашей системы
 * @returns {Promise<Object>} Обновленный объект с новыми значениями count и total для СМР
 */
async function syncObjectFromAikona(object) {
    if (!object.aikonaObjectId) {
        throw new Error('AIKONA_ID_NOT_SET');
    }
    
    // Получаем данные из Айконы
    const aikonaData = await fetchAikonaObjectData(object.aikonaObjectId);
    
    // IntegrationObjectInfo возвращает массив СТК напрямую или обернутый в объект
    let stks = [];
    if (Array.isArray(aikonaData)) {
        stks = aikonaData;
        console.log(`[Aikona Sync] Получен массив СТК напрямую: ${stks.length} СТК`);
    } else if (aikonaData.STKs) {
        stks = aikonaData.STKs;
        console.log(`[Aikona Sync] Получены СТК из поля STKs: ${stks.length} СТК`);
    } else if (aikonaData.stks) {
        stks = aikonaData.stks;
        console.log(`[Aikona Sync] Получены СТК из поля stks: ${stks.length} СТК`);
    } else if (aikonaData.stk) {
        stks = Array.isArray(aikonaData.stk) ? aikonaData.stk : [aikonaData.stk];
        console.log(`[Aikona Sync] Получены СТК из поля stk: ${stks.length} СТК`);
    } else {
        console.log(`[Aikona Sync] ⚠ Не удалось извлечь СТК из ответа. Структура ответа:`, Object.keys(aikonaData || {}));
    }
    
    if (stks.length === 0) {
        console.log(`[Aikona Sync] ⚠ Нет СТК в ответе Айконы`);
        // Нет СТК в ответе
        return object;
    }
    
    console.log(`[Aikona Sync] ✓ Успешно извлечено ${stks.length} СТК из ответа Айконы`);
    
    // Новая структура: buildings -> sections -> contractors[]
    if (object.buildings && Array.isArray(object.buildings) && object.buildings.length > 0) {
        const updatedBuildings = object.buildings.map(building => {
            if (!building.sections || !Array.isArray(building.sections)) {
                return building;
            }
            
            const updatedSections = building.sections.map(section => {
                if (!section.contractors || !Array.isArray(section.contractors)) {
                    return section;
                }
                
                const updatedContractors = section.contractors.map(contractor => {
                    if (!contractor.generatedActs || !Array.isArray(contractor.generatedActs)) {
                        return contractor;
                    }
                    
                    // Обновляем каждый СТК у подрядчика
                    const updatedGeneratedActs = contractor.generatedActs.map(smr => {
                        const buildingName = building.name || building.id?.toString() || '';
                        const sectionName = section.name || section.id?.toString() || '';
                        
                        console.log(`\n[Aikona Sync] ========================================`);
                        console.log(`[Aikona Sync] Синхронизация СТК: "${smr.name}"`);
                        console.log(`[Aikona Sync] Подрядчик: "${contractor.name || 'Не указан'}"`);
                        console.log(`[Aikona Sync] Корпус: "${buildingName}", Секция: "${sectionName}"`);
                        
                        // ШАГ 1: Ищем соответствующий СТК в ответе Айконы по названию
                        const matchingSTK = findMatchingSTK(smr.name, stks);
                        
                        if (!matchingSTK) {
                            console.log(`[Aikona Sync] СТК "${smr.name}" НЕ НАЙДЕН в ответе Айконы`);
                            // СТК не найден в Айконе - оставляем как есть
                            return smr;
                        }
                        
                        console.log(`[Aikona Sync] ✓ СТК найден в Айконе: "${matchingSTK.STKName || matchingSTK.stkName || 'Без названия'}"`);
                        
                        // ШАГ 2: Получаем Locations для этого СТК
                        const locations = matchingSTK.Locations || matchingSTK.locations || [];
                        
                        if (locations.length === 0) {
                            console.log(`[Aikona Sync] ⚠ Нет локаций в этом СТК`);
                            // Нет локаций - обнуляем только total (для "СЗ ICONA")
                            // count не трогаем - оно для "PRAKTIS ID"
                            return {
                                ...smr,
                                total: 0  // Обнуляем только total (СЗ ICONA)
                            };
                        }
                        
                        console.log(`[Aikona Sync] Всего локаций в СТК: ${locations.length}`);
                        
                        // ШАГ 3: Фильтруем локации по корпусу и секции
                        // ШАГ 4: Считаем этажи с SZCompletion = 100
                        const { count, total } = countLocationsForBuildingSection(
                            locations,
                            buildingName,
                            sectionName
                        );
                        
                        console.log(`[Aikona Sync] ✓ Результат: aikonaCount = ${count} (этажей с SZCompletion=100), total = ${total} (всего этажей)`);
                        console.log(`[Aikona Sync] ========================================\n`);
                        
                        // Обновляем только total (для "СЗ ICONA") - это количество этажей с SZCompletion=100
                        // count (для "PRAKTIS ID") не трогаем - оно заполняется вручную или из другого интерфейса
                        return {
                            ...smr,
                            // count не обновляем - оно для "PRAKTIS ID" (фактически сгенерированные акты)
                            total: count  // total для "СЗ ICONA" = количество этажей с SZCompletion=100
                        };
                    });
                    
                    return {
                        ...contractor,
                        generatedActs: updatedGeneratedActs
                    };
                });
                
                return {
                    ...section,
                    contractors: updatedContractors
                };
            });
            
            return {
                ...building,
                sections: updatedSections
            };
        });
        
        // Возвращаем обновленный объект с новой структурой
        return {
            ...object,
            buildings: updatedBuildings
        };
    }
    
    // Старая структура: contractors (массив подрядчиков) или прямые поля объекта
    // Для обратной совместимости оставляем старую логику
    const updatedGeneratedActs = (object.generatedActs || []).map(smr => {
        const matchingSTK = findMatchingSTK(smr.name, stks);
        
        if (matchingSTK) {
            // IntegrationObjectInfo возвращает Locations массив
            // Подсчитываем выполненные локации (где SZCompletion === 100)
            let completedCount = 0;
            let totalCount = 0;
            
            // Приоритет: Locations (IntegrationObjectInfo) > fact_sz (ER32, если используется)
            if (matchingSTK.Locations || matchingSTK.locations) {
                const locations = matchingSTK.Locations || matchingSTK.locations || [];
                totalCount = locations.length;
                completedCount = locations.filter(location => {
                    const completion = location.SZCompletion !== undefined 
                        ? location.SZCompletion 
                        : location.szCompletion;
                    return completion === 100 || completion === '100' || completion === 100.0 || parseFloat(completion) === 100;
                }).length;
            } else if (matchingSTK.fact_sz !== undefined && matchingSTK.fact_sz !== null) {
                // Fallback для ER32: используем fact_sz если Locations нет
                const factSz = parseFloat(matchingSTK.fact_sz);
                if (smr.total && smr.total > 0) {
                    completedCount = Math.round((factSz / 100) * smr.total);
                    totalCount = smr.total;
                } else {
                    completedCount = Math.round(factSz);
                    totalCount = completedCount;
                }
            }
            
            // Для старой структуры: обновляем только total (для "СЗ ICONA")
            // count не трогаем - оно для "PRAKTIS ID"
            return {
                ...smr,
                // count не обновляем - оно для "PRAKTIS ID" (фактически сгенерированные акты)
                total: completedCount  // total для "СЗ ICONA" = количество этажей с SZCompletion=100
            };
        }
        
        // Если не найден - оставляем как есть
        return {
            ...smr,
            count: smr.count || 0,
            total: smr.total || 0
        };
    });
    
    // Возвращаем обновленный объект, сохраняя подрядчиков
    return {
        ...object,
        generatedActs: updatedGeneratedActs,
        contractors: object.contractors || [] // Сохраняем подрядчиков при синхронизации
    };
}

module.exports = {
    syncObjectFromAikona,
    fetchAikonaObjectData
};

