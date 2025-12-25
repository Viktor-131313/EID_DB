/**
 * Скрипт для проверки количества актов в объектах
 * Показывает, есть ли реальные данные или все нули
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'backend', 'data');
const objectsPath = path.join(DATA_DIR, 'objects.json');

if (!fs.existsSync(objectsPath)) {
  console.log('❌ Файл objects.json не найден!');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(objectsPath, 'utf8'));

console.log('🔍 Проверка количества актов в объектах...\n');

let totalObjects = 0;
let objectsWithActs = 0;
let totalGeneratedActs = 0;
let totalSentActs = 0;
let totalApprovedActs = 0;
let totalRejectedActs = 0;
let totalSignedActs = 0;

data.containers.forEach(container => {
  console.log(`\n📦 Контейнер: ${container.name}`);
  console.log(`   Объектов: ${container.objects.length}`);
  
  container.objects.forEach(obj => {
    totalObjects++;
    
    const generated = obj.generatedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
    const sent = obj.sentForApproval.reduce((sum, smr) => sum + (smr.count || 0), 0);
    const approved = obj.approvedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
    const rejected = obj.rejectedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
    const signed = obj.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
    
    totalGeneratedActs += generated;
    totalSentActs += sent;
    totalApprovedActs += approved;
    totalRejectedActs += rejected;
    totalSignedActs += signed;
    
    if (generated > 0 || sent > 0 || approved > 0 || rejected > 0 || signed > 0) {
      objectsWithActs++;
      console.log(`   ✅ ${obj.name}:`);
      console.log(`      Сгенерировано: ${generated}`);
      console.log(`      Отправлено: ${sent}`);
      console.log(`      Согласовано: ${approved}`);
      console.log(`      Отклонено: ${rejected}`);
      console.log(`      Подписано: ${signed}`);
    } else {
      console.log(`   ⚠️  ${obj.name}: Все акты = 0`);
    }
  });
});

console.log('\n' + '='.repeat(60));
console.log('📊 ИТОГИ:');
console.log('='.repeat(60));
console.log(`Всего объектов: ${totalObjects}`);
console.log(`Объектов с данными: ${objectsWithActs}`);
console.log(`Объектов без данных: ${totalObjects - objectsWithActs}`);
console.log(`\nВсего актов:`);
console.log(`  Сгенерировано: ${totalGeneratedActs}`);
console.log(`  Отправлено: ${totalSentActs}`);
console.log(`  Согласовано: ${totalApprovedActs}`);
console.log(`  Отклонено: ${totalRejectedActs}`);
console.log(`  Подписано: ${totalSignedActs}`);

if (totalGeneratedActs === 0 && totalSentActs === 0 && totalApprovedActs === 0 && totalRejectedActs === 0 && totalSignedActs === 0) {
  console.log('\n❌ ВНИМАНИЕ: ВСЕ АКТЫ ПУСТЫЕ (все значения = 0)!');
  console.log('Это значит, что либо:');
  console.log('1. Данные были скачаны до того, как вы внесли акты');
  console.log('2. Данные были потеряны при деплое');
  console.log('3. На продакшене тоже пусто');
} else {
  console.log('\n✅ ЕСТЬ ДАННЫЕ С АКТАМИ!');
}

