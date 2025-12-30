import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import SummaryCards from './SummaryCards';
import Container from './Container';
import StatisticsWidget from './StatisticsWidget';
import DevelopmentTasks from './DevelopmentTasks';
import AuthModal from './AuthModal';
import ToastNotification from './ToastNotification';
import ConfirmModal from './ConfirmModal';
import SyncLogModal from './SyncLogModal';
import SnapshotScheduleModal from './SnapshotScheduleModal';
import AlertsPanel from './AlertsPanel';
import Tooltip from './Tooltip';
import { updateContainer, moveContainer } from '../services/api-containers';
import { exportDashboardToPDF } from '../utils/pdfExport';
import { fetchTasks } from '../services/api-tasks';
import { calculateCriticalObjects } from '../utils/performanceMetrics';

const Dashboard = ({ containers, globalStats, loading, onContainerUpdate, isAuthenticated, onLogin, onLogout }) => {
  const currentDate = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const [isEditingMainTitle, setIsEditingMainTitle] = useState(false);
  const [mainTitle, setMainTitle] = useState('Объекты');
  const [statisticsExpanded, setStatisticsExpanded] = useState(false);
  const [statisticsData, setStatisticsData] = useState(null);
  const dashboardRef = useRef(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [syncLogModalOpen, setSyncLogModalOpen] = useState(false);
  const [snapshotScheduleModalOpen, setSnapshotScheduleModalOpen] = useState(false);
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [objectToOpen, setObjectToOpen] = useState(null); // { containerId, objectId }
  const [highlightCriticalOnOpen, setHighlightCriticalOnOpen] = useState(false);
  const [showDateText, setShowDateText] = useState(false); // Для показа текста даты на мобильных

  // Расчет критических объектов
  const criticalObjectsData = calculateCriticalObjects(containers);

  useEffect(() => {
    // Сохраняем заголовок в localStorage
    const saved = localStorage.getItem('mainTitle');
    if (saved) {
      setMainTitle(saved);
    }
  }, []);

  const handleMainTitleDoubleClick = () => {
    if (!isAuthenticated) return;
    setIsEditingMainTitle(true);
  };

  const handleMainTitleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      localStorage.setItem('mainTitle', mainTitle);
      setIsEditingMainTitle(false);
    } else if (e.key === 'Escape') {
      const saved = localStorage.getItem('mainTitle') || 'Объекты';
      setMainTitle(saved);
      setIsEditingMainTitle(false);
    }
  };

  const handleMainTitleBlur = () => {
    localStorage.setItem('mainTitle', mainTitle);
    setIsEditingMainTitle(false);
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) {
      alert('Ошибка: не удалось найти элемент для экспорта');
      return;
    }

    try {
              // Загружаем задачи для экспорта
              let tasks = [];
              try {
                tasks = await fetchTasks();
                // Сортируем задачи по критичности перед экспортом
                const priorityOrder = {
                  'critical': 1,
                  'non-critical': 2,
                  'user-request': 3
                };
                tasks = tasks.sort((a, b) => {
                  const priorityA = priorityOrder[a.priority || 'non-critical'] || 2;
                  const priorityB = priorityOrder[b.priority || 'non-critical'] || 2;
                  return priorityA - priorityB;
                });
              } catch (error) {
                console.warn('Could not load tasks for PDF export:', error);
              }
              
              await exportDashboardToPDF(
                dashboardRef.current, 
                statisticsData, 
                containers,
                globalStats,
                tasks
              );
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Ошибка при экспорте в PDF: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Загрузка данных...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" ref={dashboardRef}>
      <div className="container">
        <div className="header">
          <div className="logo">
            <Tooltip text="Нажмите для входа администратора" position="bottom">
              <div 
                className="logo-icon" 
                onClick={() => setAuthModalOpen(true)}
                style={{ cursor: 'pointer' }}
              >
                <img src="/favicon.png" alt="Logo" className="logo-image" />
              </div>
            </Tooltip>
            <div className="logo-text">
              <h1>Praktis ID - Пилотные объекты</h1>
              <p>Мониторинг внедрения электронной исполнительной документации</p>
            </div>
          </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {criticalObjectsData.totalCritical > 0 && (
                  <Tooltip text={`${criticalObjectsData.totalCritical} критических объектов требуют внимания`} position="bottom">
                    <button
                      className="btn btn-alerts"
                      onClick={() => setAlertsPanelOpen(true)}
                      style={{
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        padding: '10px 15px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        position: 'relative'
                      }}
                    >
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>Проблемы</span>
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        backgroundColor: '#c0392b',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {criticalObjectsData.totalCritical}
                      </span>
                    </button>
                  </Tooltip>
                )}
                <div 
                  className="date-display"
                  onClick={() => {
                    setShowDateText(true);
                    setTimeout(() => setShowDateText(false), 3000);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <i className="far fa-calendar-alt"></i>
                  <span className={showDateText ? 'date-text-visible' : ''}>{currentDate}</span>
                </div>
                {isAuthenticated && (
                  <>
                    <Tooltip text="Лог синхронизации с Айконой" position="bottom">
                      <button 
                        className="btn btn-sync-log" 
                        onClick={() => setSyncLogModalOpen(true)}
                        style={{
                          position: 'relative',
                          backgroundColor: '#3498db',
                          color: 'white',
                          border: 'none',
                          padding: '10px 15px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        <i className="fas fa-envelope"></i>
                        <span>Лог синхронизации</span>
                      </button>
                    </Tooltip>
                    <Tooltip text="Настройка автоматических снимков планерок" position="bottom">
                      <button 
                        className="btn btn-snapshot-schedule" 
                        onClick={() => setSnapshotScheduleModalOpen(true)}
                        style={{
                          position: 'relative',
                          backgroundColor: '#9b59b6',
                          color: 'white',
                          border: 'none',
                          padding: '10px 15px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        <i className="fas fa-calendar-alt"></i>
                        <span>Расписание снимков</span>
                      </button>
                    </Tooltip>
                  </>
                )}
                <Tooltip text="Экспортировать дашборд в PDF" position="bottom">
                  <button 
                    className="btn btn-export-pdf" 
                    onClick={handleExportPDF}
                  >
                    <i className="fas fa-file-pdf btn-export-icon"></i>
                    <span className="btn-export-text">Экспорт в PDF</span>
                    <span className="btn-export-mobile">PDF</span>
                  </button>
                </Tooltip>
              </div>
        </div>

        <SummaryCards stats={globalStats} />

        <StatisticsWidget 
          expanded={statisticsExpanded}
          onToggle={() => setStatisticsExpanded(!statisticsExpanded)}
          onDataChange={setStatisticsData}
          isAuthenticated={isAuthenticated}
        />

        <div className="dashboard-section">
          <div className="section-header">
            {isEditingMainTitle ? (
              <input
                type="text"
                className="main-title-input"
                value={mainTitle}
                onChange={(e) => setMainTitle(e.target.value)}
                onKeyDown={handleMainTitleKeyPress}
                onBlur={handleMainTitleBlur}
                autoFocus
              />
            ) : (
              <Tooltip text={isAuthenticated ? 'Двойной клик для переименования' : ''}>
                <div
                  className={`section-title ${isAuthenticated ? 'main-title-editable' : ''}`}
                  onDoubleClick={handleMainTitleDoubleClick}
                  style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
                >
                  <i className="fas fa-list-alt"></i> {mainTitle} ({containers.length})
                </div>
              </Tooltip>
            )}
          </div>
          <div className="containers-list" style={{ paddingLeft: isAuthenticated ? '50px' : '0' }}>
            {containers.map((container, index) => (
              <div 
                key={container.id} 
                className="container-wrapper" 
                style={{ position: 'relative' }}
                data-container-id={container.id}
              >
                {isAuthenticated && (
                  <div className="container-move-buttons" style={{ 
                    position: 'absolute', 
                    left: '-45px', 
                    top: '10px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '5px',
                    zIndex: 10
                  }}>
                    <Tooltip text={index === 0 ? 'Контейнер уже первый' : 'Переместить вверх'} position="top">
                      <button
                        className="btn"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await moveContainer(container.id, 'up');
                            onContainerUpdate(); // Обновляем список контейнеров
                          } catch (error) {
                            console.error('Error moving container up:', error);
                            alert('Ошибка при перемещении контейнера: ' + error.message);
                          }
                        }}
                        disabled={index === 0}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          minWidth: '35px',
                          opacity: index === 0 ? 0.5 : 1,
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          backgroundColor: index === 0 ? '#ccc' : '#3498db'
                        }}
                      >
                        <i className="fas fa-arrow-up"></i>
                      </button>
                    </Tooltip>
                    <Tooltip text={index === containers.length - 1 ? 'Контейнер уже последний' : 'Переместить вниз'} position="bottom">
                      <button
                        className="btn"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await moveContainer(container.id, 'down');
                            onContainerUpdate(); // Обновляем список контейнеров
                          } catch (error) {
                            console.error('Error moving container down:', error);
                            alert('Ошибка при перемещении контейнера: ' + error.message);
                          }
                        }}
                        disabled={index === containers.length - 1}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          minWidth: '35px',
                          opacity: index === containers.length - 1 ? 0.5 : 1,
                          cursor: index === containers.length - 1 ? 'not-allowed' : 'pointer',
                          backgroundColor: index === containers.length - 1 ? '#ccc' : '#3498db'
                        }}
                      >
                        <i className="fas fa-arrow-down"></i>
                      </button>
                    </Tooltip>
                  </div>
                )}
                <Container
                  container={container}
                  onUpdate={onContainerUpdate}
                  isAuthenticated={isAuthenticated}
                  openObjectId={objectToOpen && objectToOpen.containerId === container.id ? objectToOpen.objectId : null}
                  onObjectOpened={() => {
                    setObjectToOpen(null);
                    setHighlightCriticalOnOpen(false);
                  }}
                  highlightCriticalOnOpen={highlightCriticalOnOpen && objectToOpen && objectToOpen.containerId === container.id}
                />
              </div>
            ))}
          </div>
        </div>

        <DevelopmentTasks isAuthenticated={isAuthenticated} />

        {isAuthenticated && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              className="btn" 
              onClick={() => setConfirmLogout(true)}
              style={{ backgroundColor: '#95a5a6', color: 'white' }}
            >
              <i className="fas fa-sign-out-alt"></i> Выйти
            </button>
          </div>
        )}

        {/* Модальное окно подтверждения выхода */}
        <ConfirmModal
          isOpen={confirmLogout}
          title="Подтверждение выхода"
          message="Вы уверены, что хотите выйти из системы?"
          onConfirm={() => {
            onLogout();
            setConfirmLogout(false);
            setToast({ message: 'Вы находитесь в режиме просмотра', type: 'info' });
          }}
          onCancel={() => setConfirmLogout(false)}
          confirmText="Да, выйти"
          cancelText="Отмена"
          type="warning"
        />

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLogin={() => {
            onLogin();
            setToast({ message: 'Вы успешно вошли в систему!', type: 'success' });
          }}
        />

        {toast && (
          <ToastNotification
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <SyncLogModal
          isOpen={syncLogModalOpen}
          onClose={() => setSyncLogModalOpen(false)}
        />

        <SnapshotScheduleModal
          isOpen={snapshotScheduleModalOpen}
          onClose={() => setSnapshotScheduleModalOpen(false)}
          isAuthenticated={isAuthenticated}
        />

        <AlertsPanel
          isOpen={alertsPanelOpen}
          onClose={() => setAlertsPanelOpen(false)}
          criticalObjects={criticalObjectsData}
          onObjectClick={(containerId, objectId) => {
            setAlertsPanelOpen(false);
            setObjectToOpen({ containerId, objectId });
            setHighlightCriticalOnOpen(true); // Включаем подсветку критических секций
            // Прокручиваем к контейнеру
            setTimeout(() => {
              const containerElement = document.querySelector(`[data-container-id="${containerId}"]`);
              if (containerElement) {
                containerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }}
        />

        <div className="footer">
          Дашборд обновлен: {new Date().toLocaleString('ru-RU')} | Praktis ID Пилот v1.0
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
