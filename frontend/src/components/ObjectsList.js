import React from 'react';
import './ObjectsList.css';

const ObjectsList = ({ objects, onEditObject }) => {
  const calculateStatus = (obj) => {
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
      return { class: 'status-good', text: 'Хорошо' };
    } else if (approvedPercent >= 50) {
      return { class: 'status-warning', text: 'В работе' };
    } else {
      return { class: 'status-critical', text: 'Требует внимания' };
    }
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
        const status = calculateStatus(obj);
        
        // Подсчитываем общее количество из массивов СМР
        // Поддержка старого формата данных (числа) для обратной совместимости
        let generated = 0;
        let generatedTotal = 0;
        if (Array.isArray(obj.generatedActs)) {
          generated = obj.generatedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
          generatedTotal = obj.generatedActs.reduce((sum, smr) => sum + (smr.total || 0), 0);
        } else if (typeof obj.generatedActs === 'number') {
          generated = obj.generatedActs;
          generatedTotal = obj.generatedActs; // Для старого формата принимаем count как total
        }
        
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
            className="object-card"
            onClick={() => onEditObject(obj)}
          >
            <div className="object-header">
              <div className="object-name">{obj.name || 'Без названия'}</div>
              <div className={`object-status ${status.class}`}>{status.text}</div>
            </div>
            {obj.description && (
              <div className="object-description">{obj.description}</div>
            )}
            {obj.status && (
              <div className="object-status-text" title={obj.status}>
                {obj.status}
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

