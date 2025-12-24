/**
 * Скрипт для скачивания данных с продакшена
 * 
 * Использование:
 * 1. Установите URL вашего продакшена в переменной PRODUCTION_URL
 * 2. Запустите: node scripts/download-production-data.js
 * 3. Файлы будут сохранены в backend/data/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ⚠️ ИЗМЕНИТЕ ЭТО НА URL ВАШЕГО ПРОДАКШЕНА
const PRODUCTION_URL = 'https://eid-praktis-id.onrender.com'; // Замените на ваш URL (без слеша в конце)

const DATA_DIR = path.join(__dirname, '..', 'backend', 'data');

// Создаем директорию, если её нет
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function downloadJSON(endpoint, filename) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${PRODUCTION_URL}${endpoint}`);
    const client = url.protocol === 'https:' ? https : http;
    
    console.log(`Скачиваю ${endpoint}...`);
    
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Ошибка ${res.statusCode} при скачивании ${endpoint}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Валидация JSON
          const json = JSON.parse(data);
          const filePath = path.join(DATA_DIR, filename);
          fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
          console.log(`✓ Сохранено: ${filename}`);
          resolve();
        } catch (error) {
          reject(new Error(`Ошибка парсинга JSON для ${endpoint}: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Ошибка при скачивании ${endpoint}: ${error.message}`));
    });
  });
}

async function main() {
  console.log('Начинаю скачивание данных с продакшена...\n');
  console.log(`URL: ${PRODUCTION_URL}\n`);
  
  try {
    // Скачиваем контейнеры (объекты)
    await downloadJSON('/api/containers', 'objects.json');
    
    // Преобразуем формат для совместимости
    const objectsPath = path.join(DATA_DIR, 'objects.json');
    const containers = JSON.parse(fs.readFileSync(objectsPath, 'utf8'));
    const formattedData = { containers: containers };
    fs.writeFileSync(objectsPath, JSON.stringify(formattedData, null, 2), 'utf8');
    console.log('✓ Формат objects.json обновлен\n');
    
    // Скачиваем задачи
    await downloadJSON('/api/tasks', 'tasks.json');
    
    // Скачиваем снимки
    await downloadJSON('/api/snapshots', 'snapshots.json');
    
    console.log('\n✅ Все данные успешно скачаны!');
    console.log('\nСледующие шаги:');
    console.log('1. Проверьте файлы в backend/data/');
    console.log('2. Добавьте их в git: git add backend/data/*.json');
    console.log('3. Закоммитьте: git commit -m "Backup: Данные с продакшена"');
    console.log('4. Запушьте: git push');
    console.log('5. Теперь можно безопасно деплоить!');
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    console.error('\nУбедитесь, что:');
    console.error('1. PRODUCTION_URL указан правильно');
    console.error('2. Сервис на Render.com запущен и доступен');
    console.error('3. API эндпоинты работают');
    process.exit(1);
  }
}

main();

