import React, { useState, useEffect } from 'react';
import './StatisticsWidget.css';
import { 
  fetchSnapshots, 
  createSnapshot, 
  compareWithLatestSnapshot,
  compareWithSnapshot,
  deleteSnapshot
} from '../services/api-containers';

const StatisticsWidget = ({ expanded, onToggle, onDataChange, isAuthenticated = false }) => {
  const [snapshots, setSnapshots] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);
  const [selectedMetrics, setSelectedMetrics] = useState({
    approvedActs: true,
    rejectedActs: true,
    signedActs: true,
    sentForApproval: false,
    generatedActs: false
  });

  useEffect(() => {
    loadSnapshots();
    loadComparison();
  }, []);

  const loadSnapshots = async () => {
    try {
      const data = await fetchSnapshots();
      setSnapshots(data);
    } catch (error) {
      console.error('Error loading snapshots:', error);
    }
  };

  const loadComparison = async (snapshotId = null) => {
    try {
      setLoading(true);
      let data;
      if (snapshotId) {
        data = await compareWithSnapshot(snapshotId);
        // Структура уже нормализована на бэкенде
      } else {
        data = await compareWithLatestSnapshot();
      }
      console.log('Comparison data loaded:', data);
      console.log('Comparison.comparison:', data.comparison);
      console.log('Comparison.comparison.summary:', data.comparison?.summary);
      setComparison(data);
      setSelectedSnapshotId(snapshotId);
      if (onDataChange) {
        onDataChange(data);
      }
    } catch (error) {
      console.error('Error loading comparison:', error);
      alert('Ошибка при загрузке сравнения: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!window.confirm('Создать снимок текущего состояния для планерки?')) {
      return;
    }
    try {
      setLoading(true);
      await createSnapshot();
      await loadSnapshots();
      await loadComparison(selectedSnapshotId);
      alert('Снимок успешно создан!');
    } catch (error) {
      console.error('Error creating snapshot:', error);
      alert('Ошибка при создании снимка');
    } finally {
      setLoading(false);
    }
  };

  const handleSnapshotChange = (e) => {
    const snapshotId = e.target.value ? parseInt(e.target.value) : null;
    loadComparison(snapshotId);
  };

  const handleDeleteSnapshot = async (snapshotId, e) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    const snapshot = snapshots.find(s => s.id === snapshotId);
    const snapshotDate = snapshot ? new Date(snapshot.date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '';

    if (!window.confirm(`Вы уверены, что хотите удалить снимок от ${snapshotDate}? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteSnapshot(snapshotId);
      
      // Если удаленный снимок был выбран, сбрасываем выбор
      if (selectedSnapshotId === snapshotId) {
        setSelectedSnapshotId(null);
        await loadComparison(null);
      } else {
        await loadComparison(selectedSnapshotId);
      }
      
      await loadSnapshots();
      alert('Снимок успешно удален');
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      alert('Ошибка при удалении снимка: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleMetric = (metric) => {
    setSelectedMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  if (!expanded) {
    return (
      <div className="statistics-widget-collapsed">
        <button className="btn-expand-statistics" onClick={onToggle}>
          <i className="fas fa-chart-line"></i> Статистика планерок
          <i className="fas fa-chevron-down"></i>
        </button>
      </div>
    );
  }

  return (
    <div className="statistics-widget">
      <div className="statistics-widget-header">
        <h3>
          <i className="fas fa-chart-line"></i> Статистика планерок
        </h3>
        <button className="btn-collapse-statistics" onClick={onToggle}>
          <i className="fas fa-chevron-up"></i>
        </button>
      </div>

      <div className="statistics-widget-controls">
        <div className="control-group">
          <label>Сравнить с планеркой:</label>
          <select 
            value={selectedSnapshotId || ''} 
            onChange={handleSnapshotChange}
            disabled={loading}
          >
            <option value="">Последняя планерка (по умолчанию)</option>
            {snapshots.map(snapshot => (
              <option key={snapshot.id} value={snapshot.id}>
                {new Date(snapshot.date).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </option>
            ))}
          </select>
        </div>

        {isAuthenticated && (
          <button 
            className="btn-create-snapshot" 
            onClick={handleCreateSnapshot}
            disabled={loading}
          >
            <i className="fas fa-camera"></i> Сохранить снимок для планерки
          </button>
        )}
      </div>

      {snapshots.length > 0 && (
        <div className="snapshots-list">
          <label className="snapshots-list-label">Сохраненные снимки:</label>
          <div className="snapshots-list-items">
            {[...snapshots].sort((a, b) => new Date(b.date) - new Date(a.date)).map(snapshot => (
              <div key={snapshot.id} className="snapshot-item">
                <span className="snapshot-date">
                  {new Date(snapshot.date).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {isAuthenticated && (
                  <button
                    className="btn-delete-snapshot"
                    onClick={(e) => handleDeleteSnapshot(snapshot.id, e)}
                    disabled={loading}
                    title="Удалить снимок"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-message">Загрузка...</div>
      )}

      {!loading && comparison && (
        <>
          {!comparison.hasPreviousSnapshot && (
            <div className="no-snapshots-message">
              <p>Нет сохраненных снимков. Создайте первый снимок для начала отслеживания статистики.</p>
            </div>
          )}

          {comparison.hasPreviousSnapshot && comparison.comparison && comparison.comparison.summary && (
            <>
              {/* График */}
              <div className="chart-container">
                <ComparisonChart 
                  comparison={comparison.comparison}
                  selectedMetrics={selectedMetrics}
                />
              </div>

              {/* Чекбоксы для фильтрации метрик */}
              <div className="metrics-filter">
                <label>Отображаемые метрики:</label>
                <div className="metrics-checkboxes">
                  <label className="metric-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.approvedActs}
                      onChange={() => toggleMetric('approvedActs')}
                    />
                    <span className="color-indicator" style={{ backgroundColor: '#27ae60' }}></span>
                    Согласованные акты
                  </label>
                  <label className="metric-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.rejectedActs}
                      onChange={() => toggleMetric('rejectedActs')}
                    />
                    <span className="color-indicator" style={{ backgroundColor: '#e74c3c' }}></span>
                    Отклоненные акты
                  </label>
                  <label className="metric-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.signedActs}
                      onChange={() => toggleMetric('signedActs')}
                    />
                    <span className="color-indicator" style={{ backgroundColor: '#3498db' }}></span>
                    Подписанные акты
                  </label>
                  <label className="metric-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.sentForApproval}
                      onChange={() => toggleMetric('sentForApproval')}
                    />
                    <span className="color-indicator" style={{ backgroundColor: '#f39c12' }}></span>
                    Отправленные на согласование
                  </label>
                  <label className="metric-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.generatedActs}
                      onChange={() => toggleMetric('generatedActs')}
                    />
                    <span className="color-indicator" style={{ backgroundColor: '#9b59b6' }}></span>
                    Сгенерированные акты
                  </label>
                </div>
              </div>

              {/* Таблица изменений */}
              <div className="changes-table-container">
                <h4>Изменения по контейнерам:</h4>
                <ChangesTable changes={comparison.comparison.changes} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

// Компонент таблицы изменений
const ChangesTable = ({ changes }) => {
  if (!changes || changes.length === 0) {
    return <p>Нет изменений</p>;
  }

  // Группируем по контейнерам
  const groupedByContainer = {};
  changes.forEach(change => {
    if (!groupedByContainer[change.containerId]) {
      groupedByContainer[change.containerId] = {
        containerName: change.containerName,
        changes: []
      };
    }
    groupedByContainer[change.containerId].changes.push(change);
  });

  return (
    <div className="changes-table">
      {Object.values(groupedByContainer).map(group => {
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

        return (
          <div key={group.containerName} className="container-group">
            <h5 className="container-group-title">{group.containerName}</h5>
            <table>
              <thead>
                <tr>
                  <th>Объект</th>
                  <th>СМР</th>
                  <th>Согласовано</th>
                  <th>Отклонено</th>
                  <th>Подписано</th>
                  <th>Отправлено</th>
                  <th>Сгенерировано</th>
                </tr>
              </thead>
              <tbody>
                {group.changes.map((change, index) => (
                  <tr key={`${change.objectId}-${change.smrId}-${index}`}>
                    <td>{change.objectName}</td>
                    <td>{change.smrName}</td>
                    <td className={change.deltas.approvedActs > 0 ? 'positive' : change.deltas.approvedActs < 0 ? 'negative' : ''}>
                      {change.deltas.approvedActs > 0 ? '+' : ''}{change.deltas.approvedActs}
                    </td>
                    <td className={change.deltas.rejectedActs > 0 ? 'positive' : change.deltas.rejectedActs < 0 ? 'negative' : ''}>
                      {change.deltas.rejectedActs > 0 ? '+' : ''}{change.deltas.rejectedActs}
                    </td>
                    <td className={change.deltas.signedActs > 0 ? 'positive' : change.deltas.signedActs < 0 ? 'negative' : ''}>
                      {change.deltas.signedActs > 0 ? '+' : ''}{change.deltas.signedActs}
                    </td>
                    <td className={change.deltas.sentForApproval > 0 ? 'positive' : change.deltas.sentForApproval < 0 ? 'negative' : ''}>
                      {change.deltas.sentForApproval > 0 ? '+' : ''}{change.deltas.sentForApproval}
                    </td>
                    <td className={change.deltas.generatedActs > 0 ? 'positive' : change.deltas.generatedActs < 0 ? 'negative' : ''}>
                      {change.deltas.generatedActs > 0 ? '+' : ''}{change.deltas.generatedActs}
                    </td>
                  </tr>
                ))}
                {/* Строка итогов */}
                <tr className="totals-row">
                  <td colSpan="2" style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px' }}>Итого:</td>
                  <td className={totals.approvedActs > 0 ? 'positive' : totals.approvedActs < 0 ? 'negative' : ''} style={{ fontWeight: 'bold' }}>
                    {totals.approvedActs > 0 ? '+' : ''}{totals.approvedActs}
                  </td>
                  <td className={totals.rejectedActs > 0 ? 'positive' : totals.rejectedActs < 0 ? 'negative' : ''} style={{ fontWeight: 'bold' }}>
                    {totals.rejectedActs > 0 ? '+' : ''}{totals.rejectedActs}
                  </td>
                  <td className={totals.signedActs > 0 ? 'positive' : totals.signedActs < 0 ? 'negative' : ''} style={{ fontWeight: 'bold' }}>
                    {totals.signedActs > 0 ? '+' : ''}{totals.signedActs}
                  </td>
                  <td className={totals.sentForApproval > 0 ? 'positive' : totals.sentForApproval < 0 ? 'negative' : ''} style={{ fontWeight: 'bold' }}>
                    {totals.sentForApproval > 0 ? '+' : ''}{totals.sentForApproval}
                  </td>
                  <td className={totals.generatedActs > 0 ? 'positive' : totals.generatedActs < 0 ? 'negative' : ''} style={{ fontWeight: 'bold' }}>
                    {totals.generatedActs > 0 ? '+' : ''}{totals.generatedActs}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

// Компонент графика сравнения (простая CSS визуализация)
const ComparisonChart = ({ comparison, selectedMetrics }) => {
  if (!comparison || !comparison.summary) {
    return <div className="chart-placeholder">Нет данных для отображения</div>;
  }

  const { summary } = comparison;
  
  // Поддержка разных форматов дат (oldSnapshotDate/snapshotDate и newSnapshotDate/currentSnapshotDate)
  const oldDateObj = comparison.oldSnapshotDate ? new Date(comparison.oldSnapshotDate) : new Date(comparison.snapshotDate || comparison.latestSnapshotDate);
  const newDateObj = comparison.newSnapshotDate ? new Date(comparison.newSnapshotDate) : new Date(comparison.currentSnapshotDate);
  
  const oldDate = oldDateObj.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  const newDate = newDateObj.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Находим максимальное значение для масштабирования
  const metrics = [
    { key: 'approved', label: 'Согласованные', color: '#27ae60', old: summary.approvedActs.old, new: summary.approvedActs.new, delta: summary.approvedActs.delta, enabled: selectedMetrics.approvedActs },
    { key: 'rejected', label: 'Отклоненные', color: '#e74c3c', old: summary.rejectedActs.old, new: summary.rejectedActs.new, delta: summary.rejectedActs.delta, enabled: selectedMetrics.rejectedActs },
    { key: 'signed', label: 'Подписанные', color: '#3498db', old: summary.signedActs.old, new: summary.signedActs.new, delta: summary.signedActs.delta, enabled: selectedMetrics.signedActs },
    { key: 'sent', label: 'Отправленные', color: '#f39c12', old: summary.sentForApproval.old, new: summary.sentForApproval.new, delta: summary.sentForApproval.delta, enabled: selectedMetrics.sentForApproval },
    { key: 'generated', label: 'Сгенерированные', color: '#9b59b6', old: summary.generatedActs.old, new: summary.generatedActs.new, delta: summary.generatedActs.delta, enabled: selectedMetrics.generatedActs }
  ].filter(m => m.enabled);

  const maxValue = Math.max(
    ...metrics.flatMap(m => [m.old, m.new]),
    1
  );

  return (
    <div className="simple-chart">
      <div className="chart-legend">
        <div className="chart-date">{oldDate}</div>
        <div className="chart-date">{newDate}</div>
      </div>
      <div className="chart-bars">
        {metrics.map(metric => (
          <div key={metric.key} className="chart-metric-group">
            <div className="metric-label">
              <span className="color-indicator" style={{ backgroundColor: metric.color }}></span>
              {metric.label}
            </div>
            <div className="bars-row">
              <div className="bar-container">
                <div 
                  className="bar" 
                  style={{ 
                    width: `${(metric.old / maxValue) * 100}%`, 
                    backgroundColor: metric.color 
                  }}
                >
                  <span className="bar-value">{metric.old}</span>
                </div>
              </div>
              <div className="bar-container">
                <div 
                  className="bar" 
                  style={{ 
                    width: `${(metric.new / maxValue) * 100}%`, 
                    backgroundColor: metric.color 
                  }}
                >
                  <span className="bar-value">
                    {metric.new} {metric.delta !== 0 && (
                      <span style={{ color: '#000000' }}>
                        ({metric.delta > 0 ? '+' : ''}{metric.delta})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatisticsWidget;

