import axios from 'axios';

// В production (Render) используем относительный путь, т.к. фронтенд и бэкенд на одном домене
// В development можно использовать прокси из package.json или установить REACT_APP_API_URL
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const fetchObjects = async () => {
  const response = await api.get('/objects');
  return response.data;
};

export const fetchObject = async (id) => {
  const response = await api.get(`/objects/${id}`);
  return response.data;
};

export const createObject = async (objectData) => {
  const response = await api.post('/objects', objectData);
  return response.data;
};

export const updateObject = async (id, objectData) => {
  const response = await api.put(`/objects/${id}`, objectData);
  return response.data;
};

export const deleteObject = async (id) => {
  const response = await api.delete(`/objects/${id}`);
  return response.data;
};

export const fetchStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

