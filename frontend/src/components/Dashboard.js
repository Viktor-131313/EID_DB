import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import SummaryCards from './SummaryCards';
import Container from './Container';
import StatisticsWidget from './StatisticsWidget';
import DevelopmentTasks from './DevelopmentTasks';
import AuthModal from './AuthModal';
import { updateContainer } from '../services/api-containers';
import { exportDashboardToPDF } from '../utils/pdfExport';
import { fetchTasks } from '../services/api-tasks';

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
            <div 
              className="logo-icon" 
              onClick={() => setAuthModalOpen(true)}
              style={{ cursor: 'pointer' }}
              title="Нажмите для входа администратора"
            >
              <img src="/favicon.png" alt="Logo" className="logo-image" />
            </div>
            <div className="logo-text">
              <h1>Praktis ID - Пилотные объекты</h1>
              <p>Мониторинг внедрения электронной исполнительной документации</p>
            </div>
          </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="date-display">
                  <i className="far fa-calendar-alt"></i> {currentDate}
                </div>
                <button 
                  className="btn btn-export-pdf" 
                  onClick={handleExportPDF}
                  title="Экспортировать дашборд в PDF"
                >
                  <i className="fas fa-file-pdf"></i> Экспорт в PDF
                </button>
              </div>
        </div>

        <SummaryCards stats={globalStats} />

        <StatisticsWidget 
          expanded={statisticsExpanded}
          onToggle={() => setStatisticsExpanded(!statisticsExpanded)}
          onDataChange={setStatisticsData}
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
              <div
                className={`section-title ${isAuthenticated ? 'main-title-editable' : ''}`}
                onDoubleClick={handleMainTitleDoubleClick}
                title={isAuthenticated ? 'Двойной клик для переименования' : ''}
                style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
              >
                <i className="fas fa-list-alt"></i> {mainTitle} ({containers.length})
              </div>
            )}
          </div>
          <div className="containers-list">
            {containers.map(container => (
              <Container
                key={container.id}
                container={container}
                onUpdate={onContainerUpdate}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        </div>

        <DevelopmentTasks isAuthenticated={isAuthenticated} />

        {isAuthenticated && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              className="btn" 
              onClick={onLogout}
              style={{ backgroundColor: '#95a5a6', color: 'white' }}
            >
              <i className="fas fa-sign-out-alt"></i> Выйти
            </button>
          </div>
        )}

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLogin={onLogin}
        />

        <div className="footer">
          Дашборд обновлен: {new Date().toLocaleString('ru-RU')} | Praktis ID Пилот v1.0
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
