import React, { useState, useEffect } from 'react';
import './DevelopmentTasks.css';
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/api-tasks';
import ConfirmModal from './ConfirmModal';

const DevelopmentTasks = ({ isAuthenticated = false }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [editingTask, setEditingTask] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingField, setEditingField] = useState(null); // { taskId, field }
  const [editingValue, setEditingValue] = useState('');
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null); // ID задачи для удаления

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await fetchTasks();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
      alert('Ошибка при загрузке задач');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask && editingTask.id) {
        await updateTask(editingTask.id, taskData);
      } else {
        await createTask(taskData);
      }
      setEditingTask(null);
      setShowAddForm(false);
      await loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Ошибка при сохранении задачи: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteTask = (taskId) => {
    setConfirmDeleteTask(taskId);
  };

  const handleConfirmDeleteTask = async () => {
    if (!confirmDeleteTask) return;
    try {
      await deleteTask(confirmDeleteTask);
      setConfirmDeleteTask(null);
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Ошибка при удалении задачи');
      setConfirmDeleteTask(null);
    }
  };

  const handleCancelDeleteTask = () => {
    setConfirmDeleteTask(null);
  };

  const handleKeyDown = async (e, taskId) => {
    if (!isAuthenticated) return;
    // Если открыто модальное окно подтверждения удаления - не обрабатываем Delete
    if (confirmDeleteTask !== null) return;
    if (e.key === 'Delete' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      // Проверяем, не в поле ввода ли мы
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      e.stopPropagation(); // Останавливаем всплытие события
      handleDeleteTask(taskId);
    }
  };

  const handleFieldEdit = (taskId, field, currentValue) => {
    if (!isAuthenticated) return;
    setEditingField({ taskId, field });
    setEditingValue(currentValue || '');
  };

  const handleFieldSave = async (taskId, field) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updateData = { ...task };
      if (field === 'status') {
        updateData.status = editingValue;
        await updateTask(taskId, updateData);
        setEditingField(null);
        setEditingValue('');
        await loadTasks();
      }
    } catch (error) {
      console.error('Error updating task field:', error);
      alert('Ошибка при обновлении задачи');
    }
  };

  const handleFieldCancel = () => {
    setEditingField(null);
    setEditingValue('');
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowAddForm(false);
  };

  const handleAddNew = () => {
    setEditingTask(null);
    setShowAddForm(true);
  };

  // Фильтрация задач
  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) {
      return false;
    }
    if (filterMonth !== 'all') {
      const taskDate = new Date(task.discoveryDate);
      const taskMonth = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}`;
      if (taskMonth !== filterMonth) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => {
    // Сортировка по критичности: critical (1), non-critical (2), user-request (3)
    const priorityOrder = {
      'critical': 1,
      'non-critical': 2,
      'user-request': 3
    };
    const priorityA = priorityOrder[a.priority || 'non-critical'] || 2;
    const priorityB = priorityOrder[b.priority || 'non-critical'] || 2;
    return priorityA - priorityB;
  });

  // Получаем уникальные месяцы из задач для фильтра
  const availableMonths = Array.from(new Set(
    tasks.map(task => {
      const date = new Date(task.discoveryDate);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    })
  )).sort().reverse();

  if (loading) {
    return <div className="loading">Загрузка задач...</div>;
  }

  return (
    <div className="development-tasks-section">
      <div className="tasks-header">
        <h2>
          <i className="fas fa-tasks"></i> Задачи для разработки
        </h2>
      </div>

      {/* Фильтры */}
      <div className="tasks-filters">
        <div className="filter-group">
          <label>Статус:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Все</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Done">Done</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Месяц обнаружения:</label>
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            <option value="all">Все месяцы</option>
            {availableMonths.map(month => {
              const [year, monthNum] = month.split('-');
              const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                                  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
              return (
                <option key={month} value={month}>
                  {monthNames[parseInt(monthNum) - 1]} {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Таблица задач */}
      <div className="tasks-table-container">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Описание</th>
              <th>Дата обнаружения</th>
              <th>Статус</th>
              <th>Планируется устранить</th>
              <th>Критичность</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map(task => (
              <tr 
                key={task.id}
                onKeyDown={(e) => handleKeyDown(e, task.id)}
                tabIndex={0}
                className="task-row"
              >
                <td>DEV-{task.taskNumber || task.id}</td>
                <td>{task.description}</td>
                <td>{new Date(task.discoveryDate).toLocaleDateString('ru-RU')}</td>
                <td 
                  onClick={() => isAuthenticated && !editingField && handleFieldEdit(task.id, 'status', task.status)}
                  className={isAuthenticated ? "editable-cell" : ""}
                  title={isAuthenticated ? "Кликните для редактирования" : ""}
                  style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
                >
                  {editingField && editingField.taskId === task.id && editingField.field === 'status' ? (
                    <select
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={async () => {
                        try {
                          const updatedTask = { ...task, status: editingValue };
                          await updateTask(task.id, updatedTask);
                          await loadTasks();
                          handleFieldCancel();
                        } catch (error) {
                          console.error('Error updating status:', error);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleFieldSave(task.id, 'status');
                        } else if (e.key === 'Escape') {
                          handleFieldCancel();
                        }
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Done">Done</option>
                    </select>
                  ) : (
                    <span className={`task-status task-status-${task.status.replace(' ', '-').toLowerCase()}`}>
                      {task.status}
                    </span>
                  )}
                </td>
                <td 
                  onClick={() => isAuthenticated && !editingField && handleFieldEdit(task.id, 'plannedFix', `${task.plannedFixMonth || ''}/${task.plannedFixYear || ''}`)}
                  className={isAuthenticated ? "editable-cell" : ""}
                  title={isAuthenticated ? "Кликните для редактирования" : ""}
                  style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
                >
                  {editingField && editingField.taskId === task.id && editingField.field === 'plannedFix' ? (
                    <div className="planned-fix-edit" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={task.plannedFixMonth || ''}
                        onChange={async (e) => {
                          const month = e.target.value;
                          const updatedTask = { ...task, plannedFixMonth: month };
                          try {
                            await updateTask(task.id, updatedTask);
                            await loadTasks();
                          } catch (error) {
                            console.error('Error updating planned fix month:', error);
                          }
                        }}
                        autoFocus
                      >
                        <option value="">Месяц</option>
                        {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                          <option key={m} value={m}>{['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'][parseInt(m) - 1]}</option>
                        ))}
                      </select>
                      <select
                        value={task.plannedFixYear || ''}
                        onChange={async (e) => {
                          const year = e.target.value;
                          const updatedTask = { ...task, plannedFixYear: year ? parseInt(year) : null };
                          try {
                            await updateTask(task.id, updatedTask);
                            await loadTasks();
                            handleFieldCancel();
                          } catch (error) {
                            console.error('Error updating planned fix year:', error);
                          }
                        }}
                      >
                        <option value="">Год</option>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    task.plannedFixMonth && task.plannedFixYear 
                      ? `${task.plannedFixMonth}/${task.plannedFixYear}` 
                      : 'Не указано'
                  )}
                </td>
                <td>
                  <div className="task-priority">
                    {task.priority === 'critical' && (
                      <span className="priority-icon priority-critical" title="Критично">
                        <i className="fas fa-exclamation-circle"></i>
                      </span>
                    )}
                    {task.priority === 'non-critical' && (
                      <span className="priority-icon priority-non-critical" title="Некритично">
                        <i className="fas fa-exclamation-triangle"></i>
                      </span>
                    )}
                    {task.priority === 'user-request' && (
                      <span className="priority-icon priority-user-request" title="Пожелания от пользователей">
                        <i className="fas fa-lightbulb"></i>
                      </span>
                    )}
                    {!task.priority && (
                      <span className="priority-icon priority-non-critical" title="Некритично">
                        <i className="fas fa-exclamation-triangle"></i>
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {isAuthenticated && (
                    <>
                      <button 
                        className="btn-edit-task" 
                        onClick={() => handleEditTask(task)}
                        title="Редактировать"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="btn-delete-task" 
                        onClick={() => handleDeleteTask(task.id)}
                        title="Удалить (или нажмите Delete)"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-tasks">
                  Нет задач для отображения
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Кнопка добавления */}
      {isAuthenticated && (
        <div className="tasks-footer">
          <button className="btn-add-task" onClick={handleAddNew}>
            <i className="fas fa-plus"></i> Добавить задачу
          </button>
        </div>
      )}

      {/* Модальное окно для редактирования/добавления задачи */}
      {(editingTask !== null || showAddForm) && (
        <TaskModal
          task={editingTask}
          onSave={handleSaveTask}
          onClose={() => {
            setEditingTask(null);
            setShowAddForm(false);
          }}
        />
      )}

      {/* Модальное окно подтверждения удаления задачи */}
      <ConfirmModal
        isOpen={confirmDeleteTask !== null}
        title="Подтверждение удаления задачи"
        message="Внимание! Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить."
        onConfirm={handleConfirmDeleteTask}
        onCancel={handleCancelDeleteTask}
        confirmText="Да, удалить"
        cancelText="Отмена"
        type="danger"
      />
    </div>
  );
};

// Модальное окно для редактирования задачи
const TaskModal = ({ task, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    taskNumber: task?.taskNumber || '',
    description: task?.description || '',
    discoveryDate: task?.discoveryDate ? new Date(task.discoveryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: task?.status || 'To Do',
    plannedFixMonth: task?.plannedFixMonth || '',
    plannedFixYear: task?.plannedFixYear || '',
    priority: task?.priority || 'non-critical'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const taskData = {
      ...formData,
      taskNumber: formData.taskNumber ? parseInt(formData.taskNumber) : null,
      plannedFixMonth: formData.plannedFixMonth || null,
      plannedFixYear: formData.plannedFixYear ? parseInt(formData.plannedFixYear) : null
    };
    onSave(taskData);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);
  const months = [
    { value: '01', label: 'Январь' },
    { value: '02', label: 'Февраль' },
    { value: '03', label: 'Март' },
    { value: '04', label: 'Апрель' },
    { value: '05', label: 'Май' },
    { value: '06', label: 'Июнь' },
    { value: '07', label: 'Июль' },
    { value: '08', label: 'Август' },
    { value: '09', label: 'Сентябрь' },
    { value: '10', label: 'Октябрь' },
    { value: '11', label: 'Ноябрь' },
    { value: '12', label: 'Декабрь' }
  ];

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content task-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {task ? 'Редактировать задачу' : 'Добавить новую задачу'}
          </div>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              ID: <strong>DEV-</strong>
              <input
                type="number"
                className="form-input task-number-input"
                name="taskNumber"
                value={formData.taskNumber}
                onChange={handleChange}
                placeholder="Номер задачи"
                min="1"
              />
            </label>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="taskDescription">Описание задачи</label>
            <input
              type="text"
              className="form-input"
              id="taskDescription"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Краткое описание задачи"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="discoveryDate">Дата обнаружения</label>
            <input
              type="date"
              className="form-input"
              id="discoveryDate"
              name="discoveryDate"
              value={formData.discoveryDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="status">Статус</label>
            <select
              className="form-input"
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Done">Done</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Планируется устранить</label>
            <div className="planned-fix-inputs">
              <select
                className="form-input"
                name="plannedFixMonth"
                value={formData.plannedFixMonth}
                onChange={handleChange}
              >
                <option value="">Месяц (не указано)</option>
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              <select
                className="form-input"
                name="plannedFixYear"
                value={formData.plannedFixYear}
                onChange={handleChange}
              >
                <option value="">Год (не указано)</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="priority">Критичность</label>
            <select
              className="form-input"
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              required
            >
              <option value="critical">Критично</option>
              <option value="non-critical">Некритично</option>
              <option value="user-request">Пожелания от пользователей</option>
            </select>
          </div>

          <div className="actions-row">
            <div></div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn" onClick={onClose}>
                Отмена
              </button>
              <button type="submit" className="btn">
                {task ? 'Сохранить изменения' : 'Добавить задачу'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DevelopmentTasks;

