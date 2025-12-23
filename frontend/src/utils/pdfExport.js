import html2pdf from 'html2pdf.js';

export const exportDashboardToPDF = async (dashboardElement, statisticsData = null, meetingsCount = 1) => {
  try {
    const opt = {
      margin: 0.3,
      filename: `praktis-id-dashboard-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 1.5,
        useCORS: true,
        logging: false,
        letterRendering: true,
        windowWidth: 1400
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a3', 
        orientation: 'landscape' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Клонируем элемент для экспорта, чтобы не нарушать текущую страницу
    const clone = dashboardElement.cloneNode(true);
    clone.style.width = '1400px';
    clone.style.overflow = 'visible';
    clone.style.backgroundColor = '#fff';
    
    // Скрываем элементы, которые не нужны в PDF
    const elementsToHide = clone.querySelectorAll('button, .modal, .close-modal, .btn-add-task, .btn-expand-statistics, .btn-collapse-statistics, .development-tasks-section');
    elementsToHide.forEach(el => {
      el.style.display = 'none';
    });

    // Показываем все секции статистики
    const collapsedSections = clone.querySelectorAll('.statistics-widget-collapsed');
    collapsedSections.forEach(el => {
      el.style.display = 'none';
    });

    // Убеждаемся что статистика развернута в PDF
    const statisticsWidgets = clone.querySelectorAll('.statistics-widget');
    statisticsWidgets.forEach(widget => {
      widget.style.display = 'block';
    });

    // Создаем контейнер для PDF
    const pdfContainer = document.createElement('div');
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.width = '1400px'; // A3 landscape width in pixels (approx)
    pdfContainer.appendChild(clone);
    document.body.appendChild(pdfContainer);

    try {
      // Экспортируем первую страницу (дашборд)
      await html2pdf().set(opt).from(clone).save();
      
      // Если есть данные статистики, создаем вторую страницу
      if (statisticsData && statisticsData.comparison) {
        await exportStatisticsPage(statisticsData, meetingsCount, opt);
      }
    } finally {
      // Удаляем временный элемент
      document.body.removeChild(pdfContainer);
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Ошибка при экспорте в PDF: ' + error.message);
  }
};

const exportStatisticsPage = async (statisticsData, meetingsCount, baseOpt) => {
  try {
    // Создаем контейнер для страницы статистики
    const statsContainer = document.createElement('div');
    statsContainer.style.width = '1400px';
    statsContainer.style.padding = '40px';
    statsContainer.style.backgroundColor = '#fff';
    statsContainer.style.fontFamily = 'Arial, sans-serif';

    // Заголовок
    const title = document.createElement('h1');
    title.textContent = 'Статистика планерок';
    title.style.fontSize = '28px';
    title.style.marginBottom = '30px';
    title.style.color = '#2c3e50';
    statsContainer.appendChild(title);

    // Информация о сравнении
    const info = document.createElement('div');
    info.style.marginBottom = '30px';
    info.style.fontSize = '14px';
    info.style.color = '#666';
    const oldDate = new Date(statisticsData.oldSnapshotDate || statisticsData.snapshotDate || statisticsData.latestSnapshotDate).toLocaleString('ru-RU');
    const newDate = new Date(statisticsData.newSnapshotDate || statisticsData.currentSnapshotDate).toLocaleString('ru-RU');
    info.innerHTML = `
      <p><strong>Период сравнения:</strong> ${oldDate} → ${newDate}</p>
      <p><strong>Количество планерок:</strong> ${meetingsCount}</p>
    `;
    statsContainer.appendChild(info);

    // График (упрощенный для PDF)
    const chartDiv = createPDFChart(statisticsData.comparison);
    statsContainer.appendChild(chartDiv);

    // Таблица изменений
    const tableDiv = createPDFChangesTable(statisticsData.comparison.changes);
    statsContainer.appendChild(tableDiv);

    // Добавляем в DOM временно
    statsContainer.style.position = 'absolute';
    statsContainer.style.left = '-9999px';
    document.body.appendChild(statsContainer);

    try {
      const statsOpt = {
        ...baseOpt,
        filename: `praktis-id-statistics-${new Date().toISOString().split('T')[0]}.pdf`
      };
      await html2pdf().set(statsOpt).from(statsContainer).save();
    } finally {
      document.body.removeChild(statsContainer);
    }
  } catch (error) {
    console.error('Error exporting statistics page:', error);
  }
};

const createPDFChart = (comparison) => {
  const chartDiv = document.createElement('div');
  chartDiv.style.marginBottom = '40px';
  
  const { summary } = comparison;
  
  // Заголовок графика
  const chartTitle = document.createElement('h2');
  chartTitle.textContent = 'Сравнительный график';
  chartTitle.style.fontSize = '22px';
  chartTitle.style.marginBottom = '20px';
  chartTitle.style.color = '#2c3e50';
  chartDiv.appendChild(chartTitle);

  // Простой HTML/CSS график для PDF
  const metrics = [
    { key: 'approved', label: 'Согласованные', color: '#27ae60', old: summary.approvedActs.old, new: summary.approvedActs.new, delta: summary.approvedActs.delta },
    { key: 'rejected', label: 'Отклоненные', color: '#e74c3c', old: summary.rejectedActs.old, new: summary.rejectedActs.new, delta: summary.rejectedActs.delta },
    { key: 'signed', label: 'Подписанные', color: '#3498db', old: summary.signedActs.old, new: summary.signedActs.new, delta: summary.signedActs.delta },
  ];

  const maxValue = Math.max(...metrics.flatMap(m => [m.old, m.new]), 1);

  metrics.forEach(metric => {
    const metricDiv = document.createElement('div');
    metricDiv.style.marginBottom = '20px';

    const label = document.createElement('div');
    label.textContent = `${metric.label}:`;
    label.style.fontWeight = 'bold';
    label.style.marginBottom = '5px';
    metricDiv.appendChild(label);

    const barsContainer = document.createElement('div');
    barsContainer.style.display = 'flex';
    barsContainer.style.gap = '20px';
    barsContainer.style.alignItems = 'center';

    // Старое значение
    const oldBar = document.createElement('div');
    oldBar.style.width = `${(metric.old / maxValue) * 400}px`;
    oldBar.style.height = '30px';
    oldBar.style.backgroundColor = metric.color;
    oldBar.style.borderRadius = '4px';
    oldBar.style.display = 'flex';
    oldBar.style.alignItems = 'center';
    oldBar.style.justifyContent = 'center';
    oldBar.style.color = 'white';
    oldBar.style.fontWeight = 'bold';
    oldBar.textContent = metric.old;
    barsContainer.appendChild(oldBar);

    // Стрелка
    const arrow = document.createElement('span');
    arrow.textContent = '→';
    arrow.style.fontSize = '20px';
    barsContainer.appendChild(arrow);

    // Новое значение
    const newBar = document.createElement('div');
    newBar.style.width = `${(metric.new / maxValue) * 400}px`;
    newBar.style.height = '30px';
    newBar.style.backgroundColor = metric.color;
    newBar.style.borderRadius = '4px';
    newBar.style.display = 'flex';
    newBar.style.alignItems = 'center';
    newBar.style.justifyContent = 'center';
    newBar.style.color = 'white';
    newBar.style.fontWeight = 'bold';
    const deltaText = metric.delta !== 0 ? ` (${metric.delta > 0 ? '+' : ''}${metric.delta})` : '';
    newBar.textContent = `${metric.new}${deltaText}`;
    barsContainer.appendChild(newBar);

    metricDiv.appendChild(barsContainer);
    chartDiv.appendChild(metricDiv);
  });

  return chartDiv;
};

const createPDFChangesTable = (changes) => {
  const tableDiv = document.createElement('div');
  
  const tableTitle = document.createElement('h2');
  tableTitle.textContent = 'Детальные изменения';
  tableTitle.style.fontSize = '22px';
  tableTitle.style.marginBottom = '20px';
  tableTitle.style.color = '#2c3e50';
  tableDiv.appendChild(tableTitle);

  if (!changes || changes.length === 0) {
    const noData = document.createElement('p');
    noData.textContent = 'Нет изменений для отображения';
    noData.style.color = '#666';
    tableDiv.appendChild(noData);
    return tableDiv;
  }

  // Группируем по контейнерам
  const groupedByContainer = changes.reduce((acc, change) => {
    if (!acc[change.containerId]) {
      acc[change.containerId] = {
        containerName: change.containerName,
        changes: []
      };
    }
    acc[change.containerId].changes.push(change);
    return acc;
  }, {});

  Object.values(groupedByContainer).forEach(group => {
    const containerTitle = document.createElement('h3');
    containerTitle.textContent = group.containerName;
    containerTitle.style.fontSize = '18px';
    containerTitle.style.marginTop = '20px';
    containerTitle.style.marginBottom = '10px';
    containerTitle.style.color = '#2c5aa0';
    tableDiv.appendChild(containerTitle);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginBottom = '30px';
    table.style.fontSize = '12px';

    // Заголовок таблицы
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#2c5aa0';
    headerRow.style.color = 'white';
    ['Объект', 'СМР', 'Согласовано', 'Отклонено', 'Подписано', 'Отправлено', 'Сгенерировано'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      th.style.padding = '10px';
      th.style.textAlign = 'left';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Тело таблицы
    const tbody = document.createElement('tbody');
    group.changes.forEach((change, index) => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #ddd';
      if (index % 2 === 0) {
        row.style.backgroundColor = '#f8f9fa';
      }

      const cells = [
        change.objectName,
        change.smrName,
        formatDelta(change.deltas.approvedActs),
        formatDelta(change.deltas.rejectedActs),
        formatDelta(change.deltas.signedActs),
        formatDelta(change.deltas.sentForApproval),
        formatDelta(change.deltas.generatedActs)
      ];

      cells.forEach((text, i) => {
        const td = document.createElement('td');
        td.textContent = text;
        td.style.padding = '8px';
        if (i > 1 && text.startsWith('+')) {
          td.style.color = '#27ae60';
          td.style.fontWeight = 'bold';
        } else if (i > 1 && text.startsWith('-')) {
          td.style.color = '#e74c3c';
          td.style.fontWeight = 'bold';
        }
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableDiv.appendChild(table);
  });

  return tableDiv;
};

const formatDelta = (value) => {
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : `${value}`;
};

