import React, { useEffect } from 'react';
import './ToastNotification.css';

const ToastNotification = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div className={`toast-notification toast-${type}`}>
      <div className="toast-content">
        <div className="toast-icon">
          {type === 'success' && <i className="fas fa-check-circle"></i>}
          {type === 'error' && <i className="fas fa-exclamation-circle"></i>}
          {type === 'info' && <i className="fas fa-info-circle"></i>}
        </div>
        <div className="toast-message">{message}</div>
        <button className="toast-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;

