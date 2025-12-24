import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import { fetchContainers, createContainer, fetchStats } from './services/api-containers';

function App() {
  const [containers, setContainers] = useState([]);
  const [globalStats, setGlobalStats] = useState({
    totalObjects: 0,
    totalActs: 0,
    generatedActs: 0,
    sentActs: 0,
    approvedActs: 0,
    rejectedActs: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Проверяем, была ли авторизация ранее (хранится в sessionStorage)
    return sessionStorage.getItem('isAuthenticated') === 'true';
  });

  useEffect(() => {
    loadData();
    
    // Обработка клавиши Insert для создания нового контейнера (только для авторизованных)
    const handleKeyPress = (e) => {
      const isAuth = sessionStorage.getItem('isAuthenticated') === 'true';
      if (isAuth && (e.key === 'Insert' || (e.key === 'Insert' && !e.shiftKey && !e.ctrlKey && !e.altKey))) {
        e.preventDefault();
        handleCreateContainer();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [containersData, statsData] = await Promise.all([
        fetchContainers(),
        fetchStats()
      ]);
      setContainers(containersData);
      setGlobalStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContainer = async () => {
    try {
      const newContainer = await createContainer('Объекты');
      await loadData();
    } catch (error) {
      console.error('Error creating container:', error);
      alert('Ошибка создания контейнера');
    }
  };

  const handleContainerUpdate = useCallback(() => {
    loadData();
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('isAuthenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('isAuthenticated');
  };

  return (
    <div className="App">
      <Dashboard
        containers={containers}
        globalStats={globalStats}
        loading={loading}
        onContainerUpdate={handleContainerUpdate}
        isAuthenticated={isAuthenticated}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
