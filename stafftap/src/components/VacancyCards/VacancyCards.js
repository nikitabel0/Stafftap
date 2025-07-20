import React from 'react';
import { 
  FiClock, 
  FiMapPin, 
  FiUsers, 
  FiCalendar, 
  FiDollarSign
} from 'react-icons/fi';
import styles from './VacancyCard.module.css';
import { useNavigate } from 'react-router-dom';

const VacancyCards = ({ vacancy, role }) => {
  const navigate = useNavigate();
  
  // Извлекаем свойства вакансии с проверкой
  const title = vacancy?.title || 'Без названия';
  const description = vacancy?.description || 'Описание отсутствует';
  const rate = vacancy?.rate ?? 0;
  const company = vacancy?.company_name || 'Компания не указана';
  const address = vacancy?.address || 'Адрес не указан';
  const workDate = vacancy?.work_date ? new Date(vacancy.work_date) : null;
  const startTime = vacancy?.start_time || '--:--';
  const endTime = vacancy?.end_time || '--:--';
  const workersNeeded = vacancy?.workers_needed ?? 0;
  const remainingSlots = vacancy?.remaining_slots ?? 0;

  // Обработчик клика по вакансии
  const handleVacancyClick = () => {
    navigate(`/job/${vacancy.id}`);
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

  // Рассчет прогресса заполнения вакансии
  const progress = workersNeeded > 0 
    ? Math.round((remainingSlots / workersNeeded) * 100)
    : 0;

  return (
    <div 
      className={`${styles['vacancy-card']}`} 
      onClick={handleVacancyClick}
      style={{ '--progress': `${100 - progress}%` }}
    >
      <div className={styles['vacancy-header']}>
        <h3 className={styles['vacancy-title']}>{title}</h3>
        <div className={styles['vacancy-company']}>
          {company}
        </div>
      </div>
      
      <div className={styles['vacancy-body']}>
        <p className={styles['vacancy-description']}>{description}</p>
        
        <div className={styles['vacancy-meta']}>
          <div className={styles['meta-item']}>
            <FiDollarSign className={styles['meta-icon']} />
            <span className={styles['meta-content']}>
              <span className={styles['meta-text']}>
                {formatNumber(rate)} ₽
              </span>
            </span>
          </div>
          
          <div className={styles['meta-item']}>
            <FiCalendar className={styles['meta-icon']} />
            <span className={styles['meta-content']}>
              <span className={styles['meta-text']}>
                {formatDate(workDate)}
              </span>
            </span>
          </div>
          
          <div className={styles['meta-item']}>
            <FiClock className={styles['meta-icon']} />
            <span className={styles['meta-content']}>
              <span className={styles['meta-text']}>
                {startTime} - {endTime}
              </span>
            </span>
          </div>
          
          <div className={styles['meta-item']}>
            <FiMapPin className={styles['meta-icon']} />
            <span className={styles['meta-content']}>
              <span className={styles['meta-text']}>
                {address}
              </span>
            </span>
          </div>
          
          <div className={styles['meta-item']}>
            <FiUsers className={styles['meta-icon']} />
            <span className={styles['meta-content']}>
              <div className={styles['slots-container']}>
                <div className={styles['slots-progress']}>
                  <div className={styles['slots-progress-bar']}></div>
                </div>
                <div className={styles['slots-count']}>
                  {remainingSlots > 0 ? (
                    <span>
                      {remainingSlots}/{workersNeeded}
                    </span>
                  ) : (
                    <span>Заполнено</span>
                  )}
                </div>
              </div>
            </span>
          </div>
        </div>
      </div>
      
      <div className={styles['vacancy-footer']}>
        <div className={styles['status-badge']}>
          {remainingSlots > 0 ? 'Набор открыт' : 'Набор завершен'}
        </div>
        <div className={styles['view-details']}>
          Подробнее
          <span className={styles['view-details-arrow']}>→</span>
        </div>
      </div>
    </div>
  );
};

export default VacancyCards;