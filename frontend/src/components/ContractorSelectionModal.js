import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ContractorSelectionModal.css';
import Tooltip from './Tooltip';
import ConfirmModal from './ConfirmModal';
import ToastNotification from './ToastNotification';
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
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [editingBuildingId, setEditingBuildingId] = useState(null);
  const [editingBuildingName, setEditingBuildingName] = useState('');
  const [syncingAikona, setSyncingAikona] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialBuildings, setInitialBuildings] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAddContractorModal, setShowAddContractorModal] = useState(false);
  const [newContractorName, setNewContractorName] = useState('');
  const [newContractorWorkType, setNewContractorWorkType] = useState('');
  const [pendingContractorData, setPendingContractorData] = useState(null);
  const [showCopyContractorModal, setShowCopyContractorModal] = useState(false);
  const [contractorToCopy, setContractorToCopy] = useState(null);
  const [selectedSectionsForCopy, setSelectedSectionsForCopy] = useState(new Set()); // Set для хранения выбранных секций в формате "buildingId-sectionId"
  const justSavedRef = useRef(false); // Ref для защиты от закрытия сразу после сохранения (не вызывает ререндер)
  const saveInProgressRef = useRef(false); // Ref для отслеживания процесса сохранения
  
  // Перехватываем onClose, чтобы всегда проверять флаг перед закрытием
  const originalOnCloseRef = useRef(onClose);
  useEffect(() => {
    originalOnCloseRef.current = onClose;
  }, [onClose]);
  
  // Отслеживаем изменения объекта - если объект исчез, возможно модальное окно закрывается извне
  const prevObjectRef = useRef(object);
  useEffect(() => {
    if (prevObjectRef.current && !object && (justSavedRef.current || saveInProgressRef.current)) {
      console.warn('[ContractorSelectionModal] КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ: объект исчез, но только что сохранили!', {
        justSaved: justSavedRef.current,
        saveInProgress: saveInProgressRef.current,
        prevObject: prevObjectRef.current,
        currentObject: object
      });
      // Попытка предотвратить закрытие - но это может не сработать, если родитель уже обновил состояние
    }
    prevObjectRef.current = object;
  }, [object]);
  
  // Логируем все попытки закрытия и состояние toast
  useEffect(() => {
    if (toast) {
      console.log('[ContractorSelectionModal] Toast установлен, проверяю видимость через 100ms');
      setTimeout(() => {
        const toastElement = document.querySelector('.toast-notification');
        if (toastElement) {
          console.log('[ContractorSelectionModal] Toast элемент найден в DOM:', {
            visible: toastElement.offsetParent !== null,
            zIndex: window.getComputedStyle(toastElement).zIndex,
            display: window.getComputedStyle(toastElement).display
          });
        } else {
          console.error('[ContractorSelectionModal] Toast элемент НЕ найден в DOM!');
        }
      }, 100);
    }
  }, [toast]);

  // Вспомогательная функция для показа модального окна подтверждения
  const showConfirm = (title, message, confirmText = 'Да', cancelText = 'Отмена', type = 'warning') => {
    return new Promise((resolve) => {
      setConfirmModal({
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          setConfirmModal(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(null);
          resolve(false);
        }
      });
    });
  };
  
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
      setToast({ message: 'Пожалуйста, введите название корпуса', type: 'error' });
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

  const handleDeleteBuilding = async (buildingId) => {
    const confirmed = await showConfirm(
      'Удаление корпуса',
      'Вы уверены, что хотите удалить этот корпус? Все секции и подрядчики в нем будут удалены.',
      'Да, удалить',
      'Отмена',
      'danger'
    );
    if (!confirmed) {
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

  const handleEditBuilding = (buildingId, currentName) => {
    setEditingBuildingId(buildingId);
    setEditingBuildingName(currentName);
  };

  const handleSaveBuildingName = () => {
    if (!editingBuildingId || !editingBuildingName.trim()) {
      setEditingBuildingId(null);
      setEditingBuildingName('');
      return;
    }

    const updatedBuildings = buildings.map(building => {
      if (building.id === editingBuildingId) {
        return {
          ...building,
          name: editingBuildingName.trim()
        };
      }
      return building;
    });

    setBuildings(updatedBuildings);
    setEditingBuildingId(null);
    setEditingBuildingName('');
    setHasUnsavedChanges(true);
  };

  const handleCancelBuildingEdit = () => {
    setEditingBuildingId(null);
    setEditingBuildingName('');
  };

  const handleAddSection = () => {
    if (!selectedBuildingId || !newSectionName.trim()) {
      setToast({ message: 'Пожалуйста, выберите корпус и введите название секции', type: 'error' });
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

  const handleDeleteContractor = async (buildingId, sectionId, contractorId) => {
    const confirmed = await showConfirm(
      'Удаление подрядчика',
      'Вы уверены, что хотите удалить этого подрядчика?',
      'Да, удалить',
      'Отмена',
      'danger'
    );
    if (!confirmed) {
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

  const handleCopyContractor = (buildingId, sectionId, contractor) => {
    setContractorToCopy({ ...contractor, sourceBuildingId: buildingId, sourceSectionId: sectionId });
    setSelectedSectionsForCopy(new Set()); // Сбрасываем выбор
    setShowCopyContractorModal(true);
  };

  const handleToggleSectionForCopy = (buildingId, sectionId) => {
    const sectionKey = `${buildingId}-${sectionId}`;
    
    // Проверяем, не пытаемся ли скопировать в ту же секцию
    if (contractorToCopy && 
        contractorToCopy.sourceBuildingId === buildingId && 
        contractorToCopy.sourceSectionId === sectionId) {
      setToast({ message: 'Нельзя выбрать ту же секцию, где находится подрядчик', type: 'error' });
      return;
    }

    // Проверяем, не существует ли уже подрядчик с таким же именем и видом работ в целевой секции
    const targetBuilding = buildings.find(b => b.id === buildingId);
    const targetSection = targetBuilding?.sections.find(s => s.id === sectionId);
    
    if (targetSection && contractorToCopy) {
      const existingContractor = targetSection.contractors?.find(c => 
        c.name === contractorToCopy.name && c.workType === contractorToCopy.workType
      );
      
      if (existingContractor) {
        setToast({ 
          message: `В секции "${targetSection.name}" уже есть подрядчик "${contractorToCopy.name}" с видом работ "${contractorToCopy.workType}"`, 
          type: 'error' 
        });
        return;
      }
    }

    setSelectedSectionsForCopy(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  const handleSelectAllSectionsInBuilding = (buildingId) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const allSectionsInBuilding = building.sections
      .filter(section => {
        // Исключаем исходную секцию
        return !(contractorToCopy && 
                 contractorToCopy.sourceBuildingId === buildingId && 
                 contractorToCopy.sourceSectionId === section.id);
      })
      .map(section => `${buildingId}-${section.id}`);

    setSelectedSectionsForCopy(prev => {
      const newSet = new Set(prev);
      // Проверяем, все ли секции корпуса уже выбраны
      const allSelected = allSectionsInBuilding.length > 0 && allSectionsInBuilding.every(key => newSet.has(key));
      
      if (allSelected) {
        // Если все выбраны, снимаем выбор со всех секций этого корпуса
        allSectionsInBuilding.forEach(key => newSet.delete(key));
      } else {
        // Если не все выбраны, выбираем все секции этого корпуса
        allSectionsInBuilding.forEach(key => newSet.add(key));
      }
      return newSet;
    });
  };

  const handleConfirmCopyContractor = () => {
    if (!contractorToCopy || selectedSectionsForCopy.size === 0) {
      setToast({ message: 'Пожалуйста, выберите хотя бы одну секцию для копирования', type: 'error' });
      return;
    }

    // Проверяем, нет ли дубликатов в выбранных секциях
    const sectionsWithDuplicates = [];
    selectedSectionsForCopy.forEach(sectionKey => {
      const [buildingId, sectionId] = sectionKey.split('-').map(Number);
      const building = buildings.find(b => b.id === buildingId);
      const section = building?.sections.find(s => s.id === sectionId);
      
      if (section && contractorToCopy) {
        const hasDuplicate = section.contractors?.some(c => 
          c.name === contractorToCopy.name && c.workType === contractorToCopy.workType
        );
        if (hasDuplicate) {
          sectionsWithDuplicates.push(`${building.name} - ${section.name}`);
        }
      }
    });

    if (sectionsWithDuplicates.length > 0) {
      setToast({ 
        message: `В следующих секциях уже есть такой подрядчик: ${sectionsWithDuplicates.join(', ')}`, 
        type: 'error' 
      });
      return;
    }

    // Создаем глубокую копию подрядчика со всеми данными
    const contractorTemplate = {
      name: contractorToCopy.name,
      workType: contractorToCopy.workType,
      generatedActs: contractorToCopy.generatedActs ? JSON.parse(JSON.stringify(contractorToCopy.generatedActs)) : [],
      sentForApproval: contractorToCopy.sentForApproval ? JSON.parse(JSON.stringify(contractorToCopy.sentForApproval)) : [],
      approvedActs: contractorToCopy.approvedActs ? JSON.parse(JSON.stringify(contractorToCopy.approvedActs)) : [],
      rejectedActs: contractorToCopy.rejectedActs ? JSON.parse(JSON.stringify(contractorToCopy.rejectedActs)) : [],
      signedActs: contractorToCopy.signedActs ? JSON.parse(JSON.stringify(contractorToCopy.signedActs)) : [],
      blockingFactors: contractorToCopy.blockingFactors ? JSON.parse(JSON.stringify(contractorToCopy.blockingFactors)) : []
    };

    let copiedCount = 0;
    const copiedSections = [];

    // Копируем подрядчика во все выбранные секции
    const updatedBuildings = buildings.map(building => {
      return {
        ...building,
        sections: building.sections.map(section => {
          const sectionKey = `${building.id}-${section.id}`;
          if (selectedSectionsForCopy.has(sectionKey)) {
            const copiedContractor = {
              ...contractorTemplate,
              id: Date.now() + copiedCount // Уникальный ID для каждого копирования
            };
            copiedCount++;
            copiedSections.push(`${building.name} - ${section.name}`);
            return {
              ...section,
              contractors: [...(section.contractors || []), copiedContractor]
            };
          }
          return section;
        })
      };
    });

    setBuildings(updatedBuildings);
    setHasUnsavedChanges(true);
    setShowCopyContractorModal(false);
    setContractorToCopy(null);
    setSelectedSectionsForCopy(new Set());
    
    const sectionsList = copiedSections.join(', ');
    setToast({ 
      message: `Подрядчик "${contractorTemplate.name}" скопирован в ${copiedCount} секцию(и): ${sectionsList}`, 
      type: 'success' 
    });
  };

  const handleCancelCopyContractor = () => {
    setShowCopyContractorModal(false);
    setContractorToCopy(null);
    setSelectedSectionsForCopy(new Set());
  };

  const handleDeleteSection = async (buildingId, sectionId) => {
    const confirmed = await showConfirm(
      'Удаление секции',
      'Вы уверены, что хотите удалить эту секцию? Все подрядчики в ней будут удалены.',
      'Да, удалить',
      'Отмена',
      'danger'
    );
    if (!confirmed) {
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

  const handleEditSection = (buildingId, sectionId, currentName) => {
    setEditingSectionId(sectionId);
    setEditingSectionName(currentName);
  };

  const handleSaveSectionName = () => {
    if (!editingSectionId || !editingSectionName.trim()) {
      setEditingSectionId(null);
      setEditingSectionName('');
      return;
    }

    const updatedBuildings = buildings.map(building => {
      return {
        ...building,
        sections: building.sections.map(section => {
          if (section.id === editingSectionId) {
            return {
              ...section,
              name: editingSectionName.trim()
            };
          }
          return section;
        })
      };
    });

    setBuildings(updatedBuildings);
    setEditingSectionId(null);
    setEditingSectionName('');
    setHasUnsavedChanges(true);
  };

  const handleCancelSectionEdit = () => {
    setEditingSectionId(null);
    setEditingSectionName('');
  };

  const handleAddContractorToSection = (buildingId, sectionId) => {
    // Сохраняем данные для добавления подрядчика
    setPendingContractorData({ buildingId, sectionId });
    setNewContractorName('');
    setNewContractorWorkType('');
    setShowAddContractorModal(true);
  };

  const handleConfirmAddContractor = () => {
    if (!newContractorName.trim() || !newContractorWorkType.trim()) {
      setToast({ message: 'Пожалуйста, заполните все поля', type: 'error' });
      return;
    }

    if (!pendingContractorData) return;

    const { buildingId, sectionId } = pendingContractorData;

    const newContractor = {
      id: Date.now(),
      name: newContractorName.trim(),
      workType: newContractorWorkType.trim(),
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
    setShowAddContractorModal(false);
    setPendingContractorData(null);
    setNewContractorName('');
    setNewContractorWorkType('');
  };

  const handleCancelAddContractor = () => {
    setShowAddContractorModal(false);
    setPendingContractorData(null);
    setNewContractorName('');
    setNewContractorWorkType('');
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

  const handleContractorClick = async (buildingId, sectionId, contractor) => {
    // Проверяем наличие несохраненных изменений
    if (hasUnsavedChanges) {
      const shouldSave = await showConfirm(
        'Несохраненные изменения',
        'У вас есть несохраненные изменения. Сохранить их перед переходом к подрядчику? Если выберете "Отмена", изменения будут потеряны.',
        'Сохранить',
        'Отмена',
        'warning'
      );
      if (shouldSave) {
        // Сохраняем перед переходом
        try {
          await handleSaveObjectClick();
          proceedToContractor(buildingId, sectionId, contractor);
        } catch {
          // Если сохранение не удалось, спрашиваем еще раз
          const proceedAnyway = await showConfirm(
            'Ошибка сохранения',
            'Не удалось сохранить изменения. Перейти к подрядчику без сохранения? Изменения будут потеряны.',
            'Перейти',
            'Отмена',
            'warning'
          );
          if (proceedAnyway) {
            proceedToContractor(buildingId, sectionId, contractor);
          }
        }
        return;
      } else {
        // Пользователь решил не сохранять - предупреждаем
        const proceedAnyway = await showConfirm(
          'Подтверждение',
          'Вы уверены? Все несохраненные изменения будут потеряны.',
          'Да, продолжить',
          'Отмена',
          'warning'
        );
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

  // Обертка для onClose, которая проверяет флаг сохранения
  const safeOnClose = () => {
    console.log('[ContractorSelectionModal] safeOnClose вызван', {
      justSaved: justSavedRef.current,
      saveInProgress: saveInProgressRef.current,
      stackTrace: new Error().stack
    });
    
    if (justSavedRef.current || saveInProgressRef.current) {
      console.log('[ContractorSelectionModal] safeOnClose: БЛОКИРУЮ закрытие, только что сохранили');
      return;
    }
    console.log('[ContractorSelectionModal] safeOnClose: разрешаю закрытие, вызываю onClose');
    if (originalOnCloseRef.current) {
      originalOnCloseRef.current();
    }
  };

  // Обработка закрытия модального окна с проверкой несохраненных изменений
  const handleClose = async (e) => {
    // Если только что сохранили или идет процесс сохранения, не закрываем окно
    if (justSavedRef.current || saveInProgressRef.current) {
      console.log('[ContractorSelectionModal] handleClose: только что сохранили или идет сохранение, игнорирую закрытие', {
        justSaved: justSavedRef.current,
        saveInProgress: saveInProgressRef.current
      });
      return;
    }
    
    console.log('[ContractorSelectionModal] handleClose вызван, hasUnsavedChanges:', hasUnsavedChanges);
    
    if (hasUnsavedChanges) {
      const shouldSave = await showConfirm(
        'Несохраненные изменения',
        'У вас есть несохраненные изменения. Сохранить их перед закрытием? Если выберете "Отмена", изменения будут потеряны.',
        'Сохранить',
        'Отмена',
        'warning'
      );
      console.log('[ContractorSelectionModal] handleClose: shouldSave =', shouldSave);
      
      if (shouldSave) {
        try {
          await handleSaveObjectClick();
          // Не закрываем модальное окно автоматически после сохранения
          // Пользователь увидит toast и закроет окно сам
          console.log('[ContractorSelectionModal] handleClose: сохранение успешно, НЕ закрываю модальное окно');
          return; // ВАЖНО: не вызываем onClose() после сохранения
        } catch (error) {
          console.error('[ContractorSelectionModal] handleClose: ошибка сохранения:', error);
          // Если сохранение не удалось, спрашиваем еще раз
          const closeAnyway = await showConfirm(
            'Ошибка сохранения',
            'Не удалось сохранить изменения. Закрыть окно без сохранения? Изменения будут потеряны.',
            'Закрыть',
            'Отмена',
            'warning'
          );
          if (closeAnyway) {
            console.log('[ContractorSelectionModal] handleClose: пользователь решил закрыть несмотря на ошибку');
            safeOnClose();
          }
        }
        return;
      } else {
        // Пользователь решил не сохранять - предупреждаем
        const closeAnyway = await showConfirm(
          'Подтверждение',
          'Вы уверены? Все несохраненные изменения будут потеряны.',
          'Да, закрыть',
          'Отмена',
          'warning'
        );
        if (!closeAnyway) {
          console.log('[ContractorSelectionModal] handleClose: пользователь отменил закрытие');
          return;
        }
      }
    }
    console.log('[ContractorSelectionModal] handleClose: закрываю модальное окно');
    safeOnClose();
  };

  const handleObjectFieldChange = (field, value) => {
    setObjectData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveObjectClick = async (e) => {
    // Предотвращаем всплытие события, чтобы не закрыть модальное окно
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!onSaveObject) return;
    
    // Блокируем повторные вызовы
    if (saveInProgressRef.current) {
      console.log('[ContractorSelectionModal] Сохранение уже в процессе, игнорирую');
      return;
    }
    
    saveInProgressRef.current = true;
    justSavedRef.current = true; // Устанавливаем флаг ДО сохранения
    
    console.log('[ContractorSelectionModal] handleSaveObjectClick: начинаю сохранение');
    
    try {
      const savedObject = await onSaveObject({
        ...object,
        ...objectData,
        buildings: buildings
      });
      
      console.log('[ContractorSelectionModal] handleSaveObjectClick: сохранение успешно');
      
      // Обновляем начальное состояние после сохранения
      if (savedObject && savedObject.buildings) {
        setInitialBuildings(JSON.parse(JSON.stringify(savedObject.buildings)));
      } else {
        setInitialBuildings(JSON.parse(JSON.stringify(buildings)));
      }
      setHasUnsavedChanges(false);
      
      console.log('[ContractorSelectionModal] Показываю toast: Объект успешно сохранен');
      // Показываем toast сразу, без задержки
      setToast({ message: 'Объект успешно сохранен', type: 'success' });
      console.log('[ContractorSelectionModal] Toast установлен, состояние toast:', { message: 'Объект успешно сохранен', type: 'success' });
      
      // Снимаем флаг через 2 секунды, чтобы пользователь успел увидеть toast
      setTimeout(() => {
        justSavedRef.current = false;
        saveInProgressRef.current = false;
        console.log('[ContractorSelectionModal] Флаг justSaved снят, можно закрывать окно');
      }, 2000);
      
      return savedObject;
    } catch (error) {
      console.error('Error saving object:', error);
      justSavedRef.current = false;
      saveInProgressRef.current = false;
      const errorMessage = error.response?.data?.error || error.message || 'Ошибка сохранения объекта';
      setToast({ message: errorMessage, type: 'error' });
      throw error;
    }
  };

  const handleSyncAikona = async () => {
    if (!object || !object.containerId || !objectData.aikonaObjectId) {
      setToast({ message: 'Необходимо указать ID объекта в Айконе', type: 'error' });
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
      
      console.log('[ContractorSelectionModal] Показываю toast: Данные успешно синхронизированы из Айконы');
      // Показываем toast сразу, без задержки
      setToast({ message: 'Данные успешно синхронизированы из Айконы', type: 'success' });
    } catch (error) {
      console.error('Error syncing from Aikona:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Ошибка синхронизации';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setSyncingAikona(false);
    }
  };

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);
  const selectedSection = selectedBuilding?.sections.find(s => s.id === selectedSectionId);

  return (
    <div 
      className="contractor-selection-modal-backdrop" 
      onClick={(e) => {
        // Если только что сохранили или идет сохранение, не закрываем окно
        if (justSavedRef.current || saveInProgressRef.current) {
          console.log('[ContractorSelectionModal] backdrop click: блокирую закрытие', {
            justSaved: justSavedRef.current,
            saveInProgress: saveInProgressRef.current
          });
          return;
        }
        handleClose(e);
      }}
    >
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
          <button className="modal-close" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClose(e);
          }}>
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
                <button 
                  type="button" 
                  className="btn-save-object" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSaveObjectClick(e);
                  }}
                >
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
                      {editingBuildingId === building.id ? (
                        <div className="building-edit-form">
                          <input
                            type="text"
                            className="form-input"
                            value={editingBuildingName}
                            onChange={(e) => setEditingBuildingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveBuildingName();
                              } else if (e.key === 'Escape') {
                                handleCancelBuildingEdit();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                          <button 
                            className="btn btn-primary btn-small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveBuildingName();
                            }}
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button 
                            className="btn btn-secondary btn-small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelBuildingEdit();
                            }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="building-name">Корпус {building.name}</span>
                          {isAuthenticated && (
                            <div className="building-actions">
                              <button
                                className="btn btn-small btn-secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditBuilding(building.id, building.name);
                                }}
                                title="Редактировать название корпуса"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
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
                        </>
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

                {/* Список секций с возможностью редактирования и удаления */}
                {selectedBuilding.sections && selectedBuilding.sections.length > 0 && (
                  <div className="sections-list">
                    <label className="form-label">Секции корпуса {selectedBuilding.name}</label>
                    {selectedBuilding.sections.map(section => (
                      <div key={section.id} className="section-card">
                        {editingSectionId === section.id ? (
                          <div className="section-edit-form">
                            <input
                              type="text"
                              className="form-input"
                              value={editingSectionName}
                              onChange={(e) => setEditingSectionName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveSectionName();
                                } else if (e.key === 'Escape') {
                                  handleCancelSectionEdit();
                                }
                              }}
                              autoFocus
                            />
                            <button 
                              className="btn btn-primary btn-small"
                              onClick={handleSaveSectionName}
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={handleCancelSectionEdit}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ) : (
                          <div className="section-card-content">
                            <div 
                              className="section-name"
                              onClick={() => setSelectedSectionId(selectedSectionId === section.id ? null : section.id)}
                              style={{ cursor: 'pointer', flex: 1 }}
                            >
                              Секция {section.name} ({section.contractors?.length || 0} подрядчиков)
                            </div>
                            {isAuthenticated && (
                              <div className="section-actions">
                                <button
                                  className="btn btn-small btn-secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSection(selectedBuilding.id, section.id, section.name);
                                  }}
                                  title="Редактировать название секции"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  className="btn btn-small btn-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSection(selectedBuilding.id, section.id);
                                  }}
                                  title="Удалить секцию"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
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
                                  <div style={{ display: 'flex', gap: '5px' }}>
                                    <button
                                      className="btn btn-primary btn-tiny"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyContractor(selectedBuilding.id, selectedSection.id, contractor);
                                      }}
                                      title="Копировать подрядчика"
                                      style={{ backgroundColor: '#3498db' }}
                                    >
                                      <i className="fas fa-copy"></i>
                                    </button>
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
                                  </div>
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSaveObjectClick(e);
              }}
              style={{ backgroundColor: '#ff9800' }}
            >
              <i className="fas fa-save"></i> Сохранить изменения
            </button>
          )}
        </div>
      </div>

      {/* Модальное окно подтверждения */}
      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
        />
      )}

      {/* Модальное окно добавления подрядчика */}
      {showAddContractorModal && (
        <div className="contractor-selection-modal-backdrop" onClick={handleCancelAddContractor}>
          <div className="add-contractor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Добавить подрядчика</h3>
              <button className="close-modal" onClick={handleCancelAddContractor}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label" htmlFor="contractorName">Название подрядчика</label>
                <input
                  type="text"
                  className="form-input"
                  id="contractorName"
                  value={newContractorName}
                  onChange={(e) => setNewContractorName(e.target.value)}
                  placeholder="Например: ООО «СетлТех»"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const workTypeInput = document.getElementById('contractorWorkType');
                      if (workTypeInput) {
                        workTypeInput.focus();
                      }
                    } else if (e.key === 'Escape') {
                      handleCancelAddContractor();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contractorWorkType">Вид работ</label>
                <input
                  type="text"
                  className="form-input"
                  id="contractorWorkType"
                  value={newContractorWorkType}
                  onChange={(e) => setNewContractorWorkType(e.target.value)}
                  placeholder="Например: ОВ и ВК, Кладка"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmAddContractor();
                    } else if (e.key === 'Escape') {
                      handleCancelAddContractor();
                    }
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCancelAddContractor}>
                Отмена
              </button>
              <button className="btn btn-primary" onClick={handleConfirmAddContractor}>
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно копирования подрядчика */}
      {showCopyContractorModal && contractorToCopy && (
        <div className="add-contractor-modal-backdrop" onClick={handleCancelCopyContractor}>
          <div className="add-contractor-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3>Копировать подрядчика "{contractorToCopy.name}"</h3>
              <button className="modal-close" onClick={handleCancelCopyContractor}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '8px', color: '#2c5aa0' }}></i>
                  Выберите секции, в которые нужно скопировать подрядчика со всеми СТК и данными
                </p>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '10px' }}>
                {buildings.map(building => {
                  const buildingSections = building.sections || [];
                  const availableSections = buildingSections.filter(section => {
                    // Исключаем исходную секцию
                    if (contractorToCopy.sourceBuildingId === building.id && 
                        contractorToCopy.sourceSectionId === section.id) {
                      return false;
                    }
                    // Исключаем секции, где уже есть такой же подрядчик
                    if (contractorToCopy) {
                      const hasDuplicate = section.contractors?.some(c => 
                        c.name === contractorToCopy.name && c.workType === contractorToCopy.workType
                      );
                      if (hasDuplicate) {
                        return false;
                      }
                    }
                    return true;
                  });
                  const allSectionsSelected = availableSections.length > 0 && 
                    availableSections.every(section => selectedSectionsForCopy.has(`${building.id}-${section.id}`));
                  
                  return (
                    <div key={building.id} style={{ marginBottom: '20px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginBottom: '10px',
                        padding: '8px',
                        background: '#f0f7ff',
                        borderRadius: '4px'
                      }}>
                        <input
                          type="checkbox"
                          checked={allSectionsSelected}
                          onChange={() => handleSelectAllSectionsInBuilding(building.id)}
                          disabled={availableSections.length === 0}
                          style={{ marginRight: '10px', cursor: availableSections.length === 0 ? 'not-allowed' : 'pointer' }}
                        />
                        <label style={{ 
                          fontWeight: 'bold', 
                          fontSize: '16px', 
                          color: '#2c5aa0',
                          cursor: availableSections.length === 0 ? 'not-allowed' : 'pointer',
                          flex: 1
                        }} onClick={() => availableSections.length > 0 && handleSelectAllSectionsInBuilding(building.id)}>
                          Корпус: {building.name}
                        </label>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          ({availableSections.length} секций)
                        </span>
                      </div>
                      
                      <div style={{ marginLeft: '20px' }}>
                        {buildingSections.map(section => {
                          const sectionKey = `${building.id}-${section.id}`;
                          const isSourceSection = contractorToCopy.sourceBuildingId === building.id && 
                                                  contractorToCopy.sourceSectionId === section.id;
                          const isSelected = selectedSectionsForCopy.has(sectionKey);
                          
                          // Проверяем, есть ли уже такой подрядчик в этой секции
                          const hasDuplicate = contractorToCopy && section.contractors?.some(c => 
                            c.name === contractorToCopy.name && c.workType === contractorToCopy.workType
                          );
                          
                          const isDisabled = isSourceSection || hasDuplicate;
                          
                          return (
                            <div 
                              key={section.id} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '6px',
                                marginBottom: '4px',
                                borderRadius: '4px',
                                background: isSourceSection ? '#ffe0e0' : (hasDuplicate ? '#fff3cd' : (isSelected ? '#e8f5e9' : 'transparent')),
                                opacity: isDisabled ? 0.6 : 1
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSectionForCopy(building.id, section.id)}
                                disabled={isDisabled}
                                style={{ marginRight: '10px', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                              />
                              <label style={{ 
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                flex: 1,
                                color: isDisabled ? '#999' : '#333'
                              }} onClick={() => !isDisabled && handleToggleSectionForCopy(building.id, section.id)}>
                                Секция: {section.name}
                                {isSourceSection && (
                                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#999' }}>
                                    (текущая секция)
                                  </span>
                                )}
                                {hasDuplicate && !isSourceSection && (
                                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#856404' }}>
                                    (уже есть такой подрядчик)
                                  </span>
                                )}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedSectionsForCopy.size > 0 && (
                <div className="form-group" style={{ marginTop: '15px', padding: '10px', background: '#e8f5e9', borderRadius: '6px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#2e7d32', fontWeight: '500' }}>
                    <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
                    Выбрано секций: {selectedSectionsForCopy.size}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCancelCopyContractor}>
                Отмена
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleConfirmCopyContractor}
                disabled={selectedSectionsForCopy.size === 0}
              >
                Копировать в {selectedSectionsForCopy.size} секцию(и)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Уведомления - выносим через Portal за пределы модального окна */}
      {toast && (() => {
        console.log('[ContractorSelectionModal] Рендерю toast через Portal:', toast);
        const toastElement = createPortal(
          <ToastNotification
            message={toast.message}
            type={toast.type}
            onClose={() => {
              console.log('[ContractorSelectionModal] Закрываю toast');
              setToast(null);
            }}
          />,
          document.body
        );
        // Проверяем, что Portal действительно создан
        setTimeout(() => {
          const renderedToast = document.querySelector('.toast-notification');
          if (renderedToast) {
            console.log('[ContractorSelectionModal] Toast успешно отрендерен в DOM');
          } else {
            console.error('[ContractorSelectionModal] ОШИБКА: Toast НЕ найден в DOM после рендеринга!');
          }
        }, 50);
        return toastElement;
      })()}
    </div>
  );
};

export default ContractorSelectionModal;
