import React, { useState, useEffect } from 'react';
import './ContractorSelectionModal.css';
import Tooltip from './Tooltip';
import { syncObjectFromAikona } from '../services/api-containers';
import { calculateDetailedLag } from '../utils/performanceMetrics';

const ContractorSelectionModal = ({ object, onSelectContractor, onClose, isAuthenticated = false, onAddContractor, onSaveObject, onObjectUpdated }) => {
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [syncingAikona, setSyncingAikona] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialBuildings, setInitialBuildings] = useState([]);
  
  // Состояния для редактирования объекта
  const [objectData, setObjectData] = useState({
    name: '',
    queue: '',
    photo: null,
    aikonaObjectId: null,
    status: ''
  });

  useEffect(() => {
    // Инициализируем корпуса из объекта
    let initialBuildingsData = [];
    if (object && object.buildings && Array.isArray(object.buildings)) {
      initialBuildingsData = object.buildings;
      setBuildings(object.buildings);
    } else if (object && object.contractors && Array.isArray(object.contractors)) {
      // Миграция старой структуры: создаем один корпус с секциями из подрядчиков
      // Группируем подрядчиков по секциям (если есть поле section в contractor)
      const sectionsMap = new Map();
      object.contractors.forEach((contractor, index) => {
        const sectionName = contractor.section || contractor.workType || `Секция ${index + 1}`;
        if (!sectionsMap.has(sectionName)) {
          sectionsMap.set(sectionName, []);
        }
        sectionsMap.get(sectionName).push(contractor);
      });
      
      initialBuildingsData = [{
        id: 1,
        name: object.building || '1',
        sections: Array.from(sectionsMap.entries()).map(([sectionName, contractors], index) => ({
          id: index + 1,
          name: sectionName,
          contractors: contractors
        }))
      }];
      setBuildings(initialBuildingsData);
    } else {
      setBuildings([]);
    }
    
    // Сохраняем начальное состояние для отслеживания изменений
    setInitialBuildings(JSON.parse(JSON.stringify(initialBuildingsData)));
    setHasUnsavedChanges(false);
    
    // Инициализируем данные объекта
    if (object) {
      setObjectData({
        name: object.name || '',
        queue: object.queue || '',
        photo: object.photo || null,
        aikonaObjectId: object.aikonaObjectId || null,
        status: object.status || ''
      });
    }
  }, [object]);

  // Подсчет общей статистики по объекту (по всем подрядчикам всех секций всех корпусов)
  const calculateTotalStats = () => {
    let totalGenerated = 0;
    let totalSent = 0;
    let totalApproved = 0;
    let totalRejected = 0;
    let totalSigned = 0;

    buildings.forEach(building => {
      if (building.sections && Array.isArray(building.sections)) {
        building.sections.forEach(section => {
          if (section.contractors && Array.isArray(section.contractors)) {
            section.contractors.forEach(contractor => {
              if (contractor.generatedActs) {
                contractor.generatedActs.forEach(smr => {
                  totalGenerated += smr.count || 0;
                });
              }
              if (contractor.sentForApproval) {
                contractor.sentForApproval.forEach(smr => {
                  totalSent += smr.count || 0;
                });
              }
              if (contractor.approvedActs) {
                contractor.approvedActs.forEach(smr => {
                  totalApproved += smr.count || 0;
                });
              }
              if (contractor.rejectedActs) {
                contractor.rejectedActs.forEach(smr => {
                  totalRejected += smr.count || 0;
                });
              }
              if (contractor.signedActs) {
                contractor.signedActs.forEach(smr => {
                  totalSigned += smr.count || 0;
                });
              }
            });
          }
        });
      }
    });

    const total = totalGenerated;
    const readiness = total > 0 ? Math.round((totalGenerated / total) * 100) : 0;

    return {
      totalGenerated,
      totalSent,
      totalApproved,
      totalRejected,
      totalSigned,
      readiness
    };
  };

  const stats = calculateTotalStats();
  const lagDetails = object ? calculateDetailedLag(object) : [];

  const handleAddBuilding = () => {
    if (!newBuildingName.trim()) {
      alert('Пожалуйста, введите название корпуса');
      return;
    }

    const newBuilding = {
      id: Date.now(),
      name: newBuildingName.trim(),
      sections: []
    };

    const updatedBuildings = [...buildings, newBuilding];
    setBuildings(updatedBuildings);
    setNewBuildingName('');
    setShowAddBuilding(false);
    setSelectedBuildingId(newBuilding.id);
    setHasUnsavedChanges(true);
  };

  const handleDeleteBuilding = (buildingId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот корпус? Все секции и подрядчики в нем будут удалены.')) {
      return;
    }

    const updatedBuildings = buildings.filter(b => b.id !== buildingId);
    setBuildings(updatedBuildings);
    
    // Если удаленный корпус был выбран, сбрасываем выбор
    if (selectedBuildingId === buildingId) {
      setSelectedBuildingId(null);
      setSelectedSectionId(null);
    }
    
    setHasUnsavedChanges(true);
  };

  const handleAddSection = () => {
    if (!selectedBuildingId || !newSectionName.trim()) {
      alert('Пожалуйста, выберите корпус и введите название секции');
      return;
    }

    const updatedBuildings = buildings.map(building => {
      if (building.id === selectedBuildingId) {
        const newSection = {
          id: Date.now(),
          name: newSectionName.trim(),
          contractors: [] // Массив подрядчиков
        };
        return {
          ...building,
          sections: [...(building.sections || []), newSection]
        };
      }
      return building;
    });

    setBuildings(updatedBuildings);
    setNewSectionName('');
    setShowAddSection(false);
    setHasUnsavedChanges(true);
  };

  const handleDeleteContractor = (buildingId, sectionId, contractorId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого подрядчика?')) {
      return;
    }

    const updatedBuildings = buildings.map(building => {
      if (building.id === buildingId) {
        return {
          ...building,
          sections: building.sections.map(section => {
            if (section.id === sectionId) {
              return {
                ...section,
                contractors: (section.contractors || []).filter(c => c.id !== contractorId)
              };
            }
            return section;
          })
        };
      }
      return building;
    });

    setBuildings(updatedBuildings);
    setHasUnsavedChanges(true);
  };

  const handleDeleteSection = (buildingId, sectionId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту секцию? Все подрядчики в ней будут удалены.')) {
      return;
    }

    const updatedBuildings = buildings.map(building => {
      if (building.id === buildingId) {
        return {
          ...building,
          sections: building.sections.filter(s => s.id !== sectionId)
        };
      }
      return building;
    });

    setBuildings(updatedBuildings);
    
    // Если удаленная секция была выбрана, сбрасываем выбор
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
    
    setHasUnsavedChanges(true);
  };

  const handleAddContractorToSection = (buildingId, sectionId) => {
    const contractorName = prompt('Введите название подрядчика:');
    if (!contractorName || !contractorName.trim()) return;

    const workType = prompt('Введите вид работ:');
    if (!workType || !workType.trim()) return;

    const newContractor = {
      id: Date.now(),
      name: contractorName.trim(),
      workType: workType.trim(),
      generatedActs: [],
      sentForApproval: [],
      approvedActs: [],
      rejectedActs: [],
      signedActs: [],
      blockingFactors: []
    };

    const updatedBuildings = buildings.map(building => {
      if (building.id === buildingId) {
        return {
          ...building,
          sections: building.sections.map(section => {
            if (section.id === sectionId) {
              return {
                ...section,
                contractors: [...(section.contractors || []), newContractor]
              };
            }
            return section;
          })
        };
      }
      return building;
    });

    setBuildings(updatedBuildings);
    setHasUnsavedChanges(true);
  };

  const handleSectionClick = (buildingId, sectionId) => {
    // При клике на секцию показываем список подрядчиков или предлагаем добавить
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const section = building.sections.find(s => s.id === sectionId);
    if (!section) return;

    // Если в секции нет подрядчиков, предлагаем добавить
    if (!section.contractors || section.contractors.length === 0) {
      handleAddContractorToSection(buildingId, sectionId);
      return;
    }

    // Если подрядчики есть, можно добавить еще или выбрать существующего
    // Пока просто показываем возможность добавить еще одного
    // В будущем можно добавить список подрядчиков для выбора
  };

  const handleContractorClick = (buildingId, sectionId, contractor) => {
    // Проверяем наличие несохраненных изменений
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm('У вас есть несохраненные изменения. Сохранить их перед переходом к подрядчику? Если выберете "Отмена", изменения будут потеряны.');
      if (shouldSave) {
        // Сохраняем перед переходом
        handleSaveObjectClick().then(() => {
          proceedToContractor(buildingId, sectionId, contractor);
        }).catch(() => {
          // Если сохранение не удалось, спрашиваем еще раз
          const proceedAnyway = window.confirm('Не удалось сохранить изменения. Перейти к подрядчику без сохранения? Изменения будут потеряны.');
          if (proceedAnyway) {
            proceedToContractor(buildingId, sectionId, contractor);
          }
        });
        return;
      } else {
        // Пользователь решил не сохранять - предупреждаем
        const proceedAnyway = window.confirm('Вы уверены? Все несохраненные изменения будут потеряны.');
        if (!proceedAnyway) {
          return;
        }
      }
    }
    
    proceedToContractor(buildingId, sectionId, contractor);
  };

  const proceedToContractor = (buildingId, sectionId, contractor) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const section = building.sections.find(s => s.id === sectionId);
    if (!section) return;

    // Открываем модальное окно подрядчика
    if (onSelectContractor) {
      onSelectContractor({
        ...contractor,
        _buildingId: buildingId,
        _sectionId: sectionId,
        _buildingName: building.name,
        _sectionName: section.name
      });
    }
  };

  // Обработка закрытия модального окна с проверкой несохраненных изменений
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm('У вас есть несохраненные изменения. Сохранить их перед закрытием? Если выберете "Отмена", изменения будут потеряны.');
      if (shouldSave) {
        handleSaveObjectClick().then(() => {
          onClose();
        }).catch(() => {
          // Если сохранение не удалось, спрашиваем еще раз
          const closeAnyway = window.confirm('Не удалось сохранить изменения. Закрыть окно без сохранения? Изменения будут потеряны.');
          if (closeAnyway) {
            onClose();
          }
        });
        return;
      } else {
        // Пользователь решил не сохранять - предупреждаем
        const closeAnyway = window.confirm('Вы уверены? Все несохраненные изменения будут потеряны.');
        if (!closeAnyway) {
          return;
        }
      }
    }
    onClose();
  };

  const handleObjectFieldChange = (field, value) => {
    setObjectData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveObjectClick = async () => {
    if (!onSaveObject) return;
    
    try {
      const savedObject = await onSaveObject({
        ...object,
        ...objectData,
        buildings: buildings
      });
      
      // Обновляем начальное состояние после сохранения
      if (savedObject && savedObject.buildings) {
        setInitialBuildings(JSON.parse(JSON.stringify(savedObject.buildings)));
      } else {
        setInitialBuildings(JSON.parse(JSON.stringify(buildings)));
      }
      setHasUnsavedChanges(false);
      alert('Объект успешно сохранен');
      return savedObject;
    } catch (error) {
      console.error('Error saving object:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Ошибка сохранения объекта';
      alert(errorMessage);
      throw error;
    }
  };

  const handleSyncAikona = async () => {
    if (!object || !object.containerId || !objectData.aikonaObjectId) {
      alert('Необходимо указать ID объекта в Айконе');
      return;
    }

    setSyncingAikona(true);
    try {
      const updatedObject = await syncObjectFromAikona(object.containerId, object.id);
      
      console.log('[ContractorSelectionModal] handleSyncAikona: получен обновленный объект', updatedObject);
      console.log('[ContractorSelectionModal] handleSyncAikona: buildings в обновленном объекте', updatedObject.buildings);
      
      // Обновляем данные объекта
      setObjectData(prev => ({
        ...prev,
        aikonaObjectId: updatedObject.aikonaObjectId || prev.aikonaObjectId
      }));
      
      // Обновляем buildings из обновленного объекта
      if (updatedObject.buildings && Array.isArray(updatedObject.buildings)) {
        console.log('[ContractorSelectionModal] handleSyncAikona: обновляем buildings, количество:', updatedObject.buildings.length);
        setBuildings(updatedObject.buildings);
        setInitialBuildings(JSON.parse(JSON.stringify(updatedObject.buildings)));
      }
      
      // Обновляем editingObject в родительском компоненте
      if (onObjectUpdated) {
        // Обновляем объект в родительском компоненте
        onObjectUpdated({
          ...object,
          ...updatedObject,
          buildings: updatedObject.buildings || buildings
        });
      } else if (onSaveObject) {
        // Если нет onObjectUpdated, используем onSaveObject
        await onSaveObject({
          ...object,
          ...updatedObject,
          buildings: updatedObject.buildings || buildings
        });
      }
      
      alert('Данные успешно синхронизированы из Айконы');
    } catch (error) {
      console.error('Error syncing from Aikona:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Ошибка синхронизации';
      alert(errorMessage);
    } finally {
      setSyncingAikona(false);
    }
  };

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);
  const selectedSection = selectedBuilding?.sections.find(s => s.id === selectedSectionId);

  return (
    <div className="contractor-selection-modal-backdrop" onClick={handleClose}>
      <div className="contractor-selection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {objectData.name || 'Редактирование объекта'}
            {hasUnsavedChanges && (
              <span style={{ marginLeft: '10px', color: '#ff9800', fontSize: '14px', fontWeight: 'normal' }}>
                (есть несохраненные изменения)
              </span>
            )}
          </h2>
          <button className="modal-close" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {/* Редактирование основных полей объекта */}
          <div className="object-edit-section">
            <h3>Основная информация</h3>

            {/* Фото объекта */}
            <div className="form-group">
              {objectData.photo ? (
                <div className="photo-preview-container">
                  <div className="photo-preview-wrapper">
                    <img src={objectData.photo} alt="Объект" className="photo-preview" />
                    {isAuthenticated && (
                      <div className="photo-controls">
                        <Tooltip text="Изменить фото" position="bottom">
                          <button
                            type="button"
                            className="btn-change-photo"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/jpeg,image/jpg,image/png';
                              input.onchange = (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    handleObjectFieldChange('photo', reader.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              };
                              input.click();
                            }}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                        </Tooltip>
                        <Tooltip text="Удалить фото" position="bottom">
                          <button
                            type="button"
                            className="btn-remove-photo"
                            onClick={() => handleObjectFieldChange('photo', null)}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                isAuthenticated && (
                  <>
                    <label className="form-label">Фото объекта (JPEG/PNG)</label>
                    <div className="photo-upload-container">
                      <label className="photo-upload-label">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                handleObjectFieldChange('photo', reader.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        <div className="photo-upload-placeholder">
                          <i className="fas fa-camera"></i>
                          <span>Нажмите для загрузки фото</span>
                        </div>
                      </label>
                    </div>
                  </>
                )
              )}
            </div>

            {/* Название объекта */}
            <div className="form-group">
              <label className="form-label" htmlFor="objectName">Название объекта</label>
              <input
                type="text"
                className="form-input"
                id="objectName"
                value={objectData.name}
                onChange={(e) => handleObjectFieldChange('name', e.target.value)}
                placeholder="Например: Парадный ансамбль"
                readOnly={!isAuthenticated}
                style={!isAuthenticated ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
              />
            </div>

            {/* Очередь */}
            <div className="form-group">
              <label className="form-label" htmlFor="objectQueue">Очередь</label>
              <input
                type="text"
                className="form-input"
                id="objectQueue"
                value={objectData.queue}
                onChange={(e) => handleObjectFieldChange('queue', e.target.value)}
                placeholder="Например: 8"
                readOnly={!isAuthenticated}
                style={!isAuthenticated ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
              />
            </div>

            {/* ID объекта в Айконе */}
            <div className="form-group">
              <label className="form-label" htmlFor="aikonaObjectId">
                ID объекта в Айконе
                {isAuthenticated && (
                  <span style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={handleSyncAikona}
                      disabled={syncingAikona || !objectData.aikonaObjectId}
                      style={{
                        padding: '6px 12px',
                        fontSize: '14px',
                        backgroundColor: syncingAikona ? '#95a5a6' : '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: syncingAikona || !objectData.aikonaObjectId ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {syncingAikona ? (
                        <>
                          <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                          Загрузка...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-sync-alt" style={{ marginRight: '6px' }}></i>
                          Забрать данные
                        </>
                      )}
                    </button>
                  </span>
                )}
              </label>
              <input
                type="number"
                className="form-input"
                id="aikonaObjectId"
                value={objectData.aikonaObjectId || ''}
                onChange={(e) => handleObjectFieldChange('aikonaObjectId', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Например: 401"
                min="1"
                readOnly={!isAuthenticated}
                style={!isAuthenticated ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
              />
            </div>

            {/* Статус */}
            <div className="form-group">
              <label className="form-label" htmlFor="objectStatus">Статус</label>
              <textarea
                className="form-textarea form-textarea-auto-resize"
                id="objectStatus"
                value={objectData.status}
                onChange={(e) => handleObjectFieldChange('status', e.target.value)}
                placeholder="Введите статус объекта..."
                rows={1}
                readOnly={!isAuthenticated}
                style={!isAuthenticated ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
              />
            </div>

            {isAuthenticated && (
              <div className="form-group">
                <button type="button" className="btn-save-object" onClick={handleSaveObjectClick}>
                  Сохранить изменения объекта
                </button>
              </div>
            )}
          </div>

          {/* Общая статистика по объекту */}
          <div className="object-total-stats">
            <h3>Общая статистика по объекту</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Сгенерировано актов</div>
                <div className="stat-value">{stats.totalGenerated}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Отправлено на согласование</div>
                <div className="stat-value">{stats.totalSent}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Согласовано</div>
                <div className="stat-value">{stats.totalApproved}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Отклонено</div>
                <div className="stat-value">{stats.totalRejected}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Подписано</div>
                <div className="stat-value">{stats.totalSigned}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Готовность</div>
                <div className="stat-value">{stats.readiness}%</div>
              </div>
            </div>
          </div>

          {/* Детали отставания */}
          {lagDetails.length > 0 && (
            <div className="lag-details-section">
              <h3>
                <i className="fas fa-exclamation-circle"></i> Детали отставания
              </h3>
              <div className="lag-details-list">
                {lagDetails.map((detail, index) => (
                  <div key={index} className="lag-detail-item-modal">
                    <span className="lag-detail-marker">
                      <i className="fas fa-map-marker-alt"></i>
                    </span>
                    <span className="lag-detail-info">
                      {detail.buildingName && (
                        <span className="lag-building">Корпус {detail.buildingName}</span>
                      )}
                      {detail.sectionName && (
                        <span className="lag-section"> → Секция {detail.sectionName}</span>
                      )}
                      <span className="lag-contractor"> → {detail.contractorName}</span>
                      {detail.contractorWorkType && (
                        <span className="lag-worktype"> ({detail.contractorWorkType})</span>
                      )}
                    </span>
                    <span className="lag-detail-count">{detail.lag} актов</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Управление корпусами и секциями */}
          <div className="buildings-section">
            <div className="buildings-header">
              <h3>Корпуса и секции</h3>
              {isAuthenticated && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddBuilding(true)}
                >
                  <i className="fas fa-plus"></i> Добавить корпус
                </button>
              )}
            </div>

            {/* Форма добавления корпуса */}
            {showAddBuilding && isAuthenticated && (
              <div className="add-building-form">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Название корпуса (например: 1)"
                  value={newBuildingName}
                  onChange={(e) => setNewBuildingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddBuilding();
                    } else if (e.key === 'Escape') {
                      setShowAddBuilding(false);
                      setNewBuildingName('');
                    }
                  }}
                  autoFocus
                />
                <button className="btn btn-primary" onClick={handleAddBuilding}>
                  Добавить
                </button>
                <button className="btn btn-secondary" onClick={() => {
                  setShowAddBuilding(false);
                  setNewBuildingName('');
                }}>
                  Отмена
                </button>
              </div>
            )}

            {/* Список корпусов */}
            {buildings.length > 0 && (
              <div className="buildings-list">
                {buildings.map(building => {
                  // Вычисляем отставание для корпуса
                  let buildingLag = 0;
                  if (building.sections && Array.isArray(building.sections)) {
                    building.sections.forEach(section => {
                      if (section.contractors && Array.isArray(section.contractors)) {
                        section.contractors.forEach(contractor => {
                          if (contractor.generatedActs && Array.isArray(contractor.generatedActs)) {
                            const contractorGenerated = contractor.generatedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
                            const contractorGeneratedTotal = contractor.generatedActs.reduce((sum, smr) => sum + (smr.total || 0), 0);
                            buildingLag += contractorGeneratedTotal - contractorGenerated;
                          }
                        });
                      }
                    });
                  }
                  
                  return (
                  <div 
                    key={building.id} 
                    className={`building-item ${selectedBuildingId === building.id ? 'building-item-selected' : ''} ${buildingLag > 0 ? 'building-with-lag' : ''}`}
                    onClick={() => {
                      setSelectedBuildingId(building.id);
                      setSelectedSectionId(null);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="building-item-header">
                      <span className="building-name">Корпус {building.name}</span>
                      {isAuthenticated && (
                        <div className="building-actions">
                          <button
                            className="btn btn-danger btn-small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBuilding(building.id);
                            }}
                            title="Удалить корпус"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      )}
                    </div>
                    {building.sections && building.sections.length > 0 && (
                      <div className="building-sections-count">
                        Секций: {building.sections.length}
                      </div>
                    )}
                    {buildingLag > 0 && (
                      <div className="building-lag-indicator">
                        <i className="fas fa-exclamation-triangle"></i> Отставание: {buildingLag} актов
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}

            {/* Управление секциями выбранного корпуса */}
            {selectedBuilding && (
              <div className="sections-section">
                <div className="sections-header">
                  <h4>Секции корпуса {selectedBuilding.name}</h4>
                  {isAuthenticated && (
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowAddSection(true)}
                    >
                      <i className="fas fa-plus"></i> Добавить секцию
                    </button>
                  )}
                </div>

                {/* Форма добавления секции */}
                {showAddSection && isAuthenticated && (
                  <div className="add-section-form">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Название секции (например: 1)"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSection();
                        } else if (e.key === 'Escape') {
                          setShowAddSection(false);
                          setNewSectionName('');
                        }
                      }}
                      autoFocus
                    />
                    <button className="btn btn-primary" onClick={handleAddSection}>
                      Добавить
                    </button>
                    <button className="btn btn-secondary" onClick={() => {
                      setShowAddSection(false);
                      setNewSectionName('');
                    }}>
                      Отмена
                    </button>
                  </div>
                )}

                {/* Выбор секции */}
                {selectedBuilding.sections && selectedBuilding.sections.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Выберите секцию</label>
                    <select
                      className="form-input"
                      value={selectedSectionId || ''}
                      onChange={(e) => {
                        setSelectedSectionId(e.target.value ? parseInt(e.target.value) : null);
                      }}
                    >
                      <option value="">-- Выберите секцию --</option>
                      {selectedBuilding.sections.map(section => (
                        <option key={section.id} value={section.id}>
                          Секция {section.name} ({section.contractors?.length || 0} подрядчиков)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Карточки подрядчиков выбранной секции */}
                {selectedSectionId && selectedBuilding.sections && selectedBuilding.sections.length > 0 && (() => {
                  const selectedSection = selectedBuilding.sections.find(s => s.id === selectedSectionId);
                  if (!selectedSection) return null;
                  
                  const contractors = selectedSection.contractors || [];
                  const hasContractors = contractors.length > 0;
                  
                  // Подсчет статистики по всем подрядчикам секции
                  let sectionGenerated = 0;
                  let sectionSent = 0;
                  let sectionApproved = 0;
                  let sectionRejected = 0;
                  let sectionSigned = 0;
                  
                  contractors.forEach(contractor => {
                    sectionGenerated += contractor.generatedActs?.reduce((sum, smr) => sum + (smr.count || 0), 0) || 0;
                    sectionSent += contractor.sentForApproval?.reduce((sum, smr) => sum + (smr.count || 0), 0) || 0;
                    sectionApproved += contractor.approvedActs?.reduce((sum, smr) => sum + (smr.count || 0), 0) || 0;
                    sectionRejected += contractor.rejectedActs?.reduce((sum, smr) => sum + (smr.count || 0), 0) || 0;
                    sectionSigned += contractor.signedActs?.reduce((sum, smr) => sum + (smr.count || 0), 0) || 0;
                  });
                  
                  return (
                    <div className="selected-section-view">
                      <div className="selected-section-header">
                        <h4>Секция {selectedSection.name}</h4>
                        {isAuthenticated && (
                          <button
                            className="btn btn-primary btn-small"
                            onClick={() => handleAddContractorToSection(selectedBuilding.id, selectedSection.id)}
                          >
                            <i className="fas fa-plus"></i> Добавить подрядчика
                          </button>
                        )}
                      </div>
                      
                      {/* Список подрядчиков в секции */}
                      {hasContractors ? (
                        <div className="section-contractors-list">
                          {contractors.map(contractor => (
                            <div
                              key={contractor.id}
                              className="contractor-item"
                              onClick={() => handleContractorClick(selectedBuilding.id, selectedSection.id, contractor)}
                            >
                              <div className="contractor-item-header">
                                <span className="contractor-name">{contractor.name}</span>
                                <span className="contractor-work-type">{contractor.workType}</span>
                                {isAuthenticated && (
                                  <button
                                    className="btn btn-danger btn-tiny"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteContractor(selectedBuilding.id, selectedSection.id, contractor.id);
                                    }}
                                    title="Удалить подрядчика"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                )}
                              </div>
                              <div className="contractor-item-stats">
                                {(() => {
                                  const contractorGenerated = contractor.generatedActs?.reduce((sum, smr) => sum + (smr.count || 0), 0) || 0;
                                  const contractorGeneratedTotal = contractor.generatedActs?.reduce((sum, smr) => sum + (smr.total || 0), 0) || 0;
                                  const contractorLag = contractorGeneratedTotal - contractorGenerated;
                                  return (
                                    <>
                                      <span>Сгенерировано: {contractorGenerated} из {contractorGeneratedTotal}</span>
                                      <span>Отправлено: {contractor.sentForApproval?.reduce((sum, smr) => sum + (smr.count || 0), 0) || 0}</span>
                                      <span>Согласовано: {contractor.approvedActs?.reduce((sum, smr) => sum + (smr.count || 0), 0) || 0}</span>
                                      {contractorLag > 0 && (
                                        <span className="contractor-lag-marker">
                                          <i className="fas fa-exclamation-triangle"></i> Отставание: {contractorLag} актов
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-contractors-message">
                          {isAuthenticated 
                            ? 'Нажмите "Добавить подрядчика" для создания первого подрядчика в этой секции'
                            : 'В этой секции нет подрядчиков'}
                        </div>
                      )}
                      
                      {/* Общая статистика секции */}
                      {hasContractors && (
                        <div className="section-total-stats">
                          <div className="section-stat">
                            <span>Всего сгенерировано:</span>
                            <span>{sectionGenerated}</span>
                          </div>
                          <div className="section-stat">
                            <span>Всего отправлено:</span>
                            <span>{sectionSent}</span>
                          </div>
                          <div className="section-stat">
                            <span>Всего согласовано:</span>
                            <span>{sectionApproved}</span>
                          </div>
                          <div className="section-stat">
                            <span>Всего отклонено:</span>
                            <span>{sectionRejected}</span>
                          </div>
                          <div className="section-stat">
                            <span>Всего подписано:</span>
                            <span>{sectionSigned}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={handleClose}
            style={{ marginRight: '10px' }}
          >
            Закрыть
          </button>
          {hasUnsavedChanges && isAuthenticated && (
            <button 
              className="btn btn-primary"
              onClick={handleSaveObjectClick}
              style={{ backgroundColor: '#ff9800' }}
            >
              <i className="fas fa-save"></i> Сохранить изменения
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractorSelectionModal;
