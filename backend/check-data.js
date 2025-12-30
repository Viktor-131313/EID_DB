/**
 * Скрипт для проверки данных
 * Запуск: node check-data.js
 */

require('dotenv').config();
const dataAdapter = require('./database/adapter');

async function checkData() {
    console.log('🔍 Проверка данных...\n');
    
    console.log('📊 DATABASE_URL:', process.env.DATABASE_URL ? 'Установлена' : 'НЕ установлена');
    console.log('💾 Используется:', dataAdapter.useDatabase ? 'PostgreSQL база данных' : 'JSON файлы');
    console.log('');
    
    try {
        console.log('📦 Проверка контейнеров...');
        const data = await dataAdapter.readData();
        console.log('Контейнеров найдено:', data.containers ? data.containers.length : 0);
        
        if (data.containers && data.containers.length > 0) {
            data.containers.forEach((container, index) => {
                console.log(`  Контейнер ${index + 1}: "${container.name}" (ID: ${container.id})`);
                console.log(`    Объектов: ${container.objects ? container.objects.length : 0}`);
            });
        } else {
            console.log('  ⚠️ Контейнеры не найдены');
        }
        
        console.log('');
        console.log('📝 Проверка задач...');
        const tasks = await dataAdapter.readTasks();
        console.log('Задач найдено:', tasks ? tasks.length : 0);
        
        if (tasks && tasks.length > 0) {
            tasks.slice(0, 5).forEach((task, index) => {
                console.log(`  Задача ${index + 1}: "${task.description ? task.description.substring(0, 50) : 'Без описания'}" (ID: ${task.id})`);
            });
            if (tasks.length > 5) {
                console.log(`  ... и ещё ${tasks.length - 5} задач`);
            }
        } else {
            console.log('  ⚠️ Задачи не найдены');
        }
        
    } catch (error) {
        console.error('❌ Ошибка при проверке данных:', error);
    }
    
    process.exit(0);
}

checkData();

