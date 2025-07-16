import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiClock, 
  FiMapPin, 
  FiUsers, 
  FiCalendar, 
  FiDollarSign,
  FiArrowLeft,
  FiPhone,
  FiUser,
  FiWifiOff,
  FiRefreshCw,
  FiTrash2,
  FiX,
  FiCheck
} from 'react-icons/fi';
import axios from 'axios';
import API_BASE_URL from '../../apiConfig';

const JobDetailPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);

  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  const fetchCurrentUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (err) {
      console.error('Ошибка загрузки пользователя:', err);
    }
  };

  const fetchJobDetails = async () => {
    setIsLoading(true);
    setError(null);
    setIsNetworkError(false);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Требуется авторизация');
      }

      const jobUrl = `${API_BASE_URL}/api/jobs/${jobId}`;
      const workersUrl = `${API_BASE_URL}/api/jobs/${jobId}/confirmed_workers`;
      
      const [jobResponse, workersResponse] = await Promise.all([
        axios.get(jobUrl, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }),
        axios.get(workersUrl, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        })
      ]);
      
      setJob(jobResponse.data);
      setWorkers(workersResponse.data);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      
      if (err.code === "ECONNABORTED" || err.message === "Network Error" || !err.response) {
        setIsNetworkError(true);
        setError('Ошибка сети. Проверьте подключение к интернету');
      } 
      else if (err.response) {
        switch (err.response.status) {
          case 401:
            setError('Сессия истекла. Пожалуйста, войдите снова.');
            break;
          case 403:
            setError('Недостаточно прав для просмотра этой вакансии');
            break;
          case 404:
            setError('Вакансия не найдена');
            break;
          case 500:
            setError('Ошибка сервера. Пожалуйста, попробуйте позже');
            break;
          default:
            setError(`Не удалось загрузить данные (код ${err.response.status})`);
        }
      } else {
        setError('Неизвестная ошибка: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchJobDetails();
  }, [jobId]);

  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ type: '', message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const formatNumber = (num) => {
    const number = Number(num);
    return isNaN(number) ? '0' : number.toLocaleString('ru-RU');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Дата не указана';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const openConfirmModal = (workerId) => {
    setSelectedWorker(workerId);
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setSelectedWorker(null);
  };

  const handleRemoveWorker = async () => {
    if (!selectedWorker) return;
    
    try {
      setIsLoading(true);
      const token = getAuthToken();
      
      await axios.delete(
        `${API_BASE_URL}/api/bookings/remove_worker/${jobId}/${selectedWorker}`, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Обновляем данные после успешного удаления
      await fetchJobDetails();
      setNotification({ 
        type: 'success', 
        message: 'Работник успешно удален с вакансии' 
      });
    } catch (err) {
      console.error('Ошибка удаления работника:', err);
      
      let errorMessage = 'Не удалось удалить работника';
      if (err.response) {
        switch (err.response.status) {
          case 400:
            errorMessage = err.response.data.detail || errorMessage;
            break;
          case 403:
            errorMessage = 'Недостаточно прав для удаления работника';
            break;
          case 404:
            errorMessage = 'Работник не найден на вакансии';
            break;
        }
      }
      
      setNotification({ 
        type: 'error', 
        message: errorMessage 
      });
    } finally {
      setIsLoading(false);
      closeConfirmModal();
    }
  };

  if (isLoading) {
    return (
      <div className="job-detail-loading">
        <div className="loader"></div>
        <p>Загрузка данных о вакансии...</p>
      </div>
    );
  }

  if (isNetworkError) {
    const token = getAuthToken();
    const jobUrl = `${API_BASE_URL}/api/jobs/${jobId}`;
    
    return (
      <div className="network-error-page">
        <div className="error-content">
          <FiWifiOff className="network-error-icon" size={48} />
          <h2>Проблемы с подключением</h2>
          <p>Не удалось подключиться к серверу. Пожалуйста:</p>
          <ul>
            <li>• Проверьте подключение к интернету</li>
            <li>• Убедитесь, что VPN выключен</li>
            <li>• Проверьте настройки межсетевого экрана</li>
            <li>• Попробуйте обновить страницу</li>
          </ul>
          
          <div className="debug-info">
            <p><strong>URL запроса:</strong> {jobUrl}</p>
            <p><strong>Токен:</strong> {token ? "присутствует" : "отсутствует"}</p>
            <p><strong>API Base URL:</strong> {API_BASE_URL}</p>
          </div>
          
          <div className="error-actions">
            <button 
              className="retry-button"
              onClick={fetchJobDetails}
            >
              <FiRefreshCw className="button-icon" /> Повторить попытку
            </button>
            <button 
              className="back-button"
              onClick={() => navigate(-1)}
            >
              <FiArrowLeft className="button-icon" /> Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="job-detail-error">
        <h2>Ошибка</h2>
        <p>{error}</p>
        <button className="back-button" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Назад
        </button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="job-detail-error">
        <h2>Вакансия не найдена</h2>
        <p>Запрошенная вакансия не существует или была удалена</p>
        <button className="back-button" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Назад
        </button>
      </div>
    );
  }

  return (
    <div className="job-detail-page">
      {/* Уведомления */}
      {notification.message && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' 
              ? <FiCheck className="notification-icon" /> 
              : <FiX className="notification-icon" />}
            <span>{notification.message}</span>
          </div>
          <button 
            className="notification-close"
            onClick={() => setNotification({ type: '', message: '' })}
          >
            <FiX />
          </button>
        </div>
      )}

      {/* Модальное окно подтверждения */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Подтверждение удаления</h3>
              <button className="modal-close" onClick={closeConfirmModal}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p>Вы уверены, что хотите удалить этого работника с вакансии?</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={closeConfirmModal}
                disabled={isLoading}
              >
                Отмена
              </button>
              <button 
                className="btn-confirm"
                onClick={handleRemoveWorker}
                disabled={isLoading}
              >
                {isLoading ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="back-button" onClick={() => navigate(-1)}>
        <FiArrowLeft /> Назад
      </button>
      
      <div className="job-detail-card">
        <div className="job-header">
          <h1>{job.title}</h1>
          <div className="job-company">{job.company_name}</div>
        </div>
        
        <div className="job-body">
          <div className="job-description">
            <h3>Описание</h3>
            <p>{job.description}</p>
          </div>
          
          <div className="job-meta">
            <div className="meta-item">
              <FiDollarSign className="meta-icon" />
              <span>{formatNumber(job.rate)} ₽</span>
            </div>
            
            <div className="meta-item">
              <FiCalendar className="meta-icon" />
              <span>{formatDate(job.work_date)}</span>
            </div>
            
            <div className="meta-item">
              <FiClock className="meta-icon" />
              <span>{job.start_time} - {job.end_time}</span>
            </div>
            
            <div className="meta-item">
              <FiMapPin className="meta-icon" />
              <span>{job.address}</span>
            </div>
            
            <div className="meta-item">
              <FiUsers className="meta-icon" />
              <span>
                {job.remaining_slots > 0 ? (
                  <span className="slots-available">
                    Осталось мест: {job.remaining_slots}/{job.workers_needed}
                  </span>
                ) : (
                  <span className="slots-full">
                    Все места заполнены
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
        
        <div className="workers-section">
          <h2>Подтвержденные сотрудники</h2>
          
          {workers.length > 0 ? (
            <div className="workers-list">
              {workers.map(worker => (
                <div key={worker.id} className="worker-card">
                  <div className="worker-avatar">
                    {worker.avatar_url ? (
                      <img 
                        src={worker.avatar_url} 
                        alt={`${worker.first_name} ${worker.last_name}`} 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="avatar-initials">
                      {worker.first_name?.[0] || ''}{worker.last_name?.[0] || ''}
                    </div>
                  </div>
                  
                  <div className="worker-info">
                    <h3>{worker.first_name} {worker.last_name}</h3>
                    
                    <div className="worker-contacts">
                      {worker.phone && (
                        <div className="contact-item">
                          <FiPhone className="contact-icon" />
                          <span>{worker.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="worker-stats">
                      <div className="stat-item">
                        <FiUser className="stat-icon" />
                        <span>Рейтинг: {worker.rating || 'нет оценок'}</span>
                      </div>
                      <div className="stat-item">
                        <span>Выполнено смен: {worker.completed_shifts || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    className="remove-worker-btn"
                    onClick={() => openConfirmModal(worker.id)}
                    disabled={isLoading}
                    title="Удалить работника с вакансии"
                    style={{
                      backgroundColor: '#ff4d4f',
                      color: 'white',
                      padding: '8px 15px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <FiTrash2 size={18} /> Удалить
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-workers">
              <p>На эту вакансию еще не приняты сотрудники</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailPage;