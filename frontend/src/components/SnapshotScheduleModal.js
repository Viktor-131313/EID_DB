import React, { useState, useEffect } from 'react';
import './SnapshotScheduleModal.css';
import { fetchSnapshotSchedule, saveSnapshotSchedule } from '../services/api-containers';
import ToastNotification from './ToastNotification';
import Tooltip from './Tooltip';

const SnapshotScheduleModal = ({ isOpen, onClose, isAuthenticated }) => {
  const [schedule, setSchedule] = useState({ schedules: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadSchedule();
    }
  }, [isOpen, isAuthenticated]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await fetchSnapshotSchedule();
      setSchedule(data);
    } catch (error) {
      console.error('Error loading snapshot schedule:', error);
      setToast({ message: 'Ошибка загрузки расписания: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = () => {
    setSchedule({
      schedules: [
        ...schedule.schedules,
        { dayOfWeek: 1, hour: 9, minute: 0, enabled: true }
      ]
    });
  };

  const handleRemoveSchedule = (index) => {
    const newSchedules = schedule.schedules.filter((_, i) => i !== index);
    setSchedule({ schedules: newSchedules });
  };

  const handleScheduleChange = (index, field, value) => {
    const newSchedules = [...schedule.schedules];
    let newValue;
    if (field === 'enabled') {
      newValue = value;
    } else if (field === 'dayOfWeek' || field === 'hour' || field === 'minute') {
      const parsed = parseInt(value, 10);
      newValue = isNaN(parsed) ? 0 : parsed;
    } else {
      newValue = value;
    }
    newSchedules[index] = {
      ...newSchedules[index],
      [field]: newValue
    };
    setSchedule({ schedules: newSchedules });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Убеждаемся, что все числовые поля действительно числа
      const scheduleToSave = {
        schedules: schedule.schedules.map(item => ({
          dayOfWeek: typeof item.dayOfWeek === 'number' ? item.dayOfWeek : parseInt(item.dayOfWeek, 10),
          hour: typeof item.hour === 'number' ? item.hour : parseInt(item.hour, 10),
          minute: typeof item.minute === 'number' ? item.minute : parseInt(item.minute, 10),
          enabled: typeof item.enabled === 'boolean' ? item.enabled : item.enabled !== false
        }))
      };
      console.log('Saving schedule:', scheduleToSave);
      await saveSnapshotSchedule(scheduleToSave);
      setToast({ message: 'Расписание успешно сохранено!', type: 'success' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving snapshot schedule:', error);
      setToast({ message: 'Ошибка сохранения расписания: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal snapshot-schedule-modal-overlay" onClick={onClose}>
      <div className="modal-content snapshot-schedule-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="snapshot-schedule-modal-header">
          <h2 className="snapshot-schedule-modal-title">Настройка автоматических снимков планерок</h2>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>

        <div className="snapshot-schedule-modal-body">
          {loading ? (
            <div className="loading-message">Загрузка расписания...</div>
          ) : (
            <>
              <p className="schedule-description">
                Настройте автоматическое создание снимков для планерок. Снимки будут создаваться в указанное время в указанные дни недели.
              </p>

              {schedule.schedules.length === 0 ? (
                <div className="no-schedules">
                  <p>Расписание не настроено. Добавьте первое расписание.</p>
                </div>
              ) : (
                <div className="schedules-list">
                  {schedule.schedules.map((scheduleItem, index) => (
                    <div key={index} className="schedule-item">
                      <div className="schedule-item-header">
                        <label className="schedule-enable-label">
                          <input
                            type="checkbox"
                            checked={scheduleItem.enabled}
                            onChange={(e) => handleScheduleChange(index, 'enabled', e.target.checked)}
                            disabled={!isAuthenticated}
                          />
                          <span>Включено</span>
                        </label>
                        {schedule.schedules.length > 1 && (
                          <button
                            className="btn-remove-schedule"
                            onClick={() => handleRemoveSchedule(index)}
                            disabled={!isAuthenticated}
                          >
                            <Tooltip text="Удалить расписание">
                              <span>
                                <i className="fas fa-trash"></i>
                              </span>
                            </Tooltip>
                          </button>
                        )}
                      </div>

                      <div className="schedule-item-fields">
                        <div className="schedule-field">
                          <label>День недели:</label>
                          <select
                            value={scheduleItem.dayOfWeek}
                            onChange={(e) => handleScheduleChange(index, 'dayOfWeek', e.target.value)}
                            disabled={!isAuthenticated}
                          >
                            {dayNames.map((day, dayIndex) => (
                              <option key={dayIndex} value={dayIndex}>
                                {day}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="schedule-field">
                          <label>Час:</label>
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={scheduleItem.hour}
                            onChange={(e) => handleScheduleChange(index, 'hour', e.target.value)}
                            disabled={!isAuthenticated}
                          />
                        </div>

                        <div className="schedule-field">
                          <label>Минута:</label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={scheduleItem.minute}
                            onChange={(e) => handleScheduleChange(index, 'minute', e.target.value)}
                            disabled={!isAuthenticated}
                          />
                        </div>
                      </div>

                      <div className="schedule-item-preview">
                        <strong>Время создания:</strong> {dayNames[scheduleItem.dayOfWeek]}, {scheduleItem.hour.toString().padStart(2, '0')}:{scheduleItem.minute.toString().padStart(2, '0')} (МСК)
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isAuthenticated && (
                <button
                  className="btn btn-add-schedule"
                  onClick={handleAddSchedule}
                  type="button"
                >
                  <i className="fas fa-plus"></i> Добавить расписание
                </button>
              )}
            </>
          )}
        </div>

        <div className="snapshot-schedule-modal-footer">
          {isAuthenticated && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading || saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            {isAuthenticated ? 'Отмена' : 'Закрыть'}
          </button>
        </div>

        {toast && (
          <ToastNotification
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
};

export default SnapshotScheduleModal;

