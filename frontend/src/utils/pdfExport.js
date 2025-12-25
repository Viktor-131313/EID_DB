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

      // 3. Листы с объектами - каждый контейнер на отдельной странице
      if (containers && containers.length > 0) {
        const objectsPages = await createObjectsPages(containers);
        objectsPages.forEach((page, index) => {
          if (page) {
            page.style.pageBreakBefore = 'always';
            allPagesContainer.appendChild(page);
            console.log(`Objects page ${index + 1} created for container: ${containers[index]?.name}`);
          }
        });
      } else {
        console.warn('No containers to export');
      }

      // 4. Лист с задачами для разработки - с НОВОГО ЛИСТА
      // Задачи могут быть разбиты на несколько страниц
      if (tasks && tasks.length > 0) {
        const tasksPages = createTasksPages(tasks);
        tasksPages.forEach((tasksPage, index) => {
          if (index === 0) {
            tasksPage.style.pageBreakBefore = 'always';
          } else {
            tasksPage.style.pageBreakBefore = 'always';
          }
          allPagesContainer.appendChild(tasksPage);
        });
        console.log(`Tasks pages created: ${tasksPages.length}`);
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
    oldBar.style.color = '#000000';
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
    newBar.style.color = '#000000';
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

    // Вычисляем итоги по каждому столбцу для группы
    const totals = group.changes.reduce((acc, change) => {
      acc.approvedActs += change.deltas.approvedActs || 0;
      acc.rejectedActs += change.deltas.rejectedActs || 0;
      acc.signedActs += change.deltas.signedActs || 0;
      acc.sentForApproval += change.deltas.sentForApproval || 0;
      acc.generatedActs += change.deltas.generatedActs || 0;
      return acc;
    }, {
      approvedActs: 0,
      rejectedActs: 0,
      signedActs: 0,
      sentForApproval: 0,
      generatedActs: 0
    });

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

    // Строка итогов
    const totalsRow = document.createElement('tr');
    totalsRow.style.borderTop = '2px solid #2c5aa0';
    totalsRow.style.backgroundColor = '#f0f4f8';
    totalsRow.style.fontWeight = 'bold';

    const totalsCells = [
      'Итого:',
      '',
      formatDelta(totals.approvedActs),
      formatDelta(totals.rejectedActs),
      formatDelta(totals.signedActs),
      formatDelta(totals.sentForApproval),
      formatDelta(totals.generatedActs)
    ];

    totalsCells.forEach((text, i) => {
      const td = document.createElement('td');
      td.textContent = text;
      td.style.padding = '8px';
      td.style.fontWeight = 'bold';
      td.style.color = '#2c3e50';
      if (i === 0) {
        td.style.textAlign = 'right';
        td.style.paddingRight = '10px';
      }
      if (i > 1) {
        if (text.startsWith('+')) {
          td.style.color = '#27ae60';
        } else if (text.startsWith('-')) {
          td.style.color = '#e74c3c';
        }
      }
      totalsRow.appendChild(td);
    });

    tbody.appendChild(totalsRow);
    table.appendChild(tbody);
    tableDiv.appendChild(table);
  });

  return tableDiv;
};

// Создание страниц с объектами - каждый контейнер на отдельной странице
const createObjectsPages = async (containers) => {
  const pages = [];
  
  // Используем существующий DOM для клонирования контейнеров
  const dashboardContainer = document.querySelector('.containers-list');
  if (!dashboardContainer) {
    return [];
  }

  // Создаем страницу для каждого контейнера
  for (const container of containers) {
    const page = document.createElement('div');
    page.style.width = '1400px';
    page.style.padding = '40px';
    page.style.backgroundColor = '#fff';
    page.style.fontFamily = 'Arial, sans-serif';
    page.style.minHeight = '990px'; // A3 landscape height

    // Находим контейнер в DOM
    const containerElement = Array.from(dashboardContainer.children).find(
      el => {
        const title = el.querySelector('.container-title');
        return title && title.textContent.includes(container.name);
      }
    );

    if (containerElement) {
      const clone = containerElement.cloneNode(true);
      
      // Скрываем кнопки и интерактивные элементы
      const elementsToHide = clone.querySelectorAll('button, .modal, .close-modal, .btn-toggle-stats, input, .container-footer, .container-header button');
      elementsToHide.forEach(el => {
        el.style.display = 'none';
      });

      // Показываем статистику контейнера, если она есть
      const statsSection = clone.querySelector('.container-stats');
      if (statsSection) {
        statsSection.style.display = 'block';
      }

      // Устанавливаем одинаковую сетку для всех контейнеров (всегда 3 колонки)
      const objectsGrid = clone.querySelector('.objects-grid');
      if (objectsGrid) {
        // Уменьшенные колонки: 360px для лучшего размещения информации
        objectsGrid.style.gridTemplateColumns = '360px 360px 360px';
        objectsGrid.style.gap = '20px';
        objectsGrid.style.width = '100%';
        objectsGrid.style.maxWidth = '1120px'; // 360*3 + 20*2 = 1120px
        objectsGrid.style.display = 'grid';
        objectsGrid.style.justifyContent = 'flex-start';
      }

      // Устанавливаем одинаковый размер для всех плиток объектов
      const objectCards = clone.querySelectorAll('.object-card');
      // Увеличенная высота для отображения всей информации
      const cardWidth = '360px';
      const cardHeight = '550px'; // Увеличено для видимости всей информации
      
      objectCards.forEach(card => {
        card.style.width = cardWidth;
        card.style.minWidth = cardWidth;
        card.style.maxWidth = cardWidth;
        card.style.height = cardHeight;
        card.style.minHeight = cardHeight;
        card.style.maxHeight = cardHeight;
        card.style.boxSizing = 'border-box';
        card.style.overflow = 'visible'; // Изменено с 'hidden' на 'visible' для видимости всей информации
        card.style.flexShrink = '0';
        card.style.display = 'inline-block';
      });

      clone.style.width = '100%';
      page.appendChild(clone);
      pages.push(page);
    }
  }

  return pages;
};

