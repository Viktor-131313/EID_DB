/**
 * Скрипт для проверки данных перед коммитом
 * Используйте перед git commit для проверки, что данные не потеряются
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'backend', 'data');

function checkDataFiles() {
  console.log('🔍 Проверка данных перед коммитом...\n');
  
  const files = ['objects.json', 'tasks.json', 'snapshots.json'];
  let hasIssues = false;
  
  files.forEach(filename => {
    const filePath = path.join(DATA_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ ${filename}: Файл не найден!`);
      hasIssues = true;
      return;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      const size = content.length;
      
      // Проверка на тестовые данные
      let isTestData = false;
      
      if (filename === 'objects.json') {
        if (data.containers) {
          const totalObjects = data.containers.reduce((sum, c) => sum + (c.objects ? c.objects.length : 0), 0);
          // Проверяем на известные тестовые данные
          const hasTestData = data.containers.some(c => 
            c.objects && c.objects.some(o => o.name === 'vbbbn' || o.name === 'сапава')
          );
          
          if (totalObjects <= 1 && hasTestData) {
            isTestData = true;
          }
          
          // Проверяем количество актов
          let totalGeneratedActs = 0;
          let objectsWithActs = 0;
          data.containers.forEach(c => {
            c.objects.forEach(obj => {
              const generated = obj.generatedActs ? obj.generatedActs.reduce((sum, smr) => sum + (smr.count || 0), 0) : 0;
              totalGeneratedActs += generated;
              if (generated > 0) objectsWithActs++;
            });
          });
          
          console.log(`📦 ${filename}:`);
          console.log(`   Контейнеров: ${data.containers.length}`);
          console.log(`   Всего объектов: ${totalObjects}`);
          console.log(`   Размер: ${size} байт`);
          console.log(`   Всего сгенерированных актов: ${totalGeneratedActs}`);
          console.log(`   Объектов с актами: ${objectsWithActs}`);
          
          if (totalGeneratedActs === 0 && totalObjects > 0) {
            console.log(`   ❌ КРИТИЧНО: ВСЕ АКТЫ ПУСТЫЕ (все значения = 0)!`);
            console.log(`   Если вы внесли акты на продакшене, они НЕ были скачаны.`);
            console.log(`   НЕ коммитьте эти данные - сначала внесите акты и скачайте заново!`);
            hasIssues = true;
          }
          
          if (isTestData && totalObjects === 1) {
            console.log(`   ⚠️  ВНИМАНИЕ: Возможно, это тестовые данные!`);
            console.log(`   Проверьте, что это реальные данные с продакшена перед коммитом.`);
          }
        }
      } else if (filename === 'tasks.json') {
        if (Array.isArray(data)) {
          console.log(`📋 ${filename}:`);
          console.log(`   Задач: ${data.length}`);
          console.log(`   Размер: ${size} байт`);
          
          // Проверяем на тестовые данные
          const testTaskNumbers = [2862, 11, 12, 123];
          const hasOnlyTestData = data.length <= 4 && 
            data.every(t => testTaskNumbers.includes(t.taskNumber));
          
          if (hasOnlyTestData && data.length === 4) {
            console.log(`   ⚠️  ВНИМАНИЕ: Возможно, это только тестовые данные!`);
            console.log(`   Проверьте, что это реальные данные с продакшена перед коммитом.`);
          }
        }
      } else if (filename === 'snapshots.json') {
        if (Array.isArray(data)) {
          console.log(`📸 ${filename}:`);
          console.log(`   Снимков: ${data.length}`);
          console.log(`   Размер: ${size} байт`);
        }
      }
      
      if (size < 100) {
        console.log(`   ⚠️  ВНИМАНИЕ: Файл очень маленький (${size} байт), возможно, он пустой!`);
        hasIssues = true;
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ ${filename}: Ошибка чтения - ${error.message}`);
      hasIssues = true;
    }
  });
  
  console.log('='.repeat(60));
  
  if (hasIssues) {
    console.log('\n⚠️  ВНИМАНИЕ: Обнаружены проблемы!');
    console.log('Не коммитьте данные, пока не убедитесь, что они правильные.');
    console.log('\nРекомендации:');
    console.log('1. Если данные реальные - все ОК, можно коммитить');
    console.log('2. Если данные тестовые - скачайте реальные данные:');
    console.log('   node scripts/download-production-data.js');
    process.exit(1);
  } else {
    console.log('\n✅ Данные выглядят нормально. Можно коммитить.');
    console.log('Но все равно убедитесь, что это реальные данные с продакшена!');
  }
}

checkDataFiles();

