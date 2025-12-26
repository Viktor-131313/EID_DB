import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Да', cancelText = 'Нет', type = 'warning' }) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <div className={`confirm-modal-icon confirm-${type}`}>
            {type === 'warning' && <i className="fas fa-exclamation-triangle"></i>}
            {type === 'danger' && <i className="fas fa-exclamation-circle"></i>}
            {type === 'info' && <i className="fas fa-info-circle"></i>}
          </div>
          <div className="confirm-modal-title">{title}</div>
        </div>
        <div className="confirm-modal-message">{message}</div>
        <div className="confirm-modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`btn btn-primary confirm-${type}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

