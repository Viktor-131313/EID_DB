/**
 * Скрипт для миграции локальных данных в PostgreSQL базу данных
 * 
 * Использование: просто запустите: node scripts/migrate-local-data.js
 */

// DATABASE_URL для миграции (External Database URL с Render.com)
// ВАЖНО: Используйте External Database URL (с полным доменом), а не Internal!
// 
// Как получить правильный URL:
// 1. Зайдите в настройки вашей PostgreSQL базы на Render.com
// 2. Откройте раздел "Connections"
// 3. Нажмите на иконку глаза рядом с "External Database URL"
// 4. Скопируйте ПОЛНЫЙ URL (он должен быть вида: postgresql://user:pass@host.frankfurt-postgres.render.com:5432/db)
// 5. Вставьте его сюда вместо строки ниже:
// External Database URL для миграции с локального компьютера
// ВАЖНО: В Web Service на Render.com должен быть Internal Database URL, а не этот!
const DATABASE_URL = 'postgresql://eid_dashboard_db_user:1rBYnZZuC57FJdwJS58z7kiEwdju5JVu@dpg-d57611n5r7bs73fv6ol0-a.frankfurt-postgres.render.com:5432/eid_dashboard_db';

// Устанавливаем DATABASE_URL в переменные окружения
process.env.DATABASE_URL = DATABASE_URL;

// Загружаем остальные модули
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
            console.log(`   Найдено контейнеров: ${data.containers?.length || 0}`);
            const totalObjects = data.containers?.reduce((sum, c) => sum + (c.objects?.length || 0), 0) || 0;
            console.log(`   Найдено объектов: ${totalObjects}`);
            await db.saveContainers(data);
            console.log('✅ Контейнеры и объекты мигрированы\n');
        } else {
            console.log('⚠️  Файл objects.json не найден, пропускаем\n');
        }
        
        // Мигрируем задачи
        if (fs.existsSync(TASKS_FILE)) {
            console.log('📝 Миграция задач...');
            const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
            console.log(`   Найдено задач: ${tasks.length || 0}`);
            await db.saveTasks(tasks);
            console.log('✅ Задачи мигрированы\n');
        } else {
            console.log('⚠️  Файл tasks.json не найден, пропускаем\n');
        }
        
        // Мигрируем снимки
        if (fs.existsSync(SNAPSHOTS_FILE)) {
            console.log('📸 Миграция снимков...');
            const snapshots = JSON.parse(fs.readFileSync(SNAPSHOTS_FILE, 'utf8'));
            console.log(`   Найдено снимков: ${snapshots.length || 0}`);
            
            for (const snapshot of snapshots) {
                await db.saveSnapshot(snapshot);
            }
            console.log(`✅ Мигрировано ${snapshots.length} снимков\n`);
        } else {
            console.log('⚠️  Файл snapshots.json не найден, пропускаем\n');
        }
        
        console.log('✅ Миграция завершена успешно!');
        console.log('\n📋 Следующие шаги:');
        console.log('1. Обновите страницу на продакшене: https://eid-praktis-id.onrender.com');
        console.log('2. Проверьте, что все данные отображаются корректно');
        
    } catch (error) {
        console.error('❌ Ошибка при миграции:', error);
        console.error('\nДетали ошибки:');
        if (error.message) {
            console.error('Сообщение:', error.message);
        }
        if (error.stack) {
            console.error('Стек:', error.stack);
        }
        process.exit(1);
    } finally {
        if (db.pool) {
            await db.pool.end();
        }
    }
}

migrate();

