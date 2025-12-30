// В production (Render) используем относительный путь, т.к. фронтенд и бэкенд на одном домене
// В development можно использовать прокси из package.json или установить REACT_APP_API_URL
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // В production используем относительный путь
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  // В development используем localhost или прокси
  return 'http://localhost:3001';
};

const API_URL = getApiUrl();

// Получить токен из localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Сохранить токен в localStorage
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

// Получить заголовки с авторизацией
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// API для аутентификации

// Войти в систему
export const login = async (username, password) => {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }
  
  const data = await response.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
};

// Проверить валидность токена
export const verifyToken = async () => {
  const token = getAuthToken();
  if (!token) {
    return false;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      setAuthToken(null);
      return false;
    }
    
    return true;
  } catch (error) {
    setAuthToken(null);
    return false;
  }
};

// Выйти из системы
export const logout = () => {
  setAuthToken(null);
};

// Получить все контейнеры
export const fetchContainers = async () => {
  const response = await fetch(`${API_URL}/api/containers`);
  if (!response.ok) {
    throw new Error('Failed to fetch containers');
  }
  return response.json();
};

// Создать новый контейнер
export const createContainer = async (name) => {
  const response = await fetch(`${API_URL}/api/containers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error('Failed to create container');
  }
  return response.json();
};

// Обновить контейнер
export const updateContainer = async (containerId, name) => {
  const response = await fetch(`${API_URL}/api/containers/${containerId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error('Failed to update container');
  }
  return response.json();
};

// Переместить контейнер вверх или вниз
export const moveContainer = async (containerId, direction) => {
  const response = await fetch(`${API_URL}/api/containers/${containerId}/move`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ direction }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to move container');
  }
  return response.json();
};

// Удалить контейнер
export const deleteContainer = async (containerId) => {
  const response = await fetch(`${API_URL}/api/containers/${containerId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete container');
  }
  return response.json();
};

// Получить объекты контейнера
export const fetchContainerObjects = async (containerId) => {
  const response = await fetch(`${API_URL}/api/containers/${containerId}/objects`);
  if (!response.ok) {
    throw new Error('Failed to fetch container objects');
  }
  return response.json();
};

// Создать объект в контейнере
export const createContainerObject = async (containerId, objectData) => {
  const response = await fetch(`${API_URL}/api/containers/${containerId}/objects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(objectData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create object');
  }
  return response.json();
};

// Обновить объект
export const updateContainerObject = async (containerId, objectId, objectData) => {
  const response = await fetch(`${API_URL}/api/containers/${containerId}/objects/${objectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(objectData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update object');
  }
  return response.json();
};

// Удалить объект
export const deleteContainerObject = async (containerId, objectId) => {
  const response = await fetch(`${API_URL}/api/containers/${containerId}/objects/${objectId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete object');
  }
  return response.json();
};

// Синхронизировать данные объекта из Айконы
export const syncObjectFromAikona = async (containerId, objectId) => {
  try {
    const response = await fetch(`${API_URL}/api/containers/${containerId}/objects/${objectId}/sync-aikona`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error || 'Failed to sync from Aikona');
      error.response = { data: errorData };
      throw error;
    }
    
    return response.json();
  } catch (error) {
    // Пробрасываем ошибку дальше с сохранением структуры для обработки
    if (error.response) {
      throw error;
    }
    // Если это сетевая ошибка или другая - создаем структуру ошибки
    const networkError = new Error(error.message || 'API_UNAVAILABLE');
    networkError.response = { data: { error: 'API_UNAVAILABLE' } };
    throw networkError;
  }
};

// Получить статистику контейнера
export const fetchContainerStats = async (containerId) => {
  const response = await fetch(`${API_URL}/api/containers/${containerId}/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch container stats');
  }
  return response.json();
};

// Получить общую статистику
export const fetchStats = async () => {
  const response = await fetch(`${API_URL}/api/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  return response.json();
};

// Snapshots
export const fetchSnapshots = async () => {
  const response = await fetch(`${API_URL}/api/snapshots`);
  if (!response.ok) {
    throw new Error('Failed to fetch snapshots');
  }
  return response.json();
};

export const createSnapshot = async () => {
  const response = await fetch(`${API_URL}/api/snapshots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to create snapshot');
  }
  return response.json();
};

export const compareWithLatestSnapshot = async () => {
  const response = await fetch(`${API_URL}/api/snapshots/latest/compare`);
  if (!response.ok) {
    throw new Error('Failed to compare with latest snapshot');
  }
  return response.json();
};

export const compareWithSnapshot = async (snapshotId) => {
  const response = await fetch(`${API_URL}/api/snapshots/compare/${snapshotId}`);
  if (!response.ok) {
    throw new Error('Failed to compare with snapshot');
  }
  return response.json();
};

export const deleteSnapshot = async (snapshotId) => {
  const response = await fetch(`${API_URL}/api/snapshots/${snapshotId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete snapshot');
  }
  return response.json();
};

// Получить последний лог синхронизации с Айконой
export const getAikonaSyncLog = async () => {
  const response = await fetch(`${API_URL}/api/aikona-sync-log`);
  if (!response.ok) {
    throw new Error('Failed to fetch sync log');
  }
  return response.json();
};

// Получить настройки расписания снимков
export const fetchSnapshotSchedule = async () => {
  const response = await fetch(`${API_URL}/api/snapshot-schedule`);
  if (!response.ok) {
    throw new Error('Failed to fetch snapshot schedule');
  }
  return response.json();
};

// Сохранить настройки расписания снимков
export const saveSnapshotSchedule = async (scheduleData) => {
  const response = await fetch(`${API_URL}/api/snapshot-schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scheduleData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save snapshot schedule');
  }
  return response.json();
};
