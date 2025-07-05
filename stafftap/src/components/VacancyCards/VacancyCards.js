import React from 'react';
import { FiMapPin, FiClock, FiDollarSign, FiUser } from 'react-icons/fi';

const VacancyCards = ({ vacancy, role }) => {
  const {
    title,
    company,
    date,
    startTime,
    endTime,
    address,
    salary,
    status
  } = vacancy;

  
  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'long' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  
  const getStatusColor = () => {
    switch (status) {
      case 'pending': return '#3498db';
      case 'confirmed': return '#2C8161';
      case 'completed': return '#27ae60';
      case 'canceled': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  
  const getStatusText = () => {
    switch (status) {
      case 'pending': return 'Ожидает подтверждения';
      case 'confirmed': return 'Подтверждена';
      case 'completed': return 'Завершена';
      case 'canceled': return 'Отменена';
      default: return '';
    }
  };

  return (
    <div className="vacancy-card">
      <div className="card-header">
        <h3>{title}</h3>
        <div className="status-badge" style={{ backgroundColor: getStatusColor() }}>
          {getStatusText()}
        </div>
      </div>
      
      <div className="company-name">{company}</div>
      
      <div className="card-details">
        <div className="detail-item">
          <FiMapPin className="icon" />
          <span>{address}</span>
        </div>
        
        <div className="detail-item">
          <FiClock className="icon" />
          <span>{formatDate(date)}, {startTime} - {endTime}</span>
        </div>
        
        <div className="detail-item">
          <FiDollarSign className="icon" />
          <span>{salary.toLocaleString()} ₽</span>
        </div>
      </div>
      
      <div className="card-footer">
        {role === 'worker' ? (
          <button className="action-btn">
            {status === 'confirmed' ? 'Подтвердить выход' : 'Подробнее'}
          </button>
        ) : (
          <button className="action-btn">
            {status === 'pending' ? 'Просмотреть отклики' : 'Управлять'}
          </button>
        )}
      </div>
    </div>
  );
};

export default VacancyCards;