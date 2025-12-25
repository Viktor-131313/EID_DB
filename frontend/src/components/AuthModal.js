import React, { useState } from 'react';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (username === 'admin' && password === 'Admin2026!') {
      onLogin();
      setUsername('');
      setPassword('');
      onClose();
    } else {
      setError('Неверный логин или пароль');
    }
  };

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal" onClick={handleClose}>
      <div className="modal-content auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Авторизация администратора</div>
          <button className="close-modal" onClick={handleClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Логин</label>
            <input
              type="text"
              className="form-input"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите логин"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Пароль</label>
            <input
              type="password"
              className="form-input"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
            />
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div className="actions-row">
            <button type="button" className="btn" onClick={handleClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary">
              Войти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;


