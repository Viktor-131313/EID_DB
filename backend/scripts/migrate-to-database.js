/**
 * Скрипт для миграции данных из JSON файлов в PostgreSQL
 * 
 * Использование:
 * 1. Убедитесь, что DATABASE_URL установлена в переменных окружения
 * 2. Запустите: node scripts/migrate-to-database.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../database/database');

const DATA_FILE = path.join(__dirname, '..', 'data', 'objects.json');
const TASKS_FILE = path.join(__dirname, '..', 'data', 'tasks.json');
const SNAPSHOTS_FILE = path.join(__dirname, '..', 'data', 'snapshots.json');

async function migrate() {
    console.log('🚀 Начало миграции данных из JSON в PostgreSQL...\n');
    
    try {
        // Инициализируем базу данных (создаем таблицы)
        console.log('📋 Инициализация базы данных...');
        await db.initializeDatabase();
        console.log('✅ База данных инициализирована\n');
        
        // Мигрируем контейнеры и объекты
        if (fs.existsSync(DATA_FILE)) {
            console.log('📦 Миграция контейнеров и объектов...');
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            await db.saveContainers(data);
            console.log('✅ Контейнеры и объекты мигрированы\n');
        } else {
            console.log('⚠️  Файл objects.json не найден, пропускаем\n');
        }
        
        // Мигрируем задачи
        if (fs.existsSync(TASKS_FILE)) {
            console.log('📝 Миграция задач...');
            const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
            await db.saveTasks(tasks);
            console.log('✅ Задачи мигрированы\n');
        } else {
            console.log('⚠️  Файл tasks.json не найден, пропускаем\n');
        }
        
        // Мигрируем снимки
        if (fs.existsSync(SNAPSHOTS_FILE)) {
            console.log('📸 Миграция снимков...');
            const snapshots = JSON.parse(fs.readFileSync(SNAPSHOTS_FILE, 'utf8'));
            
            for (const snapshot of snapshots) {
                await db.saveSnapshot(snapshot);
            }
            console.log(`✅ Мигрировано ${snapshots.length} снимков\n`);
        } else {
            console.log('⚠️  Файл snapshots.json не найден, пропускаем\n');
        }
        
        console.log('✅ Миграция завершена успешно!');
        console.log('\n📋 Следующие шаги:');
        console.log('1. Обновите server.js для использования базы данных');
        console.log('2. Протестируйте приложение локально');
        console.log('3. Задеплойте на Render.com с переменной DATABASE_URL');
        
    } catch (error) {
        console.error('❌ Ошибка при миграции:', error);
        process.exit(1);
    } finally {
        await db.pool.end();
    }
}

// Проверяем наличие DATABASE_URL
if (!process.env.DATABASE_URL) {
    console.error('❌ Ошибка: DATABASE_URL не установлена в переменных окружения!');
    console.error('\nДля локального запуска создайте файл .env в папке backend/:');
    console.error('DATABASE_URL=postgres://user:password@localhost:5432/dbname');
    console.error('\nИли установите переменную:');
    console.error('export DATABASE_URL=postgres://...');
    process.exit(1);
}

migrate();
