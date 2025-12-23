import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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

