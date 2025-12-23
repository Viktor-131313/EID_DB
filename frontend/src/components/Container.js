import React, { useState, useEffect } from 'react';
import './Container.css';
import ObjectsList from './ObjectsList';
import ObjectModal from './ObjectModal';
import SummaryCards from './SummaryCards';
import {
  fetchContainerObjects,
  createContainerObject,
  updateContainerObject,
  deleteContainerObject,
  fetchContainerStats,
  updateContainer,
  deleteContainer
} from '../services/api-containers';

const Container = ({ container, onUpdate }) => {
  const [objects, setObjects] = useState([]);
  const [stats, setStats] = useState({
    totalObjects: 0,
    generatedActs: 0,
    sentActs: 0,
    approvedActs: 0,
    rejectedActs: 0
  });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingObject, setEditingObject] = useState(null);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(container.name);
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    loadData();
  }, [container.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [objectsData, statsData] = await Promise.all([
        fetchContainerObjects(container.id),
        fetchContainerStats(container.id)
      ]);
      setObjects(objectsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading container data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddObject = () => {
    setEditingObject(null);
    setModalOpen(true);
  };

  const handleEditObject = (object) => {
    setEditingObject({ ...object, containerId: container.id });
    setModalOpen(true);
  };

  const handleSaveObject = async (objectData) => {
    try {
      console.log('Saving object data:', objectData);
      console.log('Blocking factors being saved:', objectData.blockingFactors);
      if (editingObject && editingObject.id) {
        const result = await updateContainerObject(container.id, editingObject.id, objectData);
        console.log('Object updated:', result);
        console.log('Blocking factors in updated object:', result.blockingFactors);
      } else {
        const result = await createContainerObject(container.id, objectData);
        console.log('Object created:', result);
        console.log('Blocking factors in created object:', result.blockingFactors);
      }
      setModalOpen(false);
      setEditingObject(null);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving object:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.message || 'Ошибка сохранения объекта';
      alert(errorMessage);
      // Не закрываем модальное окно при ошибке
      return;
    }
  };

  const handleDeleteObject = async () => {
    if (!editingObject || !editingObject.id) {
      return;
    }

    if (!window.confirm('Вы уверены, что хотите удалить этот объект?')) {
      return;
    }

    try {
      await deleteContainerObject(container.id, editingObject.id);
      setModalOpen(false);
      setEditingObject(null);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting object:', error);
      alert('Ошибка удаления объекта');
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingObject(null);
  };

  const handleDoubleClickName = () => {
    setIsEditingName(true);
  };

  const handleNameKeyPress = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      try {
        await updateContainer(container.id, editingName);
        setIsEditingName(false);
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('Error updating container name:', error);
        alert('Ошибка обновления названия контейнера');
      }
    } else if (e.key === 'Escape') {
      setEditingName(container.name);
      setIsEditingName(false);
    }
  };

  const handleNameBlur = async () => {
    if (editingName !== container.name) {
      try {
        await updateContainer(container.id, editingName);
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('Error updating container name:', error);
        setEditingName(container.name);
      }
    }
    setIsEditingName(false);
  };

  useEffect(() => {
    setEditingName(container.name);
  }, [container.name]);

  const handleContainerClick = (e) => {
    // Не выделяем если клик по заголовку (для редактирования) или по кнопкам
    if (e.target.closest('.container-title') || e.target.closest('button') || e.target.closest('input')) {
      return;
    }
    setIsSelected(true);
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Delete' && isSelected && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      // Проверяем, не в поле ввода ли мы
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      handleDeleteContainer();
    }
  };

  const handleDeleteContainer = async () => {
    if (!window.confirm(`Внимание! Вы уверены, что хотите удалить контейнер "${container.name}"? Все объекты внутри контейнера также будут удалены. Это действие нельзя отменить.`)) {
      return;
    }
    try {
      const containerId = parseInt(container.id, 10);
      if (isNaN(containerId)) {
        alert('Ошибка: некорректный ID контейнера');
        return;
      }
      await deleteContainer(containerId);
      setIsSelected(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting container:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Ошибка при удалении контейнера';
      alert(`Ошибка при удалении контейнера: ${errorMessage}`);
    }
  };

  useEffect(() => {
    if (isSelected) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.container-section')) {
          setIsSelected(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isSelected]);

  return (
    <div 
      className={`container-section ${isSelected ? 'container-selected' : ''}`}
      onClick={handleContainerClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="container-header">
        {isEditingName ? (
          <input
            type="text"
            className="container-name-input"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={handleNameKeyPress}
            onBlur={handleNameBlur}
            autoFocus
          />
        ) : (
          <h2
            className="container-title"
            onDoubleClick={handleDoubleClickName}
            title="Двойной клик для переименования"
          >
            {container.name} ({objects.length})
          </h2>
        )}
        <button className="btn" onClick={handleAddObject}>
          <i className="fas fa-plus"></i> Добавить объект
        </button>
      </div>

      {statsExpanded && (
        <div className="container-stats">
          <SummaryCards stats={stats} />
        </div>
      )}

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <ObjectsList objects={objects} onEditObject={handleEditObject} />
      )}

      <div className="container-footer">
        <button
          className="btn-toggle-stats"
          onClick={() => setStatsExpanded(!statsExpanded)}
        >
          <i className={`fas fa-chevron-${statsExpanded ? 'up' : 'down'}`}></i>
          {statsExpanded ? 'Скрыть статистику' : 'Показать статистику'}
        </button>
      </div>

      {modalOpen && (
        <ObjectModal
          object={editingObject}
          onSave={handleSaveObject}
          onDelete={editingObject && editingObject.id ? handleDeleteObject : null}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default Container;