// Создание страниц с задачами для разработки
// Разбиваем задачи на страницы по 20 строк каждая
const createTasksPages = (tasks) => {
  if (!tasks || tasks.length === 0) {
    return [];
  }

  const pages = [];
  const rowsPerPage = 16;
  const totalPages = Math.ceil(tasks.length / rowsPerPage);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const startIndex = pageIndex * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, tasks.length);
    const pageTasks = tasks.slice(startIndex, endIndex);
    
    const page = createSingleTasksPage(pageTasks, pageIndex === 0);
    pages.push(page);
  }

  return pages;
};

// Создание страницы с задачами
// showTitle - показывать ли заголовок (только на первой странице)
const createSingleTasksPage = (tasks, showTitle = true) => {
  const page = document.createElement('div');
  page.style.width = '1400px';
  page.style.padding = '20px 10px 40px 10px'; // Минимальные боковые отступы
  page.style.backgroundColor = '#fff';
  page.style.fontFamily = 'Arial, sans-serif';
  page.style.minHeight = '990px'; // A3 landscape height
  page.style.boxSizing = 'border-box';
  page.style.overflow = 'visible';
  page.style.display = 'flex';
  page.style.flexDirection = 'column';

  // Заголовок (только на первой странице)
  if (showTitle) {
    const title = document.createElement('h1');
    title.textContent = 'Задачи для разработки';
    title.style.fontSize = '32px';
    title.style.fontWeight = '700';
    title.style.color = '#2c5aa0';
    title.style.marginBottom = '30px';
    title.style.pageBreakAfter = 'avoid';
    title.style.breakAfter = 'avoid';
    page.appendChild(title);
  }

  // Таблица задач
  if (tasks && tasks.length > 0) {
    // Контейнер для заголовков и таблицы
    const tableWrapper = document.createElement('div');
    tableWrapper.style.width = '100%';
    tableWrapper.style.margin = '0';
    tableWrapper.style.padding = '0';
    tableWrapper.style.boxSizing = 'border-box';
    
    // Ширины колонок (одинаковые для заголовков и ячеек) - уменьшены для лучшей посадки на странице
    const columnWidths = [120, 500, 160, 160, 220, 130];
    const headerTexts = ['ID', 'Описание', 'Дата обнаружения', 'Статус', 'Планируется устранить', 'Критичность'];
    
    // Отдельный контейнер для заголовков (flexbox)
    const headerContainer = document.createElement('div');
    headerContainer.style.display = 'flex';
    headerContainer.style.width = '100%';
    headerContainer.style.backgroundColor = '#2c5aa0';
    headerContainer.style.color = 'white';
    headerContainer.style.margin = '0';
    headerContainer.style.padding = '0';
    headerContainer.style.boxSizing = 'border-box';
    headerContainer.style.pageBreakAfter = 'avoid';
    headerContainer.style.breakAfter = 'avoid';
    
    headerTexts.forEach((text, index) => {
      const headerCell = document.createElement('div');
      headerCell.textContent = text;
      headerCell.style.width = `${columnWidths[index]}px`;
      headerCell.style.minWidth = `${columnWidths[index]}px`;
      headerCell.style.maxWidth = `${columnWidths[index]}px`;
      headerCell.style.padding = '10px';
      // Выравнивание: индекс 5 (Критичность) - center, индексы 2,3,4 (Дата обнаружения, Статус, Планируется устранить) - right, остальные - left
      if (index === 5) {
        headerCell.style.textAlign = 'center';
      } else if (index >= 2 && index <= 4) {
        headerCell.style.textAlign = 'right';
      } else {
        headerCell.style.textAlign = 'left';
      }
      headerCell.style.fontWeight = '600';
      headerCell.style.verticalAlign = 'middle';
      headerCell.style.boxSizing = 'border-box';
      headerCell.style.margin = '0';
      headerCell.style.flexShrink = '0';
      headerCell.style.flexGrow = '0';
      headerContainer.appendChild(headerCell);
    });
    
    tableWrapper.appendChild(headerContainer);

    // Основная таблица (без заголовков, только данные)
    const table = document.createElement('table');
    table.setAttribute('width', '100%');
    table.style.width = '100%';
    table.style.maxWidth = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';
    table.style.tableLayout = 'fixed';
    table.style.margin = '0';
    table.style.padding = '0';
    table.style.display = 'table';
    table.style.boxSizing = 'border-box';
    table.style.borderSpacing = '0';
    table.style.border = 'none';

    // Тело таблицы
    const tbody = document.createElement('tbody');
    tasks.forEach((task, index) => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #ddd';
      row.style.pageBreakInside = 'avoid'; // Не разрывать строку внутри страницы
      row.style.breakInside = 'avoid';
      row.style.pageBreakAfter = 'auto'; // Автоматический разрыв после строки
      row.style.breakAfter = 'auto';
      if (index % 2 === 0) {
        row.style.backgroundColor = '#f8f9fa';
      }

      // ID
      const idCell = document.createElement('td');
      idCell.setAttribute('width', columnWidths[0].toString());
      idCell.textContent = `DEV-${task.taskNumber || task.id}`;
      idCell.style.width = `${columnWidths[0]}px`;
      idCell.style.padding = '10px';
      idCell.style.verticalAlign = 'middle';
      idCell.style.wordWrap = 'break-word';
      idCell.style.boxSizing = 'border-box';
      idCell.style.margin = '0';
      row.appendChild(idCell);

      // Описание
      const descCell = document.createElement('td');
      descCell.setAttribute('width', columnWidths[1].toString());
      descCell.textContent = task.description || '';
      descCell.style.width = `${columnWidths[1]}px`;
      descCell.style.padding = '10px';
      descCell.style.verticalAlign = 'middle';
      descCell.style.wordWrap = 'break-word';
      descCell.style.wordBreak = 'break-word';
      descCell.style.boxSizing = 'border-box';
      descCell.style.margin = '0';
      row.appendChild(descCell);

      // Дата обнаружения
      const dateCell = document.createElement('td');
      dateCell.setAttribute('width', columnWidths[2].toString());
      dateCell.textContent = task.discoveryDate 
        ? new Date(task.discoveryDate).toLocaleDateString('ru-RU')
        : '';
      dateCell.style.width = `${columnWidths[2]}px`;
      dateCell.style.padding = '10px';
      dateCell.style.textAlign = 'right';
      dateCell.style.verticalAlign = 'middle';
      dateCell.style.wordWrap = 'break-word';
      dateCell.style.boxSizing = 'border-box';
      dateCell.style.margin = '0';
      row.appendChild(dateCell);

      // Статус
      const statusCell = document.createElement('td');
      statusCell.setAttribute('width', columnWidths[3].toString());
      statusCell.textContent = task.status || '';
      statusCell.style.width = `${columnWidths[3]}px`;
      statusCell.style.padding = '10px';
      statusCell.style.textAlign = 'right';
      statusCell.style.verticalAlign = 'middle';
      statusCell.style.wordWrap = 'break-word';
      statusCell.style.boxSizing = 'border-box';
      statusCell.style.margin = '0';
      row.appendChild(statusCell);

      // Планируется устранить
      const plannedCell = document.createElement('td');
      plannedCell.setAttribute('width', columnWidths[4].toString());
      if (task.plannedFixMonth && task.plannedFixYear) {
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
          'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const monthName = monthNames[parseInt(task.plannedFixMonth) - 1] || task.plannedFixMonth;
        plannedCell.textContent = `${monthName} ${task.plannedFixYear}`;
      } else {
        plannedCell.textContent = '-';
      }
      plannedCell.style.width = `${columnWidths[4]}px`;
      plannedCell.style.padding = '10px';
      plannedCell.style.textAlign = 'right';
      plannedCell.style.verticalAlign = 'middle';
      plannedCell.style.wordWrap = 'break-word';
      plannedCell.style.boxSizing = 'border-box';
      plannedCell.style.margin = '0';
      row.appendChild(plannedCell);

      // Критичность
      const priorityCell = document.createElement('td');
      priorityCell.setAttribute('width', columnWidths[5].toString());
      priorityCell.style.width = `${columnWidths[5]}px`;
      priorityCell.style.padding = '10px';
      priorityCell.style.boxSizing = 'border-box';
      priorityCell.style.margin = '0';
      priorityCell.style.textAlign = 'center';
      priorityCell.style.verticalAlign = 'middle';
      priorityCell.style.wordWrap = 'break-word';
      
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
    tableWrapper.appendChild(table);
    page.appendChild(tableWrapper);
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
