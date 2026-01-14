/**
 * Скрипт для локальной синхронизации данных с Aikona API и загрузки на Render
 * 
 * Этот скрипт:
 * 1. Скачивает данные с Render
 * 2. Синхронизирует их локально (используя рабочее локальное соединение с Aikona API)
 * 3. Загружает обновленные данные обратно на Render
 * 
 * ⚠️ ВАЖНО: Этот скрипт НЕ выполняется автоматически при деплое.
 * Он запускается только вручную локально.
 * 
 * Использование:
 * 1. Установите URL вашего продакшена в переменной PRODUCTION_URL
 * 2. Убедитесь, что AIKONA_API_KEY установлен в переменных окружения
 * 3. Запустите: node ID/scripts/sync-aikona-local.js
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');

// ⚠️ ИЗМЕНИТЕ ЭТО НА URL ВАШЕГО ПРОДАКШЕНА
const PRODUCTION_URL = 'https://eid-praktis-id.onrender.com'; // Замените на ваш URL (без слеша в конце)

// Загружаем функции синхронизации из backend
const { syncObjectFromAikona } = require(path.join(__dirname, '..', 'backend', 'services', 'aikona-sync'));

// Проверяем наличие AIKONA_API_KEY
if (!process.env.AIKONA_API_KEY) {
  console.error('❌ Ошибка: AIKONA_API_KEY не установлен в переменных окружения');
  console.error('Установите переменную окружения: set AIKONA_API_KEY=ваш_ключ');
  process.exit(1);
}

/**
 * Выполнить HTTP запрос
 */
function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${PRODUCTION_URL}${endpoint}`);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      method: method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${json.error || responseData}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Скачать данные с Render
 */
async function downloadData() {
  console.log('📥 Скачиваю данные с Render...');
  try {
    const response = await makeRequest('GET', '/api/containers');
    
    // Отладочная информация о структуре ответа
    console.log(`   Тип ответа: ${Array.isArray(response) ? 'массив' : typeof response}`);
    console.log(`   Ключи ответа: ${Array.isArray(response) ? 'массив длиной ' + response.length : Object.keys(response || {}).join(', ')}`);
    
    // API возвращает массив контейнеров напрямую, а не объект с полем containers
    const containers = Array.isArray(response) ? response : (response.containers || []);
    
    console.log(`✓ Получено ${containers.length} контейнеров`);
    
    if (containers.length === 0) {
      console.log('⚠️  Предупреждение: API вернул пустой массив контейнеров');
      console.log('   Проверьте:');
      console.log('   1. Что данные есть на Render (зайдите на сайт и проверьте)');
      console.log('   2. Что URL продакшена правильный');
      console.log('   3. Что сервис на Render запущен и доступен');
      console.log('\n   Первые 500 символов ответа:', JSON.stringify(response).substring(0, 500));
      return { containers: [] };
    }
    
    // Подсчитываем общее количество объектов для информации
    let totalObjects = 0;
    let objectsWithAikonaId = 0;
    
    containers.forEach((container, idx) => {
      const objects = container.objects || [];
      const containerObjectsWithAikona = objects.filter(obj => obj.aikonaObjectId).length;
      totalObjects += objects.length;
      objectsWithAikonaId += containerObjectsWithAikona;
      
      console.log(`   Контейнер #${idx + 1}: "${container.name}" - ${objects.length} объектов, ${containerObjectsWithAikona} с ID в Айконе`);
    });
    
    console.log(`\n   Всего объектов: ${totalObjects}, с ID в Айконе: ${objectsWithAikonaId}`);
    
    return { containers };
  } catch (error) {
    console.error('❌ Ошибка при скачивании данных:', error.message);
    console.error('   Проверьте, что Render доступен и API работает');
    throw error;
  }
}

/**
 * Загрузить обновленный объект на Render
 */
async function uploadObject(containerId, objectId, objectData) {
  console.log(`📤 Загружаю объект "${objectData.name}" (ID: ${objectId}) на Render...`);
  try {
    await makeRequest('PUT', `/api/containers/${containerId}/objects/${objectId}`, objectData);
    console.log(`✓ Объект "${objectData.name}" успешно обновлен на Render`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при загрузке объекта "${objectData.name}":`, error.message);
    return false;
  }
}

/**
 * Основная функция синхронизации
 */
async function main() {
  console.log('🔄 Начало локальной синхронизации с Aikona API\n');
  console.log(`URL продакшена: ${PRODUCTION_URL}\n`);
  
  try {
    // 1. Скачиваем данные с Render
    const data = await downloadData();
    const containers = data.containers || [];
    
    if (containers.length === 0) {
      console.log('⚠️  Нет контейнеров для синхронизации');
      return;
    }
    
    let totalSynced = 0;
    let totalErrors = 0;
    const errors = [];
    
    // 2. Синхронизируем каждый объект
    for (const container of containers) {
      console.log(`\n📦 Контейнер: "${container.name}"`);
      
      for (const object of container.objects || []) {
        if (!object.aikonaObjectId) {
          console.log(`⏭️  Пропуск объекта "${object.name}" (нет ID в Айконе)`);
          continue;
        }
        
        try {
          console.log(`\n🔄 Синхронизация объекта "${object.name}" (Aikona ID: ${object.aikonaObjectId})...`);
          
          // Синхронизируем локально (используя рабочее локальное соединение)
          const updatedObject = await syncObjectFromAikona(object);
          
          // 3. Загружаем обновленный объект на Render
          const success = await uploadObject(container.id, object.id, updatedObject);
          
          if (success) {
            totalSynced++;
            console.log(`✅ Объект "${object.name}" успешно синхронизирован и загружен`);
          } else {
            totalErrors++;
            errors.push({
              object: object.name,
              container: container.name,
              error: 'Ошибка при загрузке на Render'
            });
          }
          
          // Задержка между объектами (чтобы не перегружать Render API)
          if (totalSynced + totalErrors < containers.reduce((sum, c) => sum + (c.objects || []).length, 0)) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 секунды
          }
        } catch (error) {
          totalErrors++;
          const errorMsg = `Ошибка синхронизации объекта "${object.name}": ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push({
            object: object.name,
            container: container.name,
            error: error.message
          });
        }
      }
    }
    
    // 4. Итоги
    console.log('\n' + '='.repeat(60));
    console.log('📊 Итоги синхронизации:');
    console.log(`✅ Успешно: ${totalSynced}`);
    console.log(`❌ Ошибок: ${totalErrors}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Объекты с ошибками:');
      errors.forEach(({ object, container, error }) => {
        console.log(`  - "${object}" (${container}): ${error}`);
      });
    }
    
    console.log('\n✅ Синхронизация завершена!');
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
    console.error('\nПроверьте:');
    console.error('1. PRODUCTION_URL указан правильно');
    console.error('2. Сервис на Render.com запущен и доступен');
    console.error('3. AIKONA_API_KEY установлен в переменных окружения');
    process.exit(1);
  }
}

// Запускаем синхронизацию
main().catch((error) => {
  console.error('❌ Необработанная ошибка:', error);
  process.exit(1);
});

