import React, { useState } from 'react';
import './ObjectsList.css';
import Tooltip from './Tooltip';
import { calculatePerformanceMetrics, calculateDetailedLag } from '../utils/performanceMetrics';

const ObjectsList = ({ objects, onEditObject, onOpenContractor }) => {
  // Состояние для отслеживания развернутых карточек "Детали отставания"
  const [expandedLagDetails, setExpandedLagDetails] = useState(new Set());

  const toggleLagDetails = (objectId, e) => {
    e.stopPropagation(); // Предотвращаем открытие карточки при клике на заголовок
    setExpandedLagDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectId)) {
        newSet.delete(objectId);
      } else {
        newSet.add(objectId);
      }
      return newSet;
    });
  };
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
        const lagDetails = calculateDetailedLag(obj);
        const status = { class: metrics.statusClass, text: metrics.statusText };
        
        // Используем данные из метрик
        const generated = metrics.generated;
        const generatedTotal = metrics.generatedTotal;
        
        let sent = 0;
        let approved = 0;
        let rejected = 0;
        let signed = 0;
        
        // Новая структура: buildings -> sections -> contractors[]
        if (obj.buildings && Array.isArray(obj.buildings) && obj.buildings.length > 0) {
          obj.buildings.forEach(building => {
            if (building.sections && Array.isArray(building.sections)) {
              building.sections.forEach(section => {
                if (section.contractors && Array.isArray(section.contractors)) {
                  section.contractors.forEach(contractor => {
                    if (contractor.sentForApproval && Array.isArray(contractor.sentForApproval)) {
                      sent += contractor.sentForApproval.reduce((sum, smr) => sum + (smr.count || 0), 0);
                    }
                    if (contractor.approvedActs && Array.isArray(contractor.approvedActs)) {
                      approved += contractor.approvedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
                    }
                    if (contractor.rejectedActs && Array.isArray(contractor.rejectedActs)) {
                      rejected += contractor.rejectedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
                    }
                    if (contractor.signedActs && Array.isArray(contractor.signedActs)) {
                      signed += contractor.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
                    }
                  });
                }
                // Обратная совместимость: если есть contractor (единственный)
                else if (section.contractor) {
                  if (section.contractor.sentForApproval && Array.isArray(section.contractor.sentForApproval)) {
                    sent += section.contractor.sentForApproval.reduce((sum, smr) => sum + (smr.count || 0), 0);
                  }
                  if (section.contractor.approvedActs && Array.isArray(section.contractor.approvedActs)) {
                    approved += section.contractor.approvedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
                  }
                  if (section.contractor.rejectedActs && Array.isArray(section.contractor.rejectedActs)) {
                    rejected += section.contractor.rejectedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
                  }
                  if (section.contractor.signedActs && Array.isArray(section.contractor.signedActs)) {
                    signed += section.contractor.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
                  }
                }
              });
            }
          });
        }
        // Старая структура: contractors (массив подрядчиков)
        else if (obj.contractors && Array.isArray(obj.contractors) && obj.contractors.length > 0) {
          obj.contractors.forEach(contractor => {
            if (contractor.sentForApproval && Array.isArray(contractor.sentForApproval)) {
              sent += contractor.sentForApproval.reduce((sum, smr) => sum + (smr.count || 0), 0);
            }
            if (contractor.approvedActs && Array.isArray(contractor.approvedActs)) {
              approved += contractor.approvedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
            }
            if (contractor.rejectedActs && Array.isArray(contractor.rejectedActs)) {
              rejected += contractor.rejectedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
            }
            if (contractor.signedActs && Array.isArray(contractor.signedActs)) {
              signed += contractor.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
            }
          });
        } 
        // Очень старая структура: поля объекта напрямую
        else {
          if (Array.isArray(obj.sentForApproval)) {
            sent = obj.sentForApproval.reduce((sum, smr) => sum + (smr.count || 0), 0);
          } else if (typeof obj.sentForApproval === 'number') {
            sent = obj.sentForApproval;
          }
          
          if (Array.isArray(obj.approvedActs)) {
            approved = obj.approvedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
          } else if (typeof obj.approvedActs === 'number') {
            approved = obj.approvedActs;
          }
          
          if (Array.isArray(obj.rejectedActs)) {
            rejected = obj.rejectedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
          } else if (typeof obj.rejectedActs === 'number') {
            rejected = obj.rejectedActs;
          }

          if (Array.isArray(obj.signedActs)) {
            signed = obj.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
          } else if (typeof obj.signedActs === 'number') {
            signed = obj.signedActs;
          }
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
            {obj.queue && (
              <div className="object-description">Очередь: {obj.queue}</div>
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

            {/* Детали отставания */}
            {lagDetails.length > 0 && (
              <div className="lag-details-card" onClick={(e) => e.stopPropagation()}>
                <div 
                  className="lag-details-title lag-details-title-clickable"
                  onClick={(e) => toggleLagDetails(obj.id, e)}
                >
                  <i className="fas fa-exclamation-circle"></i> 
                  <span>Детали отставания</span>
                  <i className={`fas ${expandedLagDetails.has(obj.id) ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ marginLeft: 'auto', fontSize: '12px' }}></i>
                </div>
                {expandedLagDetails.has(obj.id) && (
                  <div className="lag-details-list">
                    {lagDetails.map((detail, index) => (
                      <Tooltip 
                        key={index}
                        text={`${detail.contractorName} (${detail.contractorWorkType || 'Без типа работ'}): ${detail.generated} из ${detail.generatedTotal} актов`}
                      >
                        <div 
                          className="lag-detail-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenContractor && detail.contractorId) {
                              onOpenContractor(obj, detail);
                            } else if (onEditObject) {
                              // Если onOpenContractor не передан, просто открываем объект
                              onEditObject(obj);
                            }
                          }}
                        >
                          <span className="lag-detail-marker">
                            <i className="fas fa-map-marker-alt"></i>
                          </span>
                          <span className="lag-detail-info">
                            {detail.buildingName && (
                              <span className="lag-building">Корпус {detail.buildingName}</span>
                            )}
                            {detail.sectionName && (
                              <span className="lag-section"> → Секция {detail.sectionName}</span>
                            )}
                            <span className="lag-contractor"> → {detail.contractorName}</span>
                            {detail.contractorWorkType && (
                              <span className="lag-worktype"> ({detail.contractorWorkType})</span>
                            )}
                          </span>
                          <span className="lag-detail-count">{detail.lag} актов</span>
                        </div>
                      </Tooltip>
                    ))}
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

