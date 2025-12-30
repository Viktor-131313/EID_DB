import React from 'react';
import './ObjectsList.css';
import Tooltip from './Tooltip';
import { calculatePerformanceMetrics } from '../utils/performanceMetrics';

const ObjectsList = ({ objects, onEditObject }) => {
  if (objects.length === 0) {
    return (
      <div className="empty-state">
        <i className="fas fa-inbox"></i>
        <p>Нет объектов. Добавьте первый объект для начала работы.</p>
      </div>
    );
  }

  return (
    <div className="objects-grid">
      {objects.map(obj => {
        const metrics = calculatePerformanceMetrics(obj);
        const status = { class: metrics.statusClass, text: metrics.statusText };
        
        // Используем данные из метрик
        const generated = metrics.generated;
        const generatedTotal = metrics.generatedTotal;
        
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
        
        let rejected = 0;
        if (Array.isArray(obj.rejectedActs)) {
          rejected = obj.rejectedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
        } else if (typeof obj.rejectedActs === 'number') {
          rejected = obj.rejectedActs;
        }

        let signed = 0;
        if (Array.isArray(obj.signedActs)) {
          signed = obj.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
        } else if (typeof obj.signedActs === 'number') {
          signed = obj.signedActs;
        }

        const generatedPercent = generatedTotal > 0 ? Math.round((generated / generatedTotal) * 100) : 0;
        const sentPercent = generated > 0 ? Math.round((sent / generated) * 100) : 0;
        const approvedPercent = sent > 0 ? Math.round((approved / sent) * 100) : 0;
        const signedPercent = approved > 0 ? Math.round((signed / approved) * 100) : 0;

        return (
          <div
            key={obj.id}
            className={`object-card ${metrics.isCritical ? 'object-card-critical' : ''}`}
            onClick={() => onEditObject(obj)}
          >
            {metrics.isCritical && (
              <Tooltip text="Объект требует внимания">
                <div className="critical-alert-badge">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
              </Tooltip>
            )}
            {obj.photo && (
              <div className="object-photo-container">
                <img src={obj.photo} alt={obj.name} className="object-photo" />
              </div>
            )}
            <div className="object-header">
              <div className="object-name">{obj.name || 'Без названия'}</div>
              <div className={`object-status ${status.class}`}>{status.text}</div>
            </div>
            {obj.description && (
              <div className="object-description">{obj.description}</div>
            )}
            {obj.status && (
              <div className="object-status-container">
                <div className="object-status-label">Статус:</div>
                <Tooltip text={obj.status}>
                  <div className="object-status-text">
                    {obj.status}
                  </div>
                </Tooltip>
              </div>
            )}
            
            <div className="progress-container">
              <div className="progress-label">
                <span>Согласовано</span>
                <span>{approvedPercent}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill progress-${status.class.replace('status-', '')}`}
                  style={{ width: `${approvedPercent}%` }}
                ></div>
              </div>
            </div>

            <div className="progress-container">
              <div className="progress-label">
                <span>Подписано</span>
                <span>{signedPercent}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill progress-signed"
                  style={{ width: `${signedPercent}%` }}
                ></div>
              </div>
            </div>
            
            <div className="stats-row">
              <div className="stat-item">Сгенерировано: {generated} ({generatedPercent}%)</div>
              <div className="stat-item">Отправлено: {sent} ({sentPercent}%)</div>
              <div className="stat-item">Согласовано: {approved} ({approvedPercent}%)</div>
              <div className="stat-item">Отклонено: {rejected}</div>
            </div>

            {/* Метрики исполнительности */}
            {generatedTotal > 0 && (
              <div className="performance-metrics">
                <div className="performance-metric">
                  <span className="metric-label">Готовность актов:</span>
                  <span className={`metric-value ${metrics.readinessPercent < 70 ? 'metric-critical' : metrics.readinessPercent < 85 ? 'metric-warning' : 'metric-good'}`}>
                    {metrics.readinessPercent}%
                  </span>
                </div>
                {metrics.lag > 0 && (
                  <div className="performance-metric">
                    <span className="metric-label">Отставание:</span>
                    <span className="metric-value metric-lag">
                      {metrics.lag} актов
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Блокирующие факторы */}
            {obj.blockingFactors && Array.isArray(obj.blockingFactors) && obj.blockingFactors.length > 0 && (
              <div className="blocking-factors-card">
                <div className="blocking-factors-card-title">
                  <i className="fas fa-exclamation-triangle"></i> Проблемные сотрудники
                </div>
                <div className="blocking-factors-card-list">
                  {obj.blockingFactors.map((employee, index) => (
                    <div key={index} className="blocking-factor-card-item">
                      {employee}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ObjectsList;

