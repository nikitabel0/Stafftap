import React, { useState } from 'react';
import { 
  FiClock, 
  FiMapPin, 
  FiUsers, 
  FiCalendar, 
  FiDollarSign,
  FiChevronDown,
  FiChevronUp,
  FiPhone
} from 'react-icons/fi';
import axios from 'axios';

const VacancyCards = ({ vacancy, role }) => {
  // Все хуки должны вызываться безусловно в начале компонента
  const [showWorkers, setShowWorkers] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [error, setError] = useState(null);

  // Проверка vacancy после хуков
  if (!vacancy) {
    return (
      <div className="vacancy-card error-card">
        <div className="vacancy-error">
          <h3>Ошибка загрузки вакансии</h3>
          <p>Информация о вакансии недоступна</p>
        </div>
      </div>
    );
  }

  // Безопасное извлечение значений с значениями по умолчанию
  const title = vacancy.title || 'Без названия';
  const description = vacancy.description || 'Описание отсутствует';
  const rate = vacancy.rate ?? 0;
  const company = vacancy.company_name || 'Компания не указана';
  const address = vacancy.address || 'Адрес не указан';
  const workDate = vacancy.work_date ? new Date(vacancy.work_date) : null;
  const startTime = vacancy.start_time || '--:--';
  const endTime = vacancy.end_time || '--:--';
  const workersNeeded = vacancy.workers_needed ?? 0;
  const remainingSlots = vacancy.remaining_slots ?? 0;
  const jobId = vacancy.id;

  // Функция для загрузки подтвержденных сотрудников
  const loadConfirmedWorkers = async () => {
    setLoadingWorkers(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Токен авторизации отсутствует');
      }

      const response = await axios.get(
        `http://localhost:8000/api/jobs/${jobId}/confirmed_workers`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setWorkers(response.data.map(item => item.worker));
    } catch (err) {
      console.error('Ошибка загрузки сотрудников:', err);
      setError('Не удалось загрузить список сотрудников');
    } finally {
      setLoadingWorkers(false);
    }
  };

  // Обработчик переключения отображения сотрудников
  const toggleWorkersDisplay = () => {
    if (!showWorkers && workers.length === 0) {
      loadConfirmedWorkers();
    }
    setShowWorkers(!showWorkers);
  };

  // Форматирование чисел
  const formatNumber = (num) => {
    const number = Number(num);
    return isNaN(number) ? '0' : number.toLocaleString('ru-RU');
  };

  // Форматирование даты
  const formatDate = (date) => {
    if (!date) return 'Дата не указана';
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="vacancy-card">
      <div className="vacancy-header">
        <h3 className="vacancy-title">{title}</h3>
        <div className="vacancy-company">{company}</div>
      </div>
      
      <div className="vacancy-body">
        <p className="vacancy-description">{description}</p>
        
        <div className="vacancy-meta">
          <div className="meta-item">
            <FiDollarSign className="meta-icon" />
            <span>{formatNumber(rate)} ₽</span>
          </div>
          
          <div className="meta-item">
            <FiCalendar className="meta-icon" />
            <span>{formatDate(workDate)}</span>
          </div>
          
          <div className="meta-item">
            <FiClock className="meta-icon" />
            <span>{startTime} - {endTime}</span>
          </div>
          
          <div className="meta-item">
            <FiMapPin className="meta-icon" />
            <span>{address}</span>
          </div>
          
          <div className="meta-item">
            <FiUsers className="meta-icon" />
            <span>
              {remainingSlots > 0 ? (
                <span className="slots-available">
                  Осталось мест: {remainingSlots}/{workersNeeded}
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
      
      {/* Блок сотрудников (только для работодателя) */}
      {role === 'employer' && (
        <div className="workers-section">
          <button 
            className="toggle-workers-btn"
            onClick={toggleWorkersDisplay}
          >
            {showWorkers ? (
              <>
                <FiChevronUp /> Скрыть сотрудников
              </>
            ) : (
              <>
                <FiChevronDown /> Показать сотрудников
              </>
            )}
          </button>
          
          {showWorkers && (
            <div className="workers-container">
              <h4>Подтвержденные сотрудники:</h4>
              
              {loadingWorkers ? (
                <div className="loading-workers">
                  <p>Загрузка данных о сотрудниках...</p>
                </div>
              ) : error ? (
                <div className="workers-error">
                  <p>{error}</p>
                </div>
              ) : workers.length > 0 ? (
                <div className="workers-list">
                  {workers.map(worker => (
                    <div key={worker.id} className="worker-item">
                      <div className="worker-avatar">
                        {worker.avatar_url ? (
                          <img 
                            src={worker.avatar_url} 
                            alt={`${worker.first_name} ${worker.last_name}`} 
                            className="worker-avatar-img"
                          />
                        ) : (
                          <div className="avatar-initials">
                            {worker.first_name?.[0]}{worker.last_name?.[0]}
                          </div>
                        )}
                      </div>
                      
                      <div className="worker-info">
                        <div className="worker-name">
                          {worker.first_name} {worker.last_name}
                        </div>
                        
                        {worker.phone && (
                          <div className="worker-phone">
                            <FiPhone className="phone-icon" />
                            <span>{worker.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-workers">
                  <p>На эту вакансию еще не приняты сотрудники</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VacancyCards;