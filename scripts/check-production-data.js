/**
 * Скрипт для проверки данных на продакшене
 * Быстрая проверка, есть ли еще данные на Render
 */

const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://eid-praktis-id.onrender.com';

function checkEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${PRODUCTION_URL}${endpoint}`);
    const client = url.protocol === 'https:' ? https : http;
    
    console.log(`\nПроверяю ${endpoint}...`);
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const size = JSON.stringify(json).length;
          console.log(`✓ Статус: ${res.statusCode}`);
          console.log(`✓ Размер данных: ${size} байт`);
          
          if (Array.isArray(json)) {
            console.log(`✓ Количество элементов: ${json.length}`);
            if (json.length > 0 && json[0]) {
              console.log(`✓ Первый элемент:`, JSON.stringify(json[0], null, 2).substring(0, 200));
            }
          } else if (json.containers) {
            const totalObjects = json.containers.reduce((sum, c) => sum + (c.objects ? c.objects.length : 0), 0);
            console.log(`✓ Контейнеров: ${json.containers.length}`);
            console.log(`✓ Всего объектов: ${totalObjects}`);
            if (json.containers.length > 0 && json.containers[0].objects && json.containers[0].objects.length > 0) {
              console.log(`✓ Первый объект:`, json.containers[0].objects[0].name || 'без имени');
            }
          }
          
          resolve({ status: res.statusCode, data: json, size });
        } catch (error) {
          console.log(`✗ Ошибка парсинга: ${error.message}`);
          console.log(`  Первые 200 символов ответа:`, data.substring(0, 200));
          resolve({ status: res.statusCode, error: error.message, raw: data.substring(0, 500) });
        }
      });
    }).on('error', (error) => {
      console.log(`✗ Ошибка: ${error.message}`);
      resolve({ error: error.message });
    });
  });
}

async function main() {
  console.log('🔍 Проверка данных на продакшене...');
  console.log(`URL: ${PRODUCTION_URL}\n`);
  
  const results = {
    containers: await checkEndpoint('/api/containers'),
    tasks: await checkEndpoint('/api/tasks'),
    snapshots: await checkEndpoint('/api/snapshots')
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГИ:');
  console.log('='.repeat(60));
  
  // Проверка контейнеров
  if (results.containers.data) {
    if (results.containers.data.containers) {
      const totalObjects = results.containers.data.containers.reduce((sum, c) => sum + (c.objects ? c.objects.length : 0), 0);
      if (totalObjects > 1 || (totalObjects === 1 && results.containers.data.containers[0].objects[0].name !== 'vbbbn')) {
        console.log('✅ Контейнеры: ЕСТЬ РЕАЛЬНЫЕ ДАННЫЕ!');
        console.log('   ⚠️  СРОЧНО скачайте через download-production-data.js');
      } else {
        console.log('❌ Контейнеры: Только тестовые данные');
      }
    }
  }
  
  // Проверка задач
  if (results.tasks.data && Array.isArray(results.tasks.data)) {
    if (results.tasks.data.length > 4 || results.tasks.data.some(t => t.taskNumber !== 2862 && t.taskNumber !== 11 && t.taskNumber !== 12 && t.taskNumber !== 123)) {
      console.log('✅ Задачи: ЕСТЬ РЕАЛЬНЫЕ ДАННЫЕ!');
      console.log('   ⚠️  СРОЧНО скачайте через download-production-data.js');
    } else {
      console.log('❌ Задачи: Только тестовые данные');
    }
  }
  
  console.log('\n💡 Если данные есть - НЕМЕДЛЕННО запустите:');
  console.log('   node ID/scripts/download-production-data.js');
}

main().catch(console.error);

