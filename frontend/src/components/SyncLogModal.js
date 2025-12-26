import React, { useState, useEffect } from 'react';
import './SyncLogModal.css';
import { getAikonaSyncLog } from '../services/api-containers';

const SyncLogModal = ({ isOpen, onClose }) => {
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadLog();
    }
  }, [isOpen]);

  const loadLog = async () => {
    try {
      setLoading(true);
      const logData = await getAikonaSyncLog();
      setLog(logData);
    } catch (error) {
      console.error('Error loading sync log:', error);
      setLog({
        message: 'Ошибка загрузки лога синхронизации',
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal sync-log-modal-overlay" onClick={onClose}>
      <div className="modal-content sync-log-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="sync-log-modal-header">
          <h2>
            <i className="fas fa-envelope"></i> Лог синхронизации с Айконой
          </h2>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        
        <div className="sync-log-modal-body">
          {loading ? (
            <div className="sync-log-loading">
              <i className="fas fa-spinner fa-spin"></i> Загрузка...
            </div>
          ) : log ? (
            <>
              <div className={`sync-log-status ${log.success ? 'success' : 'error'}`}>
                <i className={`fas fa-${log.success ? 'check-circle' : 'exclamation-circle'}`}></i>
                <span>{log.message || 'Нет информации о синхронизации'}</span>
              </div>
              
              {log.timestamp && (
                <div className="sync-log-timestamp">
                  <i className="far fa-clock"></i>
                  <strong>Время синхронизации:</strong> {log.timestamp}
                </div>
              )}
              
              {log.syncedCount !== undefined && (
                <div className="sync-log-stats">
                  <div className="stat-item stat-success">
                    <i className="fas fa-check"></i>
                    <span>Успешно: {log.syncedCount}</span>
                  </div>
                  {log.errorCount > 0 && (
                    <div className="stat-item stat-error">
                      <i className="fas fa-times"></i>
                      <span>Ошибок: {log.errorCount}</span>
                    </div>
                  )}
                </div>
              )}
              
              {log.syncedObjects && log.syncedObjects.length > 0 && (
                <div className="sync-log-objects">
                  <h3>
                    <i className="fas fa-check-circle"></i> Успешно синхронизированные объекты:
                  </h3>
                  <ul>
                    {log.syncedObjects.map((obj, index) => (
                      <li key={index}>
                        <strong>{obj.name}</strong>
                        {obj.containerName && <span className="container-name"> ({obj.containerName})</span>}
                        {obj.aikonaId && <span className="aikona-id"> [Айкона ID: {obj.aikonaId}]</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {log.failedObjects && log.failedObjects.length > 0 && (
                <div className="sync-log-objects sync-log-failed">
                  <h3>
                    <i className="fas fa-exclamation-triangle"></i> Объекты с ошибками:
                  </h3>
                  <ul>
                    {log.failedObjects.map((obj, index) => (
                      <li key={index}>
                        <strong>{obj.name}</strong>
                        {obj.aikonaId && <span className="aikona-id"> [Айкона ID: {obj.aikonaId}]</span>}
                        <div className="error-message">{obj.error}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {(!log.syncedObjects || log.syncedObjects.length === 0) && 
               (!log.failedObjects || log.failedObjects.length === 0) && 
               log.lastSync === null && (
                <div className="sync-log-empty">
                  <i className="fas fa-info-circle"></i>
                  <p>Синхронизация еще не выполнялась</p>
                </div>
              )}
            </>
          ) : (
            <div className="sync-log-empty">
              <i className="fas fa-exclamation-triangle"></i>
              <p>Не удалось загрузить лог синхронизации</p>
            </div>
          )}
        </div>
        
        <div className="sync-log-modal-footer">
          <button className="btn" onClick={onClose}>Закрыть</button>
          <button className="btn btn-primary" onClick={loadLog}>
            <i className="fas fa-sync-alt"></i> Обновить
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncLogModal;

