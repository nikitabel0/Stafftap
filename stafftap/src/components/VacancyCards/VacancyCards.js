import React from 'react';
import { 
  FiClock, 
  FiMapPin, 
  FiUsers, 
  FiCalendar, 
  FiDollarSign
} from 'react-icons/fi';
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

  return (
    <div className="vacancy-card" onClick={handleVacancyClick}>
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
    </div>
  );
};

export default VacancyCards;