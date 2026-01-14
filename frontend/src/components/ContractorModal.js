import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ContractorModal.css';
import ConfirmModal from './ConfirmModal';
import Tooltip from './Tooltip';

const ContractorModal = ({ contractor, object, onSave, onClose, isAuthenticated = false }) => {
  // Получаем информацию о корпусе и секции из contractor
  const buildingName = contractor._buildingName || '';
  const sectionName = contractor._sectionName || '';
  const [formData, setFormData] = useState({
    name: '',
    workType: '',
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
  const [editingSMRList, setEditingSMRList] = useState(null);
  const [selectedSMRId, setSelectedSMRId] = useState(null);
  const [selectedSMRList, setSelectedSMRList] = useState(null);
  const [confirmDeleteSMR, setConfirmDeleteSMR] = useState(null);

  const isInitializedRef = useRef(false);
  const lastContractorIdRef = useRef(null);
  const mouseDownInsideRef = useRef(false);
  const modalContentRef = useRef(null);

  useEffect(() => {
    const currentContractorId = contractor?.id || null;
    
    if (!isInitializedRef.current || lastContractorIdRef.current !== currentContractorId) {
      isInitializedRef.current = true;
      lastContractorIdRef.current = currentContractorId;
      
      if (contractor) {
        let generatedActs = contractor.generatedActs || [];
        let sentForApproval = contractor.sentForApproval || [];
        let approvedActs = contractor.approvedActs || [];
        let rejectedActs = contractor.rejectedActs || [];
        let signedActs = contractor.signedActs || [];
        const blockingFactors = Array.isArray(contractor.blockingFactors) ? contractor.blockingFactors : [];
        
        if (!Array.isArray(generatedActs)) generatedActs = [];
        if (!Array.isArray(sentForApproval)) sentForApproval = [];
        if (!Array.isArray(approvedActs)) approvedActs = [];
        if (!Array.isArray(rejectedActs)) rejectedActs = [];
        if (!Array.isArray(signedActs)) signedActs = [];
        
        setFormData({
          name: contractor.name || '',
          workType: contractor.workType || '',
          generatedActs,
          sentForApproval,
          approvedActs,
          rejectedActs,
          signedActs,
          blockingFactors
        });
      } else {
        setFormData({
          name: '',
          workType: '',
          generatedActs: [],
          sentForApproval: [],
          approvedActs: [],
          rejectedActs: [],
          signedActs: [],
          blockingFactors: []
        });
      }
    }
  }, [contractor]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateGeneratedCount = (id, count) => {
    setFormData(prev => {
      if (!Array.isArray(prev.generatedActs)) return prev;
      return {
        ...prev,
        generatedActs: prev.generatedActs.map(smr =>
          smr.id === id ? { ...smr, count: parseInt(count) || 0 } : smr
        )
      };
    });
  };

  const updateTotalCount = (id, total) => {
    setFormData(prev => {
      if (!Array.isArray(prev.generatedActs)) return prev;
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
      if (!Array.isArray(prev.sentForApproval)) return prev;
      
      const newSentCount = parseInt(count) || 0;
      
      // Находим текущие значения approved и rejected для этого СМР
      const approvedSMR = prev.approvedActs.find(s => s.id === id);
      const approvedCount = approvedSMR?.count || 0;
      const rejectedSMR = prev.rejectedActs.find(s => s.id === id);
      const rejectedCount = rejectedSMR?.count || 0;
      
      // Если новое значение sent меньше, чем approved + rejected, нужно скорректировать
      let adjustedApproved = approvedCount;
      let adjustedRejected = rejectedCount;
      
      if (approvedCount + rejectedCount > newSentCount) {
        // Если сумма превышает новое значение sent, пропорционально уменьшаем
        // Сначала пытаемся сохранить пропорции, но если не получается - приоритет у approved
        if (approvedCount <= newSentCount) {
          adjustedRejected = Math.max(0, newSentCount - approvedCount);
        } else {
          adjustedApproved = newSentCount;
          adjustedRejected = 0;
        }
      }
      
      return {
        ...prev,
        sentForApproval: prev.sentForApproval.map(smr =>
          smr.id === id ? { ...smr, count: newSentCount } : smr
        ),
        approvedActs: prev.approvedActs.map(smr =>
          smr.id === id ? { ...smr, count: adjustedApproved } : smr
        ),
        rejectedActs: prev.rejectedActs.map(smr =>
          smr.id === id ? { ...smr, count: adjustedRejected } : smr
        )
      };
    });
  };

  const updateApprovedCount = (id, count) => {
    setFormData(prev => {
      if (!Array.isArray(prev.approvedActs)) return prev;
      
      const newCount = parseInt(count) || 0;
      
      // Находим количество отправленных на согласование для этого СМР
      const sentSMR = prev.sentForApproval.find(s => s.id === id);
      const sentCount = sentSMR?.count || 0;
      
      // Находим текущее количество отклоненных для этого СМР
      const rejectedSMR = prev.rejectedActs.find(s => s.id === id);
      const rejectedCount = rejectedSMR?.count || 0;
      
      // Валидация: approved + rejected не может быть больше, чем sent
      const maxApproved = Math.max(0, sentCount - rejectedCount);
      const validatedCount = Math.min(newCount, maxApproved);
      
      // Находим текущее количество подписанных для этого СМР
      const signedSMR = prev.signedActs.find(s => s.id === id);
      const signedCount = signedSMR?.count || 0;
      
      // Если новое значение approved меньше, чем signed, нужно скорректировать signed
      const adjustedSigned = Math.min(signedCount, validatedCount);
      
      return {
        ...prev,
        approvedActs: prev.approvedActs.map(smr =>
          smr.id === id ? { ...smr, count: validatedCount } : smr
        ),
        signedActs: prev.signedActs.map(smr =>
          smr.id === id ? { ...smr, count: adjustedSigned } : smr
        )
      };
    });
  };

  const updateRejectedCount = (id, count) => {
    setFormData(prev => {
      if (!Array.isArray(prev.rejectedActs)) return prev;
      
      const newCount = parseInt(count) || 0;
      
      // Находим количество отправленных на согласование для этого СМР
      const sentSMR = prev.sentForApproval.find(s => s.id === id);
      const sentCount = sentSMR?.count || 0;
      
      // Находим текущее количество согласованных для этого СМР
      const approvedSMR = prev.approvedActs.find(s => s.id === id);
      const approvedCount = approvedSMR?.count || 0;
      
      // Валидация: approved + rejected не может быть больше, чем sent
      const maxRejected = Math.max(0, sentCount - approvedCount);
      const validatedCount = Math.min(newCount, maxRejected);
      
      return {
        ...prev,
        rejectedActs: prev.rejectedActs.map(smr =>
          smr.id === id ? { ...smr, count: validatedCount } : smr
        )
      };
    });
  };

  const updateSignedCount = (id, count) => {
    setFormData(prev => {
      if (!Array.isArray(prev.signedActs)) return prev;
      
      const newCount = parseInt(count) || 0;
      
      // Находим количество согласованных для этого СМР
      const approvedSMR = prev.approvedActs.find(s => s.id === id);
      const approvedCount = approvedSMR?.count || 0;
      
      // Валидация: signed не может быть больше, чем approved
      const validatedCount = Math.min(newCount, approvedCount);
      
      return {
        ...prev,
        signedActs: prev.signedActs.map(smr =>
          smr.id === id ? { ...smr, count: validatedCount } : smr
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
  };

  const deleteSMR = useCallback((smrId, listType) => {
    if (!isAuthenticated || !smrId) return;

    let smrName = '';
    const allSMRs = [
      ...formData.generatedActs,
      ...formData.sentForApproval,
      ...formData.approvedActs,
      ...formData.rejectedActs,
      ...formData.signedActs
    ];
    const smr = allSMRs.find(s => s.id === smrId);
    smrName = smr ? smr.name : 'СМР';

    setConfirmDeleteSMR({ smrId, listType, smrName });
  }, [isAuthenticated, formData]);

  const handleConfirmDeleteSMR = useCallback(() => {
    if (!confirmDeleteSMR) return;
    const { smrId, listType } = confirmDeleteSMR;

    setFormData(prev => {
      const updated = { ...prev };
      if (listType === 'generated') {
        updated.generatedActs = prev.generatedActs.filter(smr => smr.id !== smrId);
        updated.sentForApproval = prev.sentForApproval.filter(smr => smr.id !== smrId);
        updated.approvedActs = prev.approvedActs.filter(smr => smr.id !== smrId);
        updated.rejectedActs = prev.rejectedActs.filter(smr => smr.id !== smrId);
        updated.signedActs = prev.signedActs.filter(smr => smr.id !== smrId);
      } else if (listType === 'sent') {
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
    setConfirmDeleteSMR(null);
  }, [confirmDeleteSMR]);

  const handleCancelDeleteSMR = useCallback(() => {
    setConfirmDeleteSMR(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (confirmDeleteSMR !== null) return;
      if (e.target.tagName === 'INPUT' && e.target.type === 'text' && !e.target.className.includes('smr-name-edit')) {
        return;
      }

      if (e.key === 'Delete' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (editingSMRId && editingSMRList) {
          e.preventDefault();
          e.stopPropagation();
          deleteSMR(editingSMRId, editingSMRList);
        } else if (selectedSMRId && selectedSMRList) {
          e.preventDefault();
          e.stopPropagation();
          deleteSMR(selectedSMRId, selectedSMRList);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [editingSMRId, editingSMRList, selectedSMRId, selectedSMRList, confirmDeleteSMR, deleteSMR]);

  const addNewSMR = () => {
    if (!newSMRName.trim()) {
      alert('Введите название СМР');
      return;
    }

    if (!Array.isArray(formData.generatedActs) || !Array.isArray(formData.sentForApproval)) {
      alert('Ошибка: данные не загружены');
      return;
    }

    const newSMRId = Date.now();
    const newSMR = {
      id: newSMRId,
      name: newSMRName.trim(),
      count: 0,
      total: 0
    };

    setFormData(prev => ({
      ...prev,
      generatedActs: [...prev.generatedActs, newSMR],
      sentForApproval: [...prev.sentForApproval, { ...newSMR, count: 0 }],
      approvedActs: [...prev.approvedActs, { ...newSMR, count: 0 }],
      rejectedActs: [...prev.rejectedActs, { ...newSMR, count: 0 }],
      signedActs: [...prev.signedActs, { ...newSMR, count: 0 }]
    }));

    setNewSMRName('');
  };

  const addBlockingFactor = () => {
    if (!newEmployeeName.trim()) {
      alert('Введите ФИО сотрудника');
      return;
    }

    setFormData(prev => ({
      ...prev,
      blockingFactors: [...prev.blockingFactors, newEmployeeName.trim()]
    }));

    setNewEmployeeName('');
  };

  const removeBlockingFactor = (index) => {
    setFormData(prev => ({
      ...prev,
      blockingFactors: prev.blockingFactors.filter((_, i) => i !== index)
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave(formData);
    }
  };

  const calculateTotalGenerated = () => {
    return formData.generatedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
  };

  const calculateTotalGeneratedFrom = () => {
    return formData.generatedActs.reduce((sum, smr) => sum + (smr.total || 0), 0);
  };

  const calculateTotalSent = () => {
    return formData.sentForApproval.reduce((sum, smr) => sum + (smr.count || 0), 0);
  };

  const calculateTotalApproved = () => {
    return formData.approvedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
  };

  const calculateTotalRejected = () => {
    return formData.rejectedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
  };

  const calculateTotalSigned = () => {
    return formData.signedActs.reduce((sum, smr) => sum + (smr.count || 0), 0);
  };

  const totalGenerated = calculateTotalGenerated();
  const totalGeneratedFrom = calculateTotalGeneratedFrom();
  const totalSent = calculateTotalSent();
  const totalApproved = calculateTotalApproved();
  const totalRejected = calculateTotalRejected();
  const totalSigned = calculateTotalSigned();
  const generatedPercent = totalGeneratedFrom > 0 ? Math.round((totalGenerated / totalGeneratedFrom) * 100) : 0;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !mouseDownInsideRef.current) {
      onClose();
    }
  };

  const handleModalContentMouseDown = () => {
    mouseDownInsideRef.current = true;
  };

  const handleBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      mouseDownInsideRef.current = false;
    }
  };

  // Рендеринг секции СМР (используем тот же код что и в ObjectModal)
  const renderSMRSection = (title, list, total, listType, updateCountFn, expandedKey) => {
    return (
      <div className="form-section">
        <div 
          className="form-section-header"
          onClick={() => toggleSection(expandedKey)}
        >
          <div>
            <i className={`fas fa-chevron-${expandedSections[expandedKey] ? 'down' : 'right'}`}></i>
            <span className="form-section-title">{title}</span>
            <span className="form-section-count">({total})</span>
          </div>
        </div>
        
        {expandedSections[expandedKey] && (
          <div className="form-section-content">
            {listType === 'generated' && (
              <div className="smr-columns-header">
                <div className="smr-column-header-name">СМР</div>
                <div className="smr-column-header-count">Praktis ID</div>
                <div className="smr-column-header-separator"></div>
                <div className="smr-column-header-total">СЗ Icona</div>
              </div>
            )}
            {Array.isArray(list) && list.map(smr => (
              <div
                key={smr.id}
                className={`smr-item ${selectedSMRId === smr.id && selectedSMRList === listType ? 'smr-item-selected' : ''}`}
                onClick={() => handleSMRClick(smr.id, listType)}
              >
                {editingSMRId === smr.id && editingSMRList === listType ? (
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
                  <Tooltip text={isAuthenticated ? "Двойной клик для переименования, Delete для удаления" : ""}>
                    <label
                      className={isAuthenticated ? "smr-label smr-label-editable" : "smr-label"}
                      onDoubleClick={isAuthenticated ? (e) => {
                        e.stopPropagation();
                        handleSMRDoubleClick(smr.id, smr.name, listType);
                      } : undefined}
                      style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
                    >
                      {smr.name}
                    </label>
                  </Tooltip>
                )}
                {listType === 'generated' ? (
                  <>
                    <input
                      type="number"
                      className="smr-input"
                      value={smr.count || 0}
                      onChange={(e) => updateGeneratedCount(smr.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      min="0"
                      max={smr.total || undefined}
                      disabled={!isAuthenticated}
                      readOnly={!isAuthenticated}
                    />
                    <span className="smr-input-separator">из</span>
                    <input
                      type="number"
                      className="smr-input"
                      value={smr.total || 0}
                      onChange={(e) => updateTotalCount(smr.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      min="0"
                      disabled={!isAuthenticated}
                      readOnly={!isAuthenticated}
                    />
                  </>
                ) : (
                  <input
                    type="number"
                    className="smr-input"
                    value={smr.count || 0}
                    onChange={(e) => updateCountFn(smr.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    min="0"
                    max={(() => {
                      // Для "отправлено на согласование" - ограничение по сгенерированным
                      if (listType === 'sent') {
                        return formData.generatedActs.find(s => s.id === smr.id)?.count || 0;
                      }
                      // Для "согласовано" - ограничение: sent - rejected
                      if (listType === 'approved') {
                        const sentSMR = formData.sentForApproval.find(s => s.id === smr.id);
                        const sentCount = sentSMR?.count || 0;
                        const rejectedSMR = formData.rejectedActs.find(s => s.id === smr.id);
                        const rejectedCount = rejectedSMR?.count || 0;
                        return Math.max(0, sentCount - rejectedCount);
                      }
                      // Для "отклонено" - ограничение: sent - approved
                      if (listType === 'rejected') {
                        const sentSMR = formData.sentForApproval.find(s => s.id === smr.id);
                        const sentCount = sentSMR?.count || 0;
                        const approvedSMR = formData.approvedActs.find(s => s.id === smr.id);
                        const approvedCount = approvedSMR?.count || 0;
                        return Math.max(0, sentCount - approvedCount);
                      }
                      // Для "подписано" - ограничение по согласованным
                      if (listType === 'signed') {
                        const approvedSMR = formData.approvedActs.find(s => s.id === smr.id);
                        return approvedSMR?.count || 0;
                      }
                      return undefined;
                    })()}
                    disabled={!isAuthenticated}
                    readOnly={!isAuthenticated}
                  />
                )}
              </div>
            ))}
            {listType === 'generated' && isAuthenticated && (
              <div className="add-smr-section">
                <input
                  type="text"
                  className="new-smr-input"
                  value={newSMRName}
                  onChange={(e) => setNewSMRName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addNewSMR();
                    }
                  }}
                  placeholder="Название СМР"
                />
                <button type="button" className="btn-add-smr" onClick={addNewSMR}>
                  + Добавить СМР
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal" onClick={handleBackdropClick} onMouseDown={handleBackdropMouseDown}>
      <div 
        ref={modalContentRef}
        className="modal-content contractor-modal-content" 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleModalContentMouseDown}
      >
        <div className="modal-header">
          <div className="modal-title">
            <h2>{formData.name || 'Подрядчик'}</h2>
            {formData.workType && <div className="work-type-badge">{formData.workType}</div>}
            {buildingName && sectionName && (
              <div className="location-badge">
                Корпус {buildingName}, Секция {sectionName}
              </div>
            )}
          </div>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="contractorName">Название подрядчика</label>
            <input
              type="text"
              className="form-input"
              id="contractorName"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Например: ООО «СК-Монолит»"
              required
              disabled={!isAuthenticated}
              readOnly={!isAuthenticated}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="workType">Вид работ</label>
            <input
              type="text"
              className="form-input"
              id="workType"
              name="workType"
              value={formData.workType}
              onChange={handleChange}
              placeholder="Например: ОВ и ВК, Кладка"
              disabled={!isAuthenticated}
              readOnly={!isAuthenticated}
            />
          </div>

          {renderSMRSection(
            'Сгенерированных актов',
            formData.generatedActs,
            `${totalGenerated} из ${totalGeneratedFrom} - ${generatedPercent}%`,
            'generated',
            updateGeneratedCount,
            'generated'
          )}

          {renderSMRSection(
            'Актов отправлено на согласование',
            formData.sentForApproval,
            totalSent,
            'sent',
            updateSentCount,
            'sent'
          )}

          {renderSMRSection(
            'Актов согласовано',
            formData.approvedActs,
            totalApproved,
            'approved',
            updateApprovedCount,
            'approved'
          )}

          {renderSMRSection(
            'Актов отклонено',
            formData.rejectedActs,
            totalRejected,
            'rejected',
            updateRejectedCount,
            'rejected'
          )}

          {renderSMRSection(
            'Актов подписано',
            formData.signedActs,
            totalSigned,
            'signed',
            updateSignedCount,
            'signed'
          )}

          {/* Блокирующие факты */}
          <div className="form-section">
            <div className="form-section-header">
              <div>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px', color: '#f39c12' }}></i>
                <span className="form-section-title">Блокирующие факты</span>
              </div>
            </div>
            <div className="form-section-content">
              <div className="blocking-factors-list">
                {formData.blockingFactors.map((employee, index) => (
                  <div key={index} className="blocking-factor-item">
                    <span>{employee}</span>
                    {isAuthenticated && (
                      <button
                        type="button"
                        className="btn-remove-factor"
                        onClick={() => removeBlockingFactor(index)}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {isAuthenticated && (
                <div className="add-blocking-factor">
                  <input
                    type="text"
                    className="new-employee-input"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addBlockingFactor();
                      }
                    }}
                    placeholder="Введите ФИО сотрудника"
                  />
                  <button type="button" className="btn-add-factor" onClick={addBlockingFactor}>
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Отмена
            </button>
            {isAuthenticated && (
              <button type="submit" className="btn-save">
                Сохранить изменения
              </button>
            )}
          </div>
        </form>

        {confirmDeleteSMR && (
          <ConfirmModal
            isOpen={true}
            title="Подтверждение удаления СМР"
            message={`Вы уверены, что хотите удалить СМР "${confirmDeleteSMR.smrName}"? Это действие нельзя отменить.`}
            onConfirm={handleConfirmDeleteSMR}
            onCancel={handleCancelDeleteSMR}
            confirmText="Да, удалить"
            cancelText="Отмена"
            type="danger"
          />
        )}
      </div>
    </div>
  );
};

export default ContractorModal;

