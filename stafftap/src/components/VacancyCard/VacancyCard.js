import React from 'react';
import { FiHeart, FiMapPin, FiClock, FiDollarSign, FiUser, FiStar } from 'react-icons/fi';

const VacancyCard = ({ vacancy, onToggleFavorite, role }) => {
  const {
    id,
    title,
    company,
    description,
    profession,
    date,
    startTime,
    endTime,
    address,
    salary,
    experience,
    requirements,
    workersNeeded,
    distance,
    isFavorite,
    companyRating
  } = vacancy;

  
  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'long' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  return (
    <div className="vacancy-card">
      <div className="card-header">
        <div className="company-info">
          <div className="company-logo">{company.charAt(0)}</div>
          <div>
            <h3>{title}</h3>
            <div className="company-name">{company}</div>
          </div>
        </div>
        <button 
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={() => onToggleFavorite(id)}
        >
          <FiHeart />
        </button>
      </div>

      <div className="card-content">
        <p className="description">{description}</p>
        
        <div className="details-grid">
          <div className="detail-item">
            <FiMapPin className="icon" />
            <span>{address} ({distance} км)</span>
          </div>
          
          <div className="detail-item">
            <FiClock className="icon" />
            <span>{formatDate(date)}, {startTime} - {endTime}</span>
          </div>
          
          <div className="detail-item">
            <FiDollarSign className="icon" />
            <span>{salary.toLocaleString()} ₽ за смену</span>
          </div>
          
          <div className="detail-item">
            <FiUser className="icon" />
            <span>{profession} • {experience}</span>
          </div>
          
          <div className="detail-item">
            <FiStar className="icon" />
            <span>Рейтинг компании: {companyRating}</span>
          </div>
        </div>
        
        <div className="requirements">
          <strong>Требования:</strong>
          <ul>
            {requirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card-footer">
        <div className="workers-needed">
          Требуется: {workersNeeded} {workersNeeded === 1 ? 'сотрудник' : 
            workersNeeded > 1 && workersNeeded < 5 ? 'сотрудника' : 'сотрудников'}
        </div>
        <button className={`apply-btn ${role === 'employer' ? 'employer' : ''}`}>
          {role === 'worker' ? 'Я готов!' : 'Забронировать'}
        </button>
      </div>
    </div>
  );
};

export default VacancyCard;