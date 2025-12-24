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

// Containers
export const fetchContainers = async () => {
  const response = await api.get('/containers');
  return response.data;
};

export const createContainer = async (name) => {
  const response = await api.post('/containers', { name });
  return response.data;
};

export const updateContainer = async (containerId, name) => {
  const response = await api.put(`/containers/${containerId}`, { name });
  return response.data;
};

export const deleteContainer = async (containerId) => {
  const response = await api.delete(`/containers/${containerId}`);
  return response.data;
};

// Objects in containers
export const fetchContainerObjects = async (containerId) => {
  const response = await api.get(`/containers/${containerId}/objects`);
  return response.data;
};

export const createContainerObject = async (containerId, objectData) => {
  const response = await api.post(`/containers/${containerId}/objects`, objectData);
  return response.data;
};

export const updateContainerObject = async (containerId, objectId, objectData) => {
  const response = await api.put(`/containers/${containerId}/objects/${objectId}`, objectData);
  return response.data;
};

export const deleteContainerObject = async (containerId, objectId) => {
  const response = await api.delete(`/containers/${containerId}/objects/${objectId}`);
  return response.data;
};

// Stats
export const fetchStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

export const fetchContainerStats = async (containerId) => {
  const response = await api.get(`/containers/${containerId}/stats`);
  return response.data;
};

// Snapshots
export const fetchSnapshots = async () => {
  const response = await api.get('/snapshots');
  return response.data;
};

export const createSnapshot = async () => {
  const response = await api.post('/snapshots');
  return response.data;
};

export const compareWithLatestSnapshot = async () => {
  const response = await api.get('/snapshots/latest/compare');
  return response.data;
};

export const compareWithSnapshot = async (snapshotId) => {
  const response = await api.get(`/snapshots/compare/${snapshotId}`);
  return response.data;
};

export const deleteSnapshot = async (snapshotId) => {
  const response = await api.delete(`/snapshots/${snapshotId}`);
  return response.data;
};

