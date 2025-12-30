import axios from 'axios';

// В production (Render) используем относительный путь, т.к. фронтенд и бэкенд на одном домене
// В development можно использовать прокси из package.json или установить REACT_APP_API_URL
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Получить токен из localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Получить заголовки с авторизацией
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Добавляем interceptor для добавления токена к каждому запросу
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Tasks API
export const fetchTasks = async () => {
  const response = await api.get('/tasks');
  console.log('api-tasks: Fetched tasks:', response.data);
  if (response.data && response.data.length > 0) {
    console.log('api-tasks: First task taskManagerLink:', response.data[0].taskManagerLink);
  }
  return response.data;
};

export const createTask = async (taskData) => {
  console.log('api-tasks: Creating task with data:', taskData);
  const response = await api.post('/tasks', taskData);
  console.log('api-tasks: Task created successfully:', response.data);
  return response.data;
};

export const updateTask = async (taskId, taskData) => {
  console.log(`api-tasks: Updating task ${taskId} with data:`, taskData);
  console.log(`api-tasks: taskManagerLink in taskData:`, taskData.taskManagerLink);
  try {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    console.log('api-tasks: Task updated successfully:', response.data);
    console.log('api-tasks: taskManagerLink in response:', response.data.taskManagerLink);
    return response.data;
  } catch (error) {
    console.error('api-tasks: Error updating task:', error);
    console.error('api-tasks: Error response:', error.response);
    throw error;
  }
};

export const deleteTask = async (taskId) => {
  const response = await api.delete(`/tasks/${taskId}`);
  return response.data;
};

