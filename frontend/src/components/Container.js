import React, { useState, useEffect, useCallback } from 'react';
import './Container.css';
import ObjectsList from './ObjectsList';
import ObjectModal from './ObjectModal';
import ContractorSelectionModal from './ContractorSelectionModal';
import ContractorModal from './ContractorModal';
import Tooltip from './Tooltip';
import SummaryCards from './SummaryCards';
import ConfirmModal from './ConfirmModal';
import {
  fetchContainerObjects,
  createContainerObject,
  updateContainerObject,
  deleteContainerObject,
  fetchContainerStats,
  updateContainer,
  deleteContainer
} from '../services/api-containers';

const Container = ({ container, onUpdate, isAuthenticated = false, openObjectId = null, onObjectOpened, highlightCriticalOnOpen = false }) => {
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
  const [contractorSelectionModalOpen, setContractorSelectionModalOpen] = useState(false);
  const [contractorModalOpen, setContractorModalOpen] = useState(false);
  const [editingObject, setEditingObject] = useState(null);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(container.name);
  const [isSelected, setIsSelected] = useState(false);
  const [confirmDeleteContainer, setConfirmDeleteContainer] = useState(false);

  useEffect(() => {
    loadData();
  }, [container.id]);

  const [highlightCritical, setHighlightCritical] = useState(false);

  // Открытие объекта по ID из AlertsPanel
  useEffect(() => {
    if (openObjectId && objects.length > 0) {
      const objectToOpen = objects.find(obj => obj.id === openObjectId);
      if (objectToOpen) {
        setEditingObject({ ...objectToOpen, containerId: container.id, id: objectToOpen.id });
        setContractorSelectionModalOpen(true);
        setHighlightCritical(highlightCriticalOnOpen);
        if (onObjectOpened) {
          onObjectOpened();
        }
      }
    }
  }, [openObjectId, objects, container.id, onObjectOpened, highlightCriticalOnOpen]);

  // Обработчик клавиши Delete для удаления контейнера
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (!isAuthenticated) return;
      // Если открыто модальное окно объекта - не обрабатываем Delete на уровне контейнера
      if (modalOpen) return;
      // Если открыто любое модальное окно подтверждения - не обрабатываем Delete
      if (confirmDeleteContainer) return;
      
      if (e.key === 'Delete' && isSelected && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        // Проверяем, не в поле ввода ли мы
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        setConfirmDeleteContainer(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, isSelected, modalOpen, confirmDeleteContainer]);

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
    setEditingObject({ ...object, containerId: container.id, id: object.id });
    setContractorSelectionModalOpen(true);
    setHighlightCritical(false); // Обычное открытие - без подсветки
  };

  const handleSaveObject = async (objectData) => {
    try {
      if (editingObject && editingObject.id) {
        await updateContainerObject(container.id, editingObject.id, objectData);
      } else {
        await createContainerObject(container.id, objectData);
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

  const handleDeleteObject = async (objectId) => {
    if (!objectId) {
      return;
    }
    try {
      await deleteContainerObject(container.id, objectId);
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
    setContractorSelectionModalOpen(false);
    setContractorModalOpen(false);
    setEditingObject(null);
    setSelectedContractor(null);
    setHighlightCritical(false);
  };

  const handleCloseContractorSelection = () => {
    setContractorSelectionModalOpen(false);
    setEditingObject(null);
  };

  const handleSelectContractor = (contractor) => {
    setSelectedContractor(contractor);
    setContractorSelectionModalOpen(false);
    setContractorModalOpen(true);
  };

  const handleAddContractor = async (updatedContractors) => {
    // Обновляем объект с новыми подрядчиками
    if (editingObject) {
      const updatedObject = {
        ...editingObject,
        contractors: updatedContractors
      };
      setEditingObject(updatedObject);
      
      // Обновляем объект в списке, чтобы карточка показывала актуальную статистику
      setObjects(prevObjects => 
        prevObjects.map(obj => 
          obj.id === editingObject.id ? updatedObject : obj
        )
      );
    }
  };

  const handleSaveObjectFromSelection = async (objectData) => {
    if (!editingObject || !editingObject.id) return;
    
    try {
      const savedObject = await updateContainerObject(container.id, editingObject.id, objectData);
      // Обновляем объект в состоянии, чтобы модальное окно показывало актуальные данные
      setEditingObject(savedObject);
      // Обновляем объект в списке, чтобы карточка показывала актуальную статистику
      setObjects(prevObjects => 
        prevObjects.map(obj => 
          obj.id === editingObject.id ? savedObject : obj
        )
      );
      // Не перезагружаем все данные при автосохранении, только при ручном сохранении
      // await loadData();
      if (onUpdate) onUpdate();
      
      // Возвращаем сохраненный объект, чтобы модальное окно могло обновить свое состояние
      return savedObject;
    } catch (error) {
      console.error('Error saving object:', error);
      // При автосохранении не показываем alert, чтобы не мешать пользователю
      throw error; // Пробрасываем ошибку, чтобы вызывающий код мог обработать
    }
  };

  const handleObjectUpdated = (updatedObject) => {
    // Обновляем editingObject после синхронизации с Айконой
    setEditingObject(updatedObject);
    // Обновляем объект в списке
    setObjects(prevObjects => 
      prevObjects.map(obj => 
        obj.id === updatedObject.id ? updatedObject : obj
      )
    );
    // Перезагружаем данные для обновления статистики
    loadData();
    if (onUpdate) onUpdate();
  };

  const handleSaveContractor = async (contractorData) => {
    if (!editingObject || !selectedContractor) return;

    try {
      // Обновляем подрядчика в новой структуре (buildings -> sections -> contractors[])
      const buildingId = selectedContractor._buildingId;
      const sectionId = selectedContractor._sectionId;
      const contractorId = selectedContractor.id;

      let updatedBuildings;
      if (editingObject.buildings && Array.isArray(editingObject.buildings)) {
        updatedBuildings = editingObject.buildings.map(building => {
          if (building.id === buildingId) {
            return {
              ...building,
              sections: building.sections.map(section => {
                if (section.id === sectionId) {
                  return {
                    ...section,
                    contractors: (section.contractors || []).map(contractor => 
                      contractor.id === contractorId 
                        ? { ...contractor, ...contractorData }
                        : contractor
                    )
                  };
                }
                return section;
              })
            };
          }
          return building;
        });
      } else {
        // Миграция старой структуры
        updatedBuildings = [{
          id: 1,
          name: editingObject.building || '1',
          sections: (editingObject.contractors || []).map((contractor, index) => ({
            id: index + 1,
            name: contractor.workType || `Секция ${index + 1}`,
            contractors: contractor.id === selectedContractor.id 
              ? [{ ...contractor, ...contractorData }]
              : [contractor]
          }))
        }];
      }

      const updatedObject = {
        ...editingObject,
        buildings: updatedBuildings
      };

      // Сохраняем объект
      await updateContainerObject(container.id, editingObject.id, updatedObject);
      
      // Обновляем editingObject для отображения
      setEditingObject(updatedObject);
      
      setContractorModalOpen(false);
      setSelectedContractor(null);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving contractor:', error);
      alert('Ошибка сохранения подрядчика');
    }
  };

  const handleCloseContractorModal = () => {
    setContractorModalOpen(false);
    setSelectedContractor(null);
    // Возвращаемся к выбору подрядчика
    setContractorSelectionModalOpen(true);
  };

  const handleDoubleClickName = () => {
    if (!isAuthenticated) return;
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


  const handleDeleteContainer = useCallback(() => {
    setConfirmDeleteContainer(true);
  }, []);

  const handleConfirmDeleteContainer = async () => {
    try {
      const containerId = parseInt(container.id, 10);
      if (isNaN(containerId)) {
        alert('Ошибка: некорректный ID контейнера');
        return;
      }
      await deleteContainer(containerId);
      setIsSelected(false);
      setConfirmDeleteContainer(false);
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
          <Tooltip text={isAuthenticated ? "Двойной клик для переименования" : ""}>
            <h2
              className={isAuthenticated ? "container-title" : "container-title"}
              onDoubleClick={handleDoubleClickName}
              style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
            >
              {container.name} ({objects.length})
            </h2>
          </Tooltip>
        )}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn-toggle-stats"
            onClick={(e) => {
              e.stopPropagation();
              setStatsExpanded(!statsExpanded);
            }}
          >
            <i className={`fas fa-chevron-${statsExpanded ? 'up' : 'down'}`}></i>
            {statsExpanded ? 'Скрыть статистику' : 'Показать статистику'}
          </button>
          {isAuthenticated && (
            <button className="btn" onClick={handleAddObject}>
              <i className="fas fa-plus"></i> Добавить объект
            </button>
          )}
        </div>
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

      {/* Модальное окно выбора подрядчика */}
      {contractorSelectionModalOpen && editingObject && (
        <ContractorSelectionModal
          object={editingObject}
          onSelectContractor={handleSelectContractor}
          onClose={handleCloseContractorSelection}
          isAuthenticated={isAuthenticated}
          onAddContractor={handleAddContractor}
          onSaveObject={handleSaveObjectFromSelection}
          onObjectUpdated={handleObjectUpdated}
        />
      )}

      {/* Модальное окно подрядчика */}
      {contractorModalOpen && selectedContractor && editingObject && (
        <ContractorModal
          contractor={selectedContractor}
          object={editingObject}
          onSave={handleSaveContractor}
          onClose={handleCloseContractorModal}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Старое модальное окно объекта (для создания новых объектов) */}
      {modalOpen && (
        <ObjectModal
          object={editingObject}
          onSave={handleSaveObject}
          onDelete={handleDeleteObject}
          onClose={handleCloseModal}
          isAuthenticated={isAuthenticated}
          highlightCritical={highlightCritical}
        />
      )}

      {/* Модальное окно подтверждения удаления контейнера */}
      <ConfirmModal
        isOpen={confirmDeleteContainer}
        title="Подтверждение удаления контейнера"
        message={`Внимание! Вы уверены, что хотите удалить контейнер "${container.name}"? Все объекты внутри контейнера также будут удалены. Это действие нельзя отменить.`}
        onConfirm={handleConfirmDeleteContainer}
        onCancel={() => setConfirmDeleteContainer(false)}
        confirmText="Да, удалить"
        cancelText="Отмена"
        type="danger"
      />

    </div>
  );
};

export default Container;

