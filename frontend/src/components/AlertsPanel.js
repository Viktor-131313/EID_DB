import React from 'react';
import './AlertsPanel.css';
import Tooltip from './Tooltip';

const AlertsPanel = ({ isOpen, onClose, criticalObjects, onObjectClick }) => {
  if (!isOpen) return null;

  return (
    <div className="alerts-panel-overlay" onClick={onClose}>
      <div className="alerts-panel-content" onClick={(e) => e.stopPropagation()}>
        <div className="alerts-panel-header">
          <h2>
            <i className="fas fa-exclamation-triangle"></i> Проблемные объекты
          </h2>
          <button className="close-alerts-panel" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="alerts-panel-summary">
          <div className="alert-summary-item">
            <span className="summary-label">Всего объектов:</span>
            <span className="summary-value">{criticalObjects.totalObjects}</span>
          </div>
          <div className="alert-summary-item alert-critical">
            <span className="summary-label">Критических:</span>
            <span className="summary-value">{criticalObjects.totalCritical}</span>
          </div>
          <div className="alert-summary-item">
            <span className="summary-label">Процент проблемных:</span>
            <span className="summary-value">{criticalObjects.criticalPercent}%</span>
          </div>
        </div>

        <div className="alerts-panel-list">
          {criticalObjects.criticalObjects.length === 0 ? (
            <div className="no-alerts">
              <i className="fas fa-check-circle"></i>
              <p>Нет критических объектов. Все в порядке!</p>
            </div>
          ) : (
            criticalObjects.criticalObjects.map(obj => (
              <div
                key={obj.id}
                className="alert-item"
                onClick={(e) => {
                  e.stopPropagation(); // Предотвращаем закрытие модального окна при клике на элемент
                  if (onObjectClick) {
                    onObjectClick(obj.containerId, obj.id);
                  }
                }}
              >
                <div className="alert-item-header">
                  <div className="alert-object-name">
                    <i className="fas fa-building"></i>
                    {obj.name}
                  </div>
                  <div className={`alert-severity alert-severity-critical`}>
                    Критично
                  </div>
                </div>
                <div className="alert-item-details">
                  <div className="alert-detail">
                    <span className="detail-label">Контейнер:</span>
                    <span className="detail-value">{obj.containerName}</span>
                  </div>
                  <div className="alert-detail">
                    <span className="detail-label">Готовность актов:</span>
                    <span className="detail-value detail-critical">{obj.readinessPercent}%</span>
                  </div>
                  {obj.lag > 0 && (
                    <div className="alert-detail">
                      <span className="detail-label">Отставание:</span>
                      <span className="detail-value detail-critical">{obj.lag} актов</span>
                    </div>
                  )}
                  <div className="alert-detail">
                    <span className="detail-label">Создано:</span>
                    <span className="detail-value">{obj.generated} из {obj.generatedTotal}</span>
                  </div>
                </div>
                <div className="alert-item-action">
                  <i className="fas fa-arrow-right"></i> Кликните для просмотра
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsPanel;

