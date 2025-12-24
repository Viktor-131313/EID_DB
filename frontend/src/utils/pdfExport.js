import html2pdf from 'html2pdf.js';

export const exportDashboardToPDF = async (
  dashboardElement, 
  statisticsData = null, 
  containers = [],
  globalStats = null,
  tasks = []
) => {
  try {
    const opt = {
      margin: 0.3,
      filename: `praktis-id-dashboard-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: true, // Включаем логирование для отладки
        letterRendering: true,
        windowWidth: 1400,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
        removeContainer: false,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a3', 
        orientation: 'landscape' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Создаём контейнер для всех страниц
    // html2canvas требует, чтобы элементы были видимыми, но мы можем разместить их вне экрана
    const allPagesContainer = document.createElement('div');
    allPagesContainer.style.width = '1400px';
    allPagesContainer.style.backgroundColor = '#fff';
    allPagesContainer.style.position = 'absolute';
    allPagesContainer.style.top = '0';
    allPagesContainer.style.left = '0';
    allPagesContainer.style.zIndex = '-1';
    allPagesContainer.style.opacity = '0';
    allPagesContainer.style.pointerEvents = 'none';
    allPagesContainer.style.overflow = 'visible';
    document.body.appendChild(allPagesContainer);

    try {
      console.log('Starting PDF export...', { containers: containers?.length, tasks: tasks?.length, globalStats, statisticsData });
      
      // 1. Титульный лист
      const titlePage = await createTitlePage();
      allPagesContainer.appendChild(titlePage);
      console.log('Title page created', {
        hasContent: titlePage.children.length > 0,
        innerHTML: titlePage.innerHTML.substring(0, 200)
      });

      // 2. Второй лист: заголовок, статистика, статистика планерок
      const secondPage = await createSecondPage(globalStats, statisticsData);
      // Добавляем разрыв страницы перед вторым листом
      secondPage.style.pageBreakBefore = 'always';
      allPagesContainer.appendChild(secondPage);
      console.log('Second page created', {
        hasContent: secondPage.children.length > 0,
        innerHTML: secondPage.innerHTML.substring(0, 200)
      });

      // 3. Лист с объектами (контейнеры) - с НОВОГО ЛИСТА
      if (containers && containers.length > 0) {
        const objectsPage = await createObjectsPage(containers);
        if (objectsPage) {
          objectsPage.style.pageBreakBefore = 'always';
          allPagesContainer.appendChild(objectsPage);
          console.log('Objects page created');
        } else {
          console.warn('Objects page is null');
        }
      } else {
        console.warn('No containers to export');
      }

      // 4. Лист с задачами для разработки - с НОВОГО ЛИСТА
      if (tasks && tasks.length > 0) {
        const tasksPage = createTasksPage(tasks);
        tasksPage.style.pageBreakBefore = 'always';
        allPagesContainer.appendChild(tasksPage);
        console.log('Tasks page created');
      } else {
        console.warn('No tasks to export');
      }

      console.log('All pages added to container, waiting for render...');

      // Ждем небольшое время для рендеринга всех элементов
      await new Promise(resolve => setTimeout(resolve, 500));

      // Ждем загрузки всех изображений
      const images = allPagesContainer.querySelectorAll('img');
      console.log(`Waiting for ${images.length} images to load...`);
      const imagePromises = Array.from(images).map(img => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // Продолжаем даже если изображение не загрузилось
          setTimeout(resolve, 3000); // Таймаут 3 секунды
        });
      });
      await Promise.all(imagePromises);

      // Еще небольшая задержка для стабилизации
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('Starting html2pdf export...');
      console.log('Container children count:', allPagesContainer.children.length);
      console.log('Container dimensions:', {
        width: allPagesContainer.offsetWidth,
        height: allPagesContainer.offsetHeight,
        scrollHeight: allPagesContainer.scrollHeight
      });
      
      // Проверяем, что контейнер не пустой
      if (allPagesContainer.children.length === 0) {
        throw new Error('Контейнер для PDF пуст. Нет данных для экспорта.');
      }
      
      // Проверяем содержимое каждой страницы
      Array.from(allPagesContainer.children).forEach((page, index) => {
        console.log(`Page ${index + 1}:`, {
          children: page.children.length,
          textContent: page.textContent?.substring(0, 100),
          offsetHeight: page.offsetHeight,
          scrollHeight: page.scrollHeight
        });
      });
      
      // Временно делаем контейнер видимым для html2canvas
      allPagesContainer.style.opacity = '1';
      allPagesContainer.style.position = 'fixed';
      allPagesContainer.style.top = '0';
      allPagesContainer.style.left = '0';
      allPagesContainer.style.width = '1400px';
      allPagesContainer.style.height = 'auto';
      allPagesContainer.style.zIndex = '999999';
      
      // Дополнительная задержка для рендеринга
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        // Экспортируем каждую страницу отдельно и объединяем в один PDF используя jsPDF
        const pages = Array.from(allPagesContainer.children);
        console.log(`Exporting ${pages.length} pages and combining...`);
        
        // Импортируем jsPDF и html2canvas
        const { jsPDF } = await import('jspdf');
        const html2canvasModule = await import('html2canvas');
        const html2canvas = html2canvasModule.default;
        
        // Создаем новый PDF документ
        const pdf = new jsPDF({
          unit: 'in',
          format: 'a3',
          orientation: 'landscape'
        });
        
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          console.log(`Processing page ${i + 1}/${pages.length}...`);
          
          // Делаем только текущую страницу видимой
          pages.forEach((p, idx) => {
            p.style.display = idx === i ? 'block' : 'none';
          });
          
          // Ждем рендеринга
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            // Конвертируем страницу в canvas используя html2canvas
            const canvas = await html2canvas(page, {
              scale: 2,
              useCORS: true,
              logging: false,
              letterRendering: true,
              windowWidth: 1400,
              allowTaint: true,
              backgroundColor: '#ffffff',
              imageTimeout: 15000
            });
            
            console.log(`Canvas created for page ${i + 1}:`, {
              width: canvas.width,
              height: canvas.height
            });
            
            // Добавляем страницу в PDF
            if (i > 0) {
              pdf.addPage();
            }
            
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            // Масштабируем изображение под размер страницы A3 landscape
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;
            
            // Если высота больше высоты страницы, масштабируем
            const finalHeight = imgHeight > pdfHeight ? pdfHeight : imgHeight;
            const finalWidth = (canvas.width * finalHeight) / canvas.height;
            
            pdf.addImage(imgData, 'JPEG', 0, 0, finalWidth, finalHeight);
            console.log(`Page ${i + 1} added to PDF`);
          } catch (pageError) {
            console.error(`Error processing page ${i + 1}:`, pageError);
            throw pageError;
          }
        }
        
        // Показываем все страницы обратно
        pages.forEach(p => p.style.display = 'block');
        
        // Сохраняем объединенный PDF
        pdf.save(opt.filename);
        console.log('PDF export completed');
      } finally {
        // Возвращаем обратно скрытие
        allPagesContainer.style.opacity = '0';
        allPagesContainer.style.position = 'absolute';
        allPagesContainer.style.left = '-9999px';
        allPagesContainer.style.zIndex = '-1';
      }
    } finally {
      // Удаляем контейнер после экспорта
      if (document.body.contains(allPagesContainer)) {
        document.body.removeChild(allPagesContainer);
      }
    }

  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Ошибка при экспорте в PDF: ' + error.message);
  }
};

// Создание титульного листа
const createTitlePage = () => {
  return new Promise((resolve) => {
    const page = document.createElement('div');
    page.style.width = '1400px';
    page.style.height = '990px'; // A3 landscape
    page.style.position = 'relative';
    page.style.backgroundColor = '#fff';
    page.style.minHeight = '990px';

    // Фоновое изображение
    const bgImg = document.createElement('img');
    bgImg.src = '/PDF_first_list.png';
    bgImg.style.width = '100%';
    bgImg.style.height = '100%';
    bgImg.style.objectFit = 'cover';
    bgImg.style.position = 'absolute';
    bgImg.style.top = '0';
    bgImg.style.left = '0';
    
    const addDateToPage = () => {
      // Дата справа внизу
      const dateDiv = document.createElement('div');
      const today = new Date().toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      dateDiv.textContent = today;
      dateDiv.style.position = 'absolute';
      dateDiv.style.right = '50px';
      dateDiv.style.bottom = '50px';
      dateDiv.style.fontSize = '18px';
      dateDiv.style.fontWeight = '600';
      dateDiv.style.color = '#2c3e50';
      dateDiv.style.fontFamily = 'Arial, sans-serif';
      dateDiv.style.zIndex = '10';
      page.appendChild(dateDiv);
    };

    bgImg.onload = () => {
      addDateToPage();
      resolve(page);
    };
    
    bgImg.onerror = () => {
      console.warn('PDF_first_list.png not found, using placeholder');
      // Даже если изображение не загрузилось, продолжаем с датой
      addDateToPage();
      resolve(page);
    };
    
    page.appendChild(bgImg);
    
    // Если изображение уже загружено
    if (bgImg.complete && bgImg.naturalHeight !== 0) {
      addDateToPage();
      resolve(page);
    }
  });
};

// Создание второго листа: заголовок, статистика, статистика планерок
const createSecondPage = async (globalStats, statisticsData) => {
  const page = document.createElement('div');
  page.style.width = '1400px';
  page.style.padding = '40px';
  page.style.backgroundColor = '#fff';
  page.style.fontFamily = 'Arial, sans-serif';
  page.style.minHeight = '990px'; // A3 landscape height

  // Заголовок
  const title = document.createElement('h1');
  title.textContent = 'Praktis ID';
  title.style.fontSize = '32px';
  title.style.fontWeight = '700';
  title.style.color = '#2c5aa0';
  title.style.marginBottom = '30px';
  page.appendChild(title);

  // Статистика (SummaryCards)
  if (globalStats) {
    const statsSection = createPDFSummaryCards(globalStats);
    page.appendChild(statsSection);
  }

  // Статистика планерок (без сохраненных снимков)
  if (statisticsData && statisticsData.comparison) {
    const statsWidget = createPDFStatisticsWidget(statisticsData);
    page.appendChild(statsWidget);
  }

  return page;
};

// Создание Summary Cards для PDF
const createPDFSummaryCards = (stats) => {
  const section = document.createElement('div');
  section.style.marginBottom = '40px';

  const cardsContainer = document.createElement('div');
  cardsContainer.style.display = 'grid';
  cardsContainer.style.gridTemplateColumns = 'repeat(5, 1fr)';
  cardsContainer.style.gap = '20px';

  const cards = [
    { title: 'Всего объектов', value: stats.totalObjects, icon: '🏢', type: 'total' },
    { title: 'Сгенерировано', value: stats.generatedActs, icon: '📄', type: 'inwork' },
    { title: 'Отклонено', value: stats.rejectedActs, subtitle: `${stats.rejectedPercent || 0}% от отправленных`, icon: '❌', type: 'overdue' },
    { title: 'Согласовано', value: `${stats.approvedActs}/${stats.sentActs}`, subtitle: `${stats.approvedPercent || 0}% от отправленных`, icon: '✅', type: 'approved' },
    { title: 'Подписано', value: `${stats.signedActs || 0}/${stats.approvedActs || 0}`, subtitle: `${stats.signedPercent || 0}% от согласованных`, icon: '✍️', type: 'signed' }
  ];

  cards.forEach(card => {
    const cardDiv = document.createElement('div');
    cardDiv.style.backgroundColor = '#fff';
    cardDiv.style.borderRadius = '12px';
    cardDiv.style.padding = '20px';
    cardDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    cardDiv.style.borderLeft = '5px solid';
    
    const borderColors = {
      total: '#3498db',
      inwork: '#f39c12',
      overdue: '#e74c3c',
      approved: '#27ae60',
      signed: '#3498db'
    };
    cardDiv.style.borderLeftColor = borderColors[card.type] || '#ddd';

    const title = document.createElement('div');
    title.textContent = card.title;
    title.style.fontSize = '14px';
    title.style.color = '#7f8c8d';
    title.style.marginBottom = '10px';
    cardDiv.appendChild(title);

    const value = document.createElement('div');
    value.textContent = card.value;
    value.style.fontSize = '32px';
    value.style.fontWeight = '700';
    value.style.color = '#2c3e50';
    value.style.marginBottom = '5px';
    cardDiv.appendChild(value);

    if (card.subtitle) {
      const subtitle = document.createElement('div');
      subtitle.textContent = card.subtitle;
      subtitle.style.fontSize = '12px';
      subtitle.style.color = '#95a5a6';
      cardDiv.appendChild(subtitle);
    }

    cardsContainer.appendChild(cardDiv);
  });

  section.appendChild(cardsContainer);
  return section;
};

// Создание виджета статистики планерок для PDF (без сохраненных снимков)
const createPDFStatisticsWidget = (statisticsData) => {
  const widget = document.createElement('div');
  widget.style.marginTop = '40px';
  widget.style.paddingTop = '30px';
  widget.style.borderTop = '2px solid #e1e5eb';

  // Заголовок
  const title = document.createElement('h2');
  title.textContent = 'Статистика планерок';
  title.style.fontSize = '24px';
  title.style.color = '#2c3e50';
  title.style.marginBottom = '20px';
  widget.appendChild(title);

  // Информация о сравнении
  if (statisticsData.comparison) {
    const info = document.createElement('div');
    info.style.marginBottom = '30px';
    info.style.fontSize = '14px';
    info.style.color = '#666';
    
    const oldDate = new Date(
      statisticsData.oldSnapshotDate || 
      statisticsData.snapshotDate || 
      statisticsData.latestSnapshotDate
    ).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const newDate = new Date(
      statisticsData.newSnapshotDate || 
      statisticsData.currentSnapshotDate
    ).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    info.innerHTML = `<strong>Сравнение с планеркой:</strong> ${oldDate} → ${newDate}`;
    widget.appendChild(info);

    // График
    const chartDiv = createPDFChart(statisticsData.comparison);
    widget.appendChild(chartDiv);

    // Легенда с чекбоксами (визуально как чекбоксы, но неинтерактивные)
    const legend = createPDFLegend(statisticsData.comparison);
    widget.appendChild(legend);

    // Таблица изменений
    const tableDiv = createPDFChangesTable(statisticsData.comparison.changes);
    widget.appendChild(tableDiv);
  }

  return widget;
};

// Создание графика для PDF
const createPDFChart = (comparison) => {
  const chartDiv = document.createElement('div');
  chartDiv.style.marginBottom = '30px';
  
  const { summary } = comparison;
  
  const metrics = [
    { key: 'approvedActs', label: 'Согласованные акты', color: '#27ae60', old: summary.approvedActs.old, new: summary.approvedActs.new, delta: summary.approvedActs.delta },
    { key: 'rejectedActs', label: 'Отклоненные акты', color: '#e74c3c', old: summary.rejectedActs.old, new: summary.rejectedActs.new, delta: summary.rejectedActs.delta },
    { key: 'signedActs', label: 'Подписанные акты', color: '#3498db', old: summary.signedActs.old, new: summary.signedActs.new, delta: summary.signedActs.delta },
    { key: 'sentForApproval', label: 'Отправленные на согласование', color: '#f39c12', old: summary.sentForApproval.old, new: summary.sentForApproval.new, delta: summary.sentForApproval.delta },
    { key: 'generatedActs', label: 'Сгенерированные акты', color: '#9b59b6', old: summary.generatedActs.old, new: summary.generatedActs.new, delta: summary.generatedActs.delta }
  ];

  const maxValue = Math.max(...metrics.flatMap(m => [m.old, m.new]), 1);

  metrics.forEach(metric => {
    const metricDiv = document.createElement('div');
    metricDiv.style.marginBottom = '20px';

    const label = document.createElement('div');
    label.textContent = `${metric.label}:`;
    label.style.fontWeight = '600';
    label.style.fontSize = '14px';
    label.style.marginBottom = '8px';
    label.style.color = '#2c3e50';
    metricDiv.appendChild(label);

    const barsContainer = document.createElement('div');
    barsContainer.style.display = 'flex';
    barsContainer.style.alignItems = 'center';
    barsContainer.style.gap = '15px';

    // Старое значение
    const oldBar = document.createElement('div');
    const oldWidth = Math.max((metric.old / maxValue) * 400, 50);
    oldBar.style.width = `${oldWidth}px`;
    oldBar.style.height = '30px';
    oldBar.style.backgroundColor = metric.color;
    oldBar.style.borderRadius = '4px';
    oldBar.style.display = 'flex';
    oldBar.style.alignItems = 'center';
    oldBar.style.justifyContent = 'center';
    oldBar.style.color = 'white';
    oldBar.style.fontWeight = 'bold';
    oldBar.style.fontSize = '14px';
    oldBar.textContent = metric.old;
    barsContainer.appendChild(oldBar);

    // Стрелка
    const arrow = document.createElement('span');
    arrow.textContent = '→';
    arrow.style.fontSize = '20px';
    arrow.style.color = '#7f8c8d';
    barsContainer.appendChild(arrow);

    // Новое значение
    const newBar = document.createElement('div');
    const newWidth = Math.max((metric.new / maxValue) * 400, 50);
    newBar.style.width = `${newWidth}px`;
    newBar.style.height = '30px';
    newBar.style.backgroundColor = metric.color;
    newBar.style.borderRadius = '4px';
    newBar.style.display = 'flex';
    newBar.style.alignItems = 'center';
    newBar.style.justifyContent = 'center';
    newBar.style.color = 'white';
    newBar.style.fontWeight = 'bold';
    newBar.style.fontSize = '14px';
    const deltaText = metric.delta !== 0 ? ` (${metric.delta > 0 ? '+' : ''}${metric.delta})` : '';
    newBar.textContent = `${metric.new}${deltaText}`;
    barsContainer.appendChild(newBar);

    metricDiv.appendChild(barsContainer);
    chartDiv.appendChild(metricDiv);
  });

  return chartDiv;
};

// Создание легенды с чекбоксами (визуально)
const createPDFLegend = (comparison) => {
  const legend = document.createElement('div');
  legend.style.marginBottom = '30px';
  legend.style.padding = '15px';
  legend.style.backgroundColor = '#f8f9fa';
  legend.style.borderRadius = '8px';

  const title = document.createElement('div');
  title.textContent = 'Отображаемые метрики:';
  title.style.fontWeight = '600';
  title.style.marginBottom = '10px';
  title.style.color = '#2c3e50';
  legend.appendChild(title);

  const metrics = [
    { label: 'Согласованные акты', color: '#27ae60' },
    { label: 'Отклоненные акты', color: '#e74c3c' },
    { label: 'Подписанные акты', color: '#3498db' },
    { label: 'Отправленные на согласование', color: '#f39c12' },
    { label: 'Сгенерированные акты', color: '#9b59b6' }
  ];

  const checkboxesContainer = document.createElement('div');
  checkboxesContainer.style.display = 'flex';
  checkboxesContainer.style.flexWrap = 'wrap';
  checkboxesContainer.style.gap = '15px';

  metrics.forEach(metric => {
    const checkboxItem = document.createElement('div');
    checkboxItem.style.display = 'flex';
    checkboxItem.style.alignItems = 'center';
    checkboxItem.style.gap = '8px';

    // Визуальный чекбокс (галочка)
    const checkbox = document.createElement('span');
    checkbox.innerHTML = '☑';
    checkbox.style.fontSize = '16px';
    checkbox.style.color = '#27ae60';
    checkboxItem.appendChild(checkbox);

    // Индикатор цвета
    const colorIndicator = document.createElement('span');
    colorIndicator.style.width = '12px';
    colorIndicator.style.height = '12px';
    colorIndicator.style.backgroundColor = metric.color;
    colorIndicator.style.borderRadius = '2px';
    colorIndicator.style.display = 'inline-block';
    checkboxItem.appendChild(colorIndicator);

    // Метка
    const label = document.createElement('span');
    label.textContent = metric.label;
    label.style.fontSize = '13px';
    label.style.color = '#2c3e50';
    checkboxItem.appendChild(label);

    checkboxesContainer.appendChild(checkboxItem);
  });

  legend.appendChild(checkboxesContainer);
  return legend;
};

// Создание таблицы изменений для PDF
const createPDFChangesTable = (changes) => {
  const tableDiv = document.createElement('div');
  
  const tableTitle = document.createElement('h3');
  tableTitle.textContent = 'Детальные изменения по контейнерам';
  tableTitle.style.fontSize = '20px';
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
    const containerTitle = document.createElement('h4');
    containerTitle.textContent = group.containerName;
    containerTitle.style.fontSize = '16px';
    containerTitle.style.marginTop = '20px';
    containerTitle.style.marginBottom = '10px';
    containerTitle.style.color = '#2c5aa0';
    containerTitle.style.fontWeight = '600';
    tableDiv.appendChild(containerTitle);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginBottom = '30px';
    table.style.fontSize = '11px';

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
      th.style.fontWeight = '600';
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

// Создание страницы с объектами (контейнеры)
const createObjectsPage = async (containers) => {
  // Используем существующий DOM для клонирования контейнеров
  const dashboardContainer = document.querySelector('.containers-list');
  if (!dashboardContainer) {
    return null;
  }

  const page = document.createElement('div');
  page.style.width = '1400px';
  page.style.padding = '40px';
  page.style.backgroundColor = '#fff';
  page.style.fontFamily = 'Arial, sans-serif';
  page.style.minHeight = '990px'; // A3 landscape height

  const clone = dashboardContainer.cloneNode(true);
  
  // Скрываем кнопки и интерактивные элементы
  const elementsToHide = clone.querySelectorAll('button, .modal, .close-modal, .btn-toggle-stats, input, .container-footer, .container-header button');
  elementsToHide.forEach(el => {
    el.style.display = 'none';
  });

  // Показываем статистику контейнеров, если она есть
  const statsSections = clone.querySelectorAll('.container-stats');
  statsSections.forEach(stats => {
    stats.style.display = 'block';
  });

  // Скрываем заголовок секции "Объекты", оставляем только контейнеры
  clone.style.width = '100%';
  page.appendChild(clone);

  return page;
};

// Создание страницы с задачами для разработки
const createTasksPage = (tasks) => {
  const page = document.createElement('div');
  page.style.width = '1400px';
  page.style.padding = '40px';
  page.style.backgroundColor = '#fff';
  page.style.fontFamily = 'Arial, sans-serif';
  page.style.minHeight = '990px'; // A3 landscape height

  // Заголовок
  const title = document.createElement('h1');
  title.textContent = 'Задачи для разработки';
  title.style.fontSize = '32px';
  title.style.fontWeight = '700';
  title.style.color = '#2c5aa0';
  title.style.marginBottom = '30px';
  page.appendChild(title);

  // Таблица задач
  if (tasks && tasks.length > 0) {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';

    // Заголовок таблицы
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#2c5aa0';
    headerRow.style.color = 'white';
    
    ['ID', 'Описание', 'Дата обнаружения', 'Статус', 'Планируется устранить', 'Критичность'].forEach((text, index) => {
      const th = document.createElement('th');
      th.textContent = text;
      th.style.padding = '12px';
      th.style.textAlign = index === 5 ? 'center' : 'left'; // Критичность по центру
      th.style.fontWeight = '600';
      th.style.verticalAlign = 'middle'; // Выравнивание по вертикали
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Тело таблицы
    const tbody = document.createElement('tbody');
    tasks.forEach((task, index) => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #ddd';
      if (index % 2 === 0) {
        row.style.backgroundColor = '#f8f9fa';
      }

      // ID
      const idCell = document.createElement('td');
      idCell.textContent = `DEV-${task.taskNumber || task.id}`;
      idCell.style.padding = '10px';
      idCell.style.verticalAlign = 'middle';
      row.appendChild(idCell);

      // Описание
      const descCell = document.createElement('td');
      descCell.textContent = task.description || '';
      descCell.style.padding = '10px';
      descCell.style.verticalAlign = 'middle';
      row.appendChild(descCell);

      // Дата обнаружения
      const dateCell = document.createElement('td');
      dateCell.textContent = task.discoveryDate 
        ? new Date(task.discoveryDate).toLocaleDateString('ru-RU')
        : '';
      dateCell.style.padding = '10px';
      dateCell.style.verticalAlign = 'middle';
      row.appendChild(dateCell);

      // Статус
      const statusCell = document.createElement('td');
      statusCell.textContent = task.status || '';
      statusCell.style.padding = '10px';
      statusCell.style.verticalAlign = 'middle';
      row.appendChild(statusCell);

      // Планируется устранить
      const plannedCell = document.createElement('td');
      if (task.plannedFixMonth && task.plannedFixYear) {
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
          'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const monthName = monthNames[parseInt(task.plannedFixMonth) - 1] || task.plannedFixMonth;
        plannedCell.textContent = `${monthName} ${task.plannedFixYear}`;
      } else {
        plannedCell.textContent = '-';
      }
      plannedCell.style.padding = '10px';
      plannedCell.style.verticalAlign = 'middle';
      row.appendChild(plannedCell);

      // Критичность
      const priorityCell = document.createElement('td');
      priorityCell.style.padding = '10px';
      priorityCell.style.textAlign = 'center';
      priorityCell.style.verticalAlign = 'middle'; // Выравнивание по вертикали
      
      const priority = task.priority || 'non-critical';
      let prioritySymbol = '';
      let priorityText = '';
      let priorityColor = '';
      
      if (priority === 'critical') {
        prioritySymbol = '⚠'; // Красный восклицательный знак (Unicode)
        priorityText = 'Критично';
        priorityColor = '#e74c3c';
      } else if (priority === 'non-critical') {
        prioritySymbol = '⚡'; // Желтый значок (Unicode)
        priorityText = 'Некритично';
        priorityColor = '#f39c12';
      } else if (priority === 'user-request') {
        prioritySymbol = '💡'; // Зеленая лампочка (Unicode)
        priorityText = 'Пожелания от пользователей';
        priorityColor = '#27ae60';
      } else {
        prioritySymbol = '⚡';
        priorityText = 'Некритично';
        priorityColor = '#f39c12';
      }
      
      // Создаем контейнер для иконки и текста
      const priorityContainer = document.createElement('div');
      priorityContainer.style.display = 'flex';
      priorityContainer.style.alignItems = 'center';
      priorityContainer.style.justifyContent = 'center';
      priorityContainer.style.gap = '5px';
      priorityContainer.style.minHeight = '100%'; // Занимает всю высоту ячейки
      
      const priorityIcon = document.createElement('span');
      priorityIcon.textContent = prioritySymbol;
      priorityIcon.style.fontSize = '18px';
      priorityIcon.style.color = priorityColor;
      priorityIcon.style.lineHeight = '1'; // Убираем лишние отступы
      priorityContainer.appendChild(priorityIcon);
      
      const priorityLabel = document.createElement('span');
      priorityLabel.textContent = priorityText;
      priorityLabel.style.fontSize = '11px';
      priorityLabel.style.color = priorityColor;
      priorityLabel.style.fontWeight = '600';
      priorityLabel.style.lineHeight = '1.2';
      priorityContainer.appendChild(priorityLabel);
      
      priorityCell.appendChild(priorityContainer);
      row.appendChild(priorityCell);

      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    page.appendChild(table);
  } else {
    const noData = document.createElement('p');
    noData.textContent = 'Нет задач для отображения';
    noData.style.color = '#666';
    page.appendChild(noData);
  }

  return page;
};

const formatDelta = (value) => {
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : `${value}`;
};
