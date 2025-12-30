import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import { fetchContainers, createContainer, fetchStats, verifyToken, logout as apiLogout } from './services/api-containers';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Проверяем токен при загрузке приложения
    const checkAuth = async () => {
      try {
        const isValid = await verifyToken();
        setIsAuthenticated(isValid);
      } catch (error) {
        console.error('Error verifying token:', error);
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };
    
    checkAuth();
    loadData();
    
    // Обработка клавиши Insert для создания нового контейнера (только для авторизованных)
    const handleKeyPress = (e) => {
      if (isAuthenticated && (e.key === 'Insert' || (e.key === 'Insert' && !e.shiftKey && !e.ctrlKey && !e.altKey))) {
        e.preventDefault();
        handleCreateContainer();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAuthenticated]);

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
  };

  const handleLogout = () => {
    apiLogout();
    setIsAuthenticated(false);
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
