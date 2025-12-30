/**
 * Утилиты для расчета метрик исполнительности
 */

/**
 * Расчет метрик исполнительности для объекта
 * @param {Object} obj - Объект с данными об актах
 * @returns {Object} Метрики исполнительности
 */
export const calculatePerformanceMetrics = (obj) => {
  let generated = 0;
  let generatedTotal = 0;
  if (Array.isArray(obj.generatedActs)) {
    generated = obj.generatedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
    generatedTotal = obj.generatedActs.reduce((sum, smr) => sum + (smr.total || 0), 0);
  } else if (typeof obj.generatedActs === 'number') {
    generated = obj.generatedActs;
    generatedTotal = obj.generatedActs;
  }

  // Процент готовности: сколько актов создано от принятых работ
  const readinessPercent = generatedTotal > 0 ? Math.round((generated / generatedTotal) * 100) : 0;
  const lag = generatedTotal - generated; // Отставание

  // Определяем статус на основе процента готовности
  let statusClass = 'status-good';
  let statusText = 'Хорошо';
  let isCritical = false;

  if (generatedTotal > 0) {
    if (readinessPercent < 70) {
      statusClass = 'status-critical';
      statusText = 'Критично';
      isCritical = true;
    } else if (readinessPercent < 85) {
      statusClass = 'status-warning';
      statusText = 'Требует внимания';
    } else {
      statusClass = 'status-good';
      statusText = 'Хорошо';
    }
  } else {
    // Если нет данных из Айконы, используем старую логику на основе согласования
    let sent = 0;
    if (Array.isArray(obj.sentForApproval)) {
      sent = obj.sentForApproval.reduce((sum, smr) => sum + (smr.count || 0), 0);
    } else if (typeof obj.sentForApproval === 'number') {
      sent = obj.sentForApproval;
    }
    
    let approved = 0;
    if (Array.isArray(obj.approvedActs)) {
      approved = obj.approvedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
    } else if (typeof obj.approvedActs === 'number') {
      approved = obj.approvedActs;
    }
    
    const approvedPercent = sent > 0 ? (approved / sent) * 100 : 0;

    if (approvedPercent >= 80) {
      statusClass = 'status-good';
      statusText = 'Хорошо';
    } else if (approvedPercent >= 50) {
      statusClass = 'status-warning';
      statusText = 'В работе';
    } else {
      statusClass = 'status-critical';
      statusText = 'Требует внимания';
      isCritical = true;
    }
  }

  return {
    statusClass,
    statusText,
    isCritical,
    readinessPercent,
    lag,
    generated,
    generatedTotal
  };
};

/**
 * Подсчет критических объектов из всех контейнеров
 * @param {Array} containers - Массив контейнеров с объектами
 * @returns {Object} Статистика по критическим объектам
 */
export const calculateCriticalObjects = (containers) => {
  const criticalObjects = [];
  let totalCritical = 0;
  let totalObjects = 0;

  containers.forEach(container => {
    if (container.objects && Array.isArray(container.objects)) {
      container.objects.forEach(obj => {
        totalObjects++;
        const metrics = calculatePerformanceMetrics(obj);
        if (metrics.isCritical) {
          totalCritical++;
          criticalObjects.push({
            id: obj.id,
            name: obj.name,
            containerName: container.name,
            containerId: container.id,
            readinessPercent: metrics.readinessPercent,
            lag: metrics.lag,
            generated: metrics.generated,
            generatedTotal: metrics.generatedTotal
          });
        }
      });
    }
  });

  return {
    criticalObjects,
    totalCritical,
    totalObjects,
    criticalPercent: totalObjects > 0 ? Math.round((totalCritical / totalObjects) * 100) : 0
  };
};

