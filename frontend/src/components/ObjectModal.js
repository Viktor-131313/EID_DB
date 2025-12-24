import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ObjectModal.css';

const ObjectModal = ({ object, onSave, onDelete, onClose, isAuthenticated = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: '',
    generatedActs: [],
    sentForApproval: [],
    approvedActs: [],
    rejectedActs: [],
    signedActs: [],
    blockingFactors: []
  });

  const [expandedSections, setExpandedSections] = useState({
    generated: false,
    sent: false,
    approved: false,
    rejected: false,
    signed: false
  });

  const [newSMRName, setNewSMRName] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [editingSMRId, setEditingSMRId] = useState(null);
  const [editingSMRName, setEditingSMRName] = useState('');
  const [editingSMRList, setEditingSMRList] = useState(null); // 'generated', 'sent', 'approved', 'rejected', 'signed'
  const [selectedSMRId, setSelectedSMRId] = useState(null); // Для отслеживания выбранного СМР для удаления
  const [selectedSMRList, setSelectedSMRList] = useState(null);

  // Используем useRef для отслеживания, инициализирован ли formData
  const isInitializedRef = useRef(false);
  const lastObjectIdRef = useRef(null);

  useEffect(() => {
    const currentObjectId = object?.id || null;
    
    // Если это новый объект (null) или объект с другим ID, инициализируем форму
    if (!isInitializedRef.current || lastObjectIdRef.current !== currentObjectId) {
      console.log('useEffect triggered - initializing form, object:', object);
      isInitializedRef.current = true;
      lastObjectIdRef.current = currentObjectId;
      
      if (object) {
        console.log('Object blockingFactors:', object.blockingFactors);
        // Преобразуем старые данные в новый формат, если нужно
        let generatedActs = object.generatedActs || [];
        let sentForApproval = object.sentForApproval || [];
        
        // Если это числа (старый формат), преобразуем в массивы
        if (typeof generatedActs === 'number') {
          generatedActs = [];
        }
        if (typeof sentForApproval === 'number') {
          sentForApproval = [];
        }
        
        // Убеждаемся, что это массивы
        if (!Array.isArray(generatedActs)) {
          generatedActs = [];
        }
        if (!Array.isArray(sentForApproval)) {
          sentForApproval = [];
        }
        
        // Обработка новых полей - approvedActs, rejectedActs, signedActs
        let approvedActs = object.approvedActs || [];
        let rejectedActs = object.rejectedActs || [];
        let signedActs = object.signedActs || [];

        if (typeof approvedActs === 'number') {
          approvedActs = [];
        }
        if (typeof rejectedActs === 'number') {
          rejectedActs = [];
        }
        if (!Array.isArray(approvedActs)) {
          approvedActs = [];
        }
        if (!Array.isArray(rejectedActs)) {
          rejectedActs = [];
        }
        if (!Array.isArray(signedActs)) {
          signedActs = [];
        }
        
        const blockingFactors = Array.isArray(object.blockingFactors) ? object.blockingFactors : [];
        console.log('Setting formData with blockingFactors:', blockingFactors);
        
        setFormData({
          name: object.name || '',
          description: object.description || '',
          status: object.status || '',
          generatedActs,
          sentForApproval,
          approvedActs,
          rejectedActs,
          signedActs,
          blockingFactors
        });
      } else {
        console.log('Initializing empty form');
        // Пустая форма для нового объекта
        setFormData({
          name: '',
          description: '',
          status: '',
          generatedActs: [],
          sentForApproval: [],
          approvedActs: [],
          rejectedActs: [],
          signedActs: [],
          blockingFactors: []
        });
      }
    } else {
      console.log('useEffect triggered but form already initialized, skipping reset');
    }
  }, [object]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateGeneratedCount = (id, count) => {
    setFormData(prev => {
      if (!Array.isArray(prev.generatedActs)) {
        return prev;
      }
      return {
        ...prev,
        generatedActs: prev.generatedActs.map(smr =>
          smr.id === id ? { ...smr, count: parseInt(count) || 0 } : smr
        )
      };
    });
  };

  const updateGeneratedTotal = (id, total) => {
    setFormData(prev => {
      if (!Array.isArray(prev.generatedActs)) {
        return prev;
      }
      return {
        ...prev,
        generatedActs: prev.generatedActs.map(smr =>
          smr.id === id ? { ...smr, total: parseInt(total) || 0 } : smr
        )
      };
    });
  };

  const updateSentCount = (id, count) => {
    setFormData(prev => {
      if (!Array.isArray(prev.sentForApproval)) {
        return prev;
      }
      return {
        ...prev,
        sentForApproval: prev.sentForApproval.map(smr =>
          smr.id === id ? { ...smr, count: parseInt(count) || 0 } : smr
        )
      };
    });
  };

  const updateApprovedCount = (id, count) => {
    setFormData(prev => {
      if (!Array.isArray(prev.approvedActs)) {
        return prev;
      }
      return {
        ...prev,
        approvedActs: prev.approvedActs.map(smr =>
          smr.id === id ? { ...smr, count: parseInt(count) || 0 } : smr
        )
      };
    });
  };

  const updateRejectedCount = (id, count) => {
    setFormData(prev => {
      if (!Array.isArray(prev.rejectedActs)) {
        return prev;
      }
      return {
        ...prev,
        rejectedActs: prev.rejectedActs.map(smr =>
          smr.id === id ? { ...smr, count: parseInt(count) || 0 } : smr
        )
      };
    });
  };

  const updateSignedCount = (id, count) => {
    setFormData(prev => {
      if (!Array.isArray(prev.signedActs)) {
        return prev;
      }
      return {
        ...prev,
        signedActs: prev.signedActs.map(smr =>
          smr.id === id ? { ...smr, count: parseInt(count) || 0 } : smr
        )
      };
    });
  };

  const handleSMRDoubleClick = (smrId, smrName, listType) => {
    if (!isAuthenticated) return;
    setEditingSMRId(smrId);
    setEditingSMRName(smrName);
    setEditingSMRList(listType);
    setSelectedSMRId(smrId);
    setSelectedSMRList(listType);
  };

  const handleSMRClick = (smrId, listType) => {
    // Выбираем СМР для возможного удаления
    setSelectedSMRId(smrId);
    setSelectedSMRList(listType);
  };

  const handleSMRNameChange = (e) => {
    setEditingSMRName(e.target.value);
  };

  const handleSMRNameKeyPress = (e) => {
    if (!isAuthenticated) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      saveSMRName();
    } else if (e.key === 'Escape') {
      cancelSMREdit();
    } else if (e.key === 'Delete' && e.ctrlKey) {
      e.preventDefault();
      deleteSMR(editingSMRId, editingSMRList);
    }
  };

  const handleSMRNameBlur = () => {
    saveSMRName();
  };

  const saveSMRName = () => {
    if (!editingSMRId || !editingSMRName.trim()) {
      cancelSMREdit();
      return;
    }

    setFormData(prev => {
      const updated = { ...prev };
      
      // Обновляем имя СМР во всех списках, где он присутствует
      const updateSMRNameInList = (list, smrId, newName) => {
        return list.map(smr => smr.id === smrId ? { ...smr, name: newName } : smr);
      };

      const newName = editingSMRName.trim();
      
      updated.generatedActs = updateSMRNameInList(prev.generatedActs, editingSMRId, newName);
      updated.sentForApproval = updateSMRNameInList(prev.sentForApproval, editingSMRId, newName);
      updated.approvedActs = updateSMRNameInList(prev.approvedActs, editingSMRId, newName);
      updated.rejectedActs = updateSMRNameInList(prev.rejectedActs, editingSMRId, newName);
      updated.signedActs = updateSMRNameInList(prev.signedActs, editingSMRId, newName);
      
      return updated;
    });

    cancelSMREdit();
  };

  const cancelSMREdit = () => {
    setEditingSMRId(null);
    setEditingSMRName('');
    setEditingSMRList(null);
    // Не сбрасываем selectedSMRId, чтобы можно было удалить после редактирования
  };

  const deleteSMR = useCallback((smrId, listType) => {
    if (!isAuthenticated || !smrId) {
      return;
    }

    if (!window.confirm('Вы уверены, что хотите удалить этот СМР?')) {
      return;
    }

    setFormData(prev => {
      const updated = { ...prev };
      
      if (listType === 'generated') {
        // Удаляем из generatedActs и всех зависимых списков
        updated.generatedActs = prev.generatedActs.filter(smr => smr.id !== smrId);
        updated.sentForApproval = prev.sentForApproval.filter(smr => smr.id !== smrId);
        updated.approvedActs = prev.approvedActs.filter(smr => smr.id !== smrId);
        updated.rejectedActs = prev.rejectedActs.filter(smr => smr.id !== smrId);
        updated.signedActs = prev.signedActs.filter(smr => smr.id !== smrId);
      } else if (listType === 'sent') {
        // Удаляем из sentForApproval и зависимых
        updated.sentForApproval = prev.sentForApproval.filter(smr => smr.id !== smrId);
        updated.approvedActs = prev.approvedActs.filter(smr => smr.id !== smrId);
        updated.rejectedActs = prev.rejectedActs.filter(smr => smr.id !== smrId);
        updated.signedActs = prev.signedActs.filter(smr => smr.id !== smrId);
      } else if (listType === 'approved') {
        updated.approvedActs = prev.approvedActs.filter(smr => smr.id !== smrId);
        updated.signedActs = prev.signedActs.filter(smr => smr.id !== smrId);
      } else if (listType === 'rejected') {
        updated.rejectedActs = prev.rejectedActs.filter(smr => smr.id !== smrId);
      } else if (listType === 'signed') {
        updated.signedActs = prev.signedActs.filter(smr => smr.id !== smrId);
      }
      
      return updated;
    });

    setEditingSMRId(null);
    setEditingSMRName('');
    setEditingSMRList(null);
    setSelectedSMRId(null);
    setSelectedSMRList(null);
  }, []);

  // Обработка клавиши Delete для удаления СМР
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Проверяем, не в поле ввода ли мы (кроме поля редактирования СМР)
      if (e.target.tagName === 'INPUT' && e.target.type === 'text' && !e.target.className.includes('smr-name-edit')) {
        return;
      }

      if (e.key === 'Delete' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        // Если СМР в режиме редактирования - удаляем его
        if (editingSMRId && editingSMRList) {
          e.preventDefault();
          deleteSMR(editingSMRId, editingSMRList);
        }
        // Если есть выбранный СМР (кликнули на него) - удаляем
        else if (selectedSMRId && selectedSMRList) {
          e.preventDefault();
          deleteSMR(selectedSMRId, selectedSMRList);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingSMRId, editingSMRList, selectedSMRId, selectedSMRList, deleteSMR]);

  const addNewSMR = () => {
    if (!newSMRName.trim()) {
      alert('Введите название СМР');
      return;
    }

    if (!Array.isArray(formData.generatedActs) || !Array.isArray(formData.sentForApproval)) {
      alert('Ошибка: данные не загружены');
      return;
    }

    const maxId = Math.max(
      ...formData.generatedActs.map(s => s.id || 0),
      ...formData.sentForApproval.map(s => s.id || 0),
      ...formData.approvedActs.map(s => s.id || 0),
      ...formData.rejectedActs.map(s => s.id || 0),
      ...formData.signedActs.map(s => s.id || 0),
      0
    );

    const newSMR = {
      id: maxId + 1,
      name: newSMRName.trim(),
      count: 0,
      total: 0
    };

    // Добавляем во все списки одновременно
    setFormData(prev => ({
      ...prev,
      generatedActs: Array.isArray(prev.generatedActs) ? [...prev.generatedActs, { ...newSMR }] : [{ ...newSMR }],
      sentForApproval: Array.isArray(prev.sentForApproval) ? [...prev.sentForApproval, { ...newSMR }] : [{ ...newSMR }],
      approvedActs: Array.isArray(prev.approvedActs) ? [...prev.approvedActs, { ...newSMR }] : [{ ...newSMR }],
      rejectedActs: Array.isArray(prev.rejectedActs) ? [...prev.rejectedActs, { ...newSMR }] : [{ ...newSMR }],
      signedActs: Array.isArray(prev.signedActs) ? [...prev.signedActs, { ...newSMR }] : [{ ...newSMR }]
    }));

    setNewSMRName('');
  };

  const calculateTotalGenerated = () => {
    if (!Array.isArray(formData.generatedActs)) {
      return 0;
    }
    return formData.generatedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
  };

  const calculateTotalGeneratedFrom = () => {
    if (!Array.isArray(formData.generatedActs)) {
      return 0;
    }
    return formData.generatedActs.reduce((sum, smr) => sum + (smr.total || 0), 0);
  };

  const calculateTotalSent = () => {
    if (!Array.isArray(formData.sentForApproval)) {
      return 0;
    }
    return formData.sentForApproval.reduce((sum, smr) => sum + (smr.count || 0), 0);
  };

  const calculateTotalApproved = () => {
    if (!Array.isArray(formData.approvedActs)) {
      return 0;
    }
    return formData.approvedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
  };

  const calculateTotalRejected = () => {
    if (!Array.isArray(formData.rejectedActs)) {
      return 0;
    }
    return formData.rejectedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
  };

  const calculateTotalSigned = () => {
    if (!Array.isArray(formData.signedActs)) {
      return 0;
    }
    return formData.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Автоматическое изменение высоты textarea
    if (e.target.tagName === 'TEXTAREA') {
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onClose();
      return;
    }

    const totalGenerated = calculateTotalGenerated();
    const totalSent = calculateTotalSent();
    const totalApproved = calculateTotalApproved();
    const totalRejected = calculateTotalRejected();
    const totalSigned = calculateTotalSigned();

    if (totalSent > totalGenerated) {
      alert('Отправленных на согласование актов не может быть больше сгенерированных!');
      return;
    }

    if (totalApproved + totalRejected > totalSent) {
      alert('Сумма согласованных и отклоненных актов не может быть больше отправленных на согласование!');
      return;
    }

    if (totalSigned > totalApproved) {
      alert('Подписанных актов не может быть больше согласованных!');
      return;
    }

    console.log('Submitting form data:', formData);
    console.log('Blocking factors in form data:', formData.blockingFactors);
    onSave(formData);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const totalGenerated = calculateTotalGenerated();
  const totalGeneratedFrom = calculateTotalGeneratedFrom();
  const totalSent = calculateTotalSent();
  const totalApproved = calculateTotalApproved();
  const totalRejected = calculateTotalRejected();
  const totalSigned = calculateTotalSigned();
  const generatedPercent = totalGeneratedFrom > 0 ? Math.round((totalGenerated / totalGeneratedFrom) * 100) : 0;

  // Автоматическое изменение высоты textarea при загрузке
  useEffect(() => {
    const textarea = document.getElementById('objectStatus');
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [formData.status, object]);

  return (
    <div className="modal" onClick={handleBackdropClick}>
      <div className="modal-content object-modal-content">
          <div className="modal-header">
          <div className="modal-title">
            {isAuthenticated ? (object ? 'Редактировать объект' : 'Добавить новый объект') : 'Просмотр объекта'}
          </div>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="objectName">Название объекта</label>
            <input
              type="text"
              className="form-input"
              id="objectName"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Например: ПА8-кладка2"
              required
              disabled={!isAuthenticated}
              readOnly={!isAuthenticated}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="objectDescription">Секция/подрядчик</label>
            <input
              type="text"
              className="form-input"
              id="objectDescription"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Например: Корпус 8, ООО «Компонент»"
              disabled={!isAuthenticated}
              readOnly={!isAuthenticated}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="objectStatus">Статус</label>
            <textarea
              className="form-textarea form-textarea-auto-resize"
              id="objectStatus"
              name="status"
              disabled={!isAuthenticated}
              readOnly={!isAuthenticated}
              value={formData.status}
              onChange={handleChange}
              placeholder="Введите статус объекта..."
              rows={1}
            />
          </div>

          {/* Сгенерированных актов */}
          <div className="form-section">
            <div 
              className="form-section-header"
              onClick={() => toggleSection('generated')}
            >
              <div>
                <i className={`fas fa-chevron-${expandedSections.generated ? 'down' : 'right'}`}></i>
                <span className="form-section-title">Сгенерированных актов</span>
                <span className="form-section-count">
                  ({totalGenerated} из {totalGeneratedFrom} - {generatedPercent}%)
                </span>
              </div>
            </div>
            
            {expandedSections.generated && (
              <div className="form-section-content">
                {Array.isArray(formData.generatedActs) && formData.generatedActs.map(smr => (
                  <div
                    key={smr.id}
                    className={`smr-item ${selectedSMRId === smr.id && selectedSMRList === 'generated' ? 'smr-item-selected' : ''}`}
                    onClick={() => handleSMRClick(smr.id, 'generated')}
                  >
                    {editingSMRId === smr.id && editingSMRList === 'generated' ? (
                      <input
                        type="text"
                        className="smr-name-edit"
                        value={editingSMRName}
                        onChange={handleSMRNameChange}
                        onKeyDown={handleSMRNameKeyPress}
                        onBlur={handleSMRNameBlur}
                        autoFocus
                      />
                    ) : (
                      <label
                        className={isAuthenticated ? "smr-label smr-label-editable" : "smr-label"}
                        onDoubleClick={isAuthenticated ? (e) => {
                          e.stopPropagation();
                          handleSMRDoubleClick(smr.id, smr.name, 'generated');
                        } : undefined}
                        title={isAuthenticated ? "Двойной клик для переименования, Delete для удаления" : ""}
                        style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
                      >
                        {smr.name}
                      </label>
                    )}
                    <input
                      type="number"
                      className="smr-input"
                      value={smr.count || 0}
                      onChange={(e) => updateGeneratedCount(smr.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      min="0"
                      max={smr.total || undefined}
                      placeholder="Сколько"
                      disabled={!isAuthenticated}
                      readOnly={!isAuthenticated}
                    />
                    <span className="smr-input-separator">из</span>
                    <input
                      type="number"
                      className="smr-input"
                      value={smr.total || 0}
                      onChange={(e) => updateGeneratedTotal(smr.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      min="0"
                      placeholder="Из скольки"
                      disabled={!isAuthenticated}
                      readOnly={!isAuthenticated}
                    />
                  </div>
                ))}
                
                {isAuthenticated && (
                  <div className="smr-add">
                    <input
                      type="text"
                      className="smr-name-input"
                      placeholder="Название СМР"
                      value={newSMRName}
                      onChange={(e) => setNewSMRName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addNewSMR();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-add-smr"
                      onClick={addNewSMR}
                    >
                      <i className="fas fa-plus"></i> Добавить СМР
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Отправлено на согласование */}
          <div className="form-section">
            <div 
              className="form-section-header"
              onClick={() => toggleSection('sent')}
            >
              <div>
                <i className={`fas fa-chevron-${expandedSections.sent ? 'down' : 'right'}`}></i>
                <span className="form-section-title">Актов отправлено на согласование</span>
                <span className="form-section-count">({totalSent})</span>
              </div>
            </div>
            
            {expandedSections.sent && (
              <div className="form-section-content">
                {Array.isArray(formData.sentForApproval) && formData.sentForApproval.map(smr => {
                  const maxCount = formData.generatedActs.find(g => g.id === smr.id)?.count || 0;
                  return (
                    <div
                      key={smr.id}
                      className={`smr-item ${selectedSMRId === smr.id && selectedSMRList === 'sent' ? 'smr-item-selected' : ''}`}
                      onClick={() => handleSMRClick(smr.id, 'sent')}
                    >
                      {editingSMRId === smr.id && editingSMRList === 'sent' ? (
                        <input
                          type="text"
                          className="smr-name-edit"
                          value={editingSMRName}
                          onChange={handleSMRNameChange}
                          onKeyDown={handleSMRNameKeyPress}
                          onBlur={handleSMRNameBlur}
                          autoFocus
                        />
                      ) : (
                        <label
                          className={isAuthenticated ? "smr-label smr-label-editable" : "smr-label"}
                          onDoubleClick={isAuthenticated ? (e) => {
                            e.stopPropagation();
                            handleSMRDoubleClick(smr.id, smr.name, 'sent');
                          } : undefined}
                          title={isAuthenticated ? "Двойной клик для переименования, Delete для удаления" : ""}
                          style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
                        >
                          {smr.name}
                        </label>
                      )}
                    <input
                      type="number"
                      className="smr-input"
                      value={smr.count}
                      onChange={(e) => updateSentCount(smr.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      min="0"
                      max={maxCount}
                      disabled={!isAuthenticated}
                      readOnly={!isAuthenticated}
                    />
                      {maxCount > 0 && (
                        <span className="smr-max-hint">(макс: {maxCount})</span>
                      )}
                    </div>
                  );
                })}
                {(!Array.isArray(formData.sentForApproval) || formData.sentForApproval.length === 0) && (
                  <div className="empty-smr-message">
                    Добавьте СМР в раздел "Сгенерированных актов", чтобы они появились здесь
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Актов согласовано */}
          <div className="form-section">
            <div 
              className="form-section-header"
              onClick={() => toggleSection('approved')}
            >
              <div>
                <i className={`fas fa-chevron-${expandedSections.approved ? 'down' : 'right'}`}></i>
                <span className="form-section-title">Актов согласовано</span>
                <span className="form-section-count">({calculateTotalApproved()})</span>
              </div>
            </div>
            
            {expandedSections.approved && (
              <div className="form-section-content">
                {Array.isArray(formData.approvedActs) && formData.approvedActs.map(smr => {
                  const maxCount = formData.sentForApproval.find(s => s.id === smr.id)?.count || 0;
                  return (
                    <div
                      key={smr.id}
                      className={`smr-item ${selectedSMRId === smr.id && selectedSMRList === 'approved' ? 'smr-item-selected' : ''}`}
                      onClick={() => handleSMRClick(smr.id, 'approved')}
                    >
                      {editingSMRId === smr.id && editingSMRList === 'approved' ? (
                        <input
                          type="text"
                          className="smr-name-edit"
                          value={editingSMRName}
                          onChange={handleSMRNameChange}
                          onKeyDown={handleSMRNameKeyPress}
                          onBlur={handleSMRNameBlur}
                          autoFocus
                        />
                      ) : (
                        <label
                          className={isAuthenticated ? "smr-label smr-label-editable" : "smr-label"}
                          onDoubleClick={isAuthenticated ? (e) => {
                            e.stopPropagation();
                            handleSMRDoubleClick(smr.id, smr.name, 'approved');
                          } : undefined}
                          title={isAuthenticated ? "Двойной клик для переименования, Delete для удаления" : ""}
                          style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
                        >
                          {smr.name}
                        </label>
                      )}
                      <input
                        type="number"
                        className="smr-input"
                        value={smr.count}
                        onChange={(e) => updateApprovedCount(smr.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        min="0"
                        max={maxCount}
                        disabled={!isAuthenticated}
                        readOnly={!isAuthenticated}
                      />
                      {maxCount > 0 && (
                        <span className="smr-max-hint">(макс: {maxCount})</span>
                      )}
                    </div>
                  );
                })}
                {(!Array.isArray(formData.approvedActs) || formData.approvedActs.length === 0) && (
                  <div className="empty-smr-message">
                    Добавьте СМР в раздел "Сгенерированных актов", чтобы они появились здесь
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Актов отклонено */}
          <div className="form-section">
            <div 
              className="form-section-header"
              onClick={() => toggleSection('rejected')}
            >
              <div>
                <i className={`fas fa-chevron-${expandedSections.rejected ? 'down' : 'right'}`}></i>
                <span className="form-section-title">Актов отклонено</span>
                <span className="form-section-count">({calculateTotalRejected()})</span>
              </div>
            </div>
            
            {expandedSections.rejected && (
              <div className="form-section-content">
                {Array.isArray(formData.rejectedActs) && formData.rejectedActs.map(smr => {
                  const maxCount = formData.sentForApproval.find(s => s.id === smr.id)?.count || 0;
                  return (
                    <div
                      key={smr.id}
                      className={`smr-item ${selectedSMRId === smr.id && selectedSMRList === 'rejected' ? 'smr-item-selected' : ''}`}
                      onClick={() => handleSMRClick(smr.id, 'rejected')}
                    >
                      {editingSMRId === smr.id && editingSMRList === 'rejected' ? (
                        <input
                          type="text"
                          className="smr-name-edit"
                          value={editingSMRName}
                          onChange={handleSMRNameChange}
                          onKeyDown={handleSMRNameKeyPress}
                          onBlur={handleSMRNameBlur}
                          autoFocus
                        />
                      ) : (
                        <label
                          className={isAuthenticated ? "smr-label smr-label-editable" : "smr-label"}
                          onDoubleClick={isAuthenticated ? (e) => {
                            e.stopPropagation();
                            handleSMRDoubleClick(smr.id, smr.name, 'rejected');
                          } : undefined}
                          title={isAuthenticated ? "Двойной клик для переименования, Delete для удаления" : ""}
                          style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
                        >
                          {smr.name}
                        </label>
                      )}
                      <input
                        type="number"
                        className="smr-input"
                        value={smr.count}
                        onChange={(e) => updateRejectedCount(smr.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        min="0"
                        max={maxCount}
                        disabled={!isAuthenticated}
                        readOnly={!isAuthenticated}
                      />
                      {maxCount > 0 && (
                        <span className="smr-max-hint">(макс: {maxCount})</span>
                      )}
                    </div>
                  );
                })}
                {(!Array.isArray(formData.rejectedActs) || formData.rejectedActs.length === 0) && (
                  <div className="empty-smr-message">
                    Добавьте СМР в раздел "Сгенерированных актов", чтобы они появились здесь
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Актов подписано */}
          <div className="form-section">
            <div 
              className="form-section-header"
              onClick={() => toggleSection('signed')}
            >
              <div>
                <i className={`fas fa-chevron-${expandedSections.signed ? 'down' : 'right'}`}></i>
                <span className="form-section-title">Актов подписано</span>
                <span className="form-section-count">({calculateTotalSigned()})</span>
              </div>
            </div>
            
            {expandedSections.signed && (
              <div className="form-section-content">
                {Array.isArray(formData.signedActs) && formData.signedActs.map(smr => {
                  const maxCount = formData.approvedActs.find(a => a.id === smr.id)?.count || 0;
                  return (
                    <div
                      key={smr.id}
                      className={`smr-item ${selectedSMRId === smr.id && selectedSMRList === 'signed' ? 'smr-item-selected' : ''}`}
                      onClick={() => handleSMRClick(smr.id, 'signed')}
                    >
                      {editingSMRId === smr.id && editingSMRList === 'signed' ? (
                        <input
                          type="text"
                          className="smr-name-edit"
                          value={editingSMRName}
                          onChange={handleSMRNameChange}
                          onKeyDown={handleSMRNameKeyPress}
                          onBlur={handleSMRNameBlur}
                          autoFocus
                        />
                      ) : (
                        <label
                          className={isAuthenticated ? "smr-label smr-label-editable" : "smr-label"}
                          onDoubleClick={isAuthenticated ? (e) => {
                            e.stopPropagation();
                            handleSMRDoubleClick(smr.id, smr.name, 'signed');
                          } : undefined}
                          title={isAuthenticated ? "Двойной клик для переименования, Delete для удаления" : ""}
                          style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
                        >
                          {smr.name}
                        </label>
                      )}
                      <input
                        type="number"
                        className="smr-input"
                        value={smr.count}
                        onChange={(e) => updateSignedCount(smr.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        min="0"
                        max={maxCount}
                        disabled={!isAuthenticated}
                        readOnly={!isAuthenticated}
                      />
                      {maxCount > 0 && (
                        <span className="smr-max-hint">(макс: {maxCount})</span>
                      )}
                    </div>
                  );
                })}
                {(!Array.isArray(formData.signedActs) || formData.signedActs.length === 0) && (
                  <div className="empty-smr-message">
                    Добавьте СМР в раздел "Сгенерированных актов", чтобы они появились здесь
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Блокирующие факты */}
          <div className="form-section blocking-factors-section">
            <div className="form-section-header-static">
              <div>
                <i className="fas fa-exclamation-triangle"></i>
                <span className="form-section-title">Блокирующие факты</span>
              </div>
            </div>
            <div className="form-section-content">
              <div className="blocking-factors-subtitle">
                Сотрудники, требующие вовлечения руководства
              </div>
              <div className="blocking-factors-list">
                {Array.isArray(formData.blockingFactors) && formData.blockingFactors.map((employee, index) => (
                  <div key={index} className="blocking-factor-item">
                    <input
                      type="text"
                      className="blocking-factor-input"
                      value={employee}
                      onChange={(e) => {
                        const updated = [...formData.blockingFactors];
                        updated[index] = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          blockingFactors: updated
                        }));
                      }}
                      placeholder="ФИО сотрудника"
                      disabled={!isAuthenticated}
                      readOnly={!isAuthenticated}
                    />
                    {isAuthenticated && (
                      <button
                        type="button"
                        className="btn-remove-factor"
                        onClick={() => {
                          const updated = formData.blockingFactors.filter((_, i) => i !== index);
                          setFormData(prev => ({
                            ...prev,
                            blockingFactors: updated
                          }));
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}
                {isAuthenticated && (
                  <div className="blocking-factor-add">
                    <input
                      type="text"
                      className="blocking-factor-input"
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const employeeName = newEmployeeName.trim();
                          if (employeeName) {
                            console.log('Adding employee via Enter:', employeeName);
                            console.log('Current blockingFactors before add:', formData.blockingFactors);
                            setFormData(prev => {
                              const updated = {
                                ...prev,
                                blockingFactors: [...(prev.blockingFactors || []), employeeName]
                              };
                              console.log('Updated blockingFactors after add:', updated.blockingFactors);
                              return updated;
                            });
                            setNewEmployeeName('');
                          }
                        }
                      }}
                      placeholder="Введите ФИО сотрудника"
                    />
                    <button
                      type="button"
                      className="btn-add-factor"
                      onClick={() => {
                        const employeeName = newEmployeeName.trim();
                        if (employeeName) {
                          console.log('Adding employee via button:', employeeName);
                          console.log('Current blockingFactors before add:', formData.blockingFactors);
                          setFormData(prev => {
                            const updated = {
                              ...prev,
                              blockingFactors: [...(prev.blockingFactors || []), employeeName]
                            };
                            console.log('Updated blockingFactors after add:', updated.blockingFactors);
                            return updated;
                          });
                          setNewEmployeeName('');
                        }
                      }}
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="actions-row">
            {isAuthenticated && (
              <div>
                {object && (
                  <button type="button" className="btn btn-danger" onClick={handleDelete}>
                    <i className="fas fa-trash"></i> Удалить объект
                  </button>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
              <button type="button" className="btn" onClick={onClose}>
                {isAuthenticated ? 'Отмена' : 'Закрыть'}
              </button>
              {isAuthenticated && (
                <button type="submit" className="btn">
                  {object ? 'Сохранить изменения' : 'Добавить объект'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ObjectModal;
