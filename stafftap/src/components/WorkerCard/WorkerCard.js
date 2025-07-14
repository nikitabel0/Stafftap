import React from 'react';
import { FiStar, FiDollarSign, FiCalendar, FiMessageSquare, FiUserCheck } from 'react-icons/fi';
import './WorkerCard.css';

const WorkerCard = ({ worker, availabilityDays }) => {
  return (
    <div className="worker-card">
      <div className="worker-header">
        <div className="worker-avatar">
          {worker.avatarUrl ? (
            <img src={worker.avatarUrl} alt={worker.firstName} />
          ) : (
            <div className="avatar-placeholder">
              {worker.firstName?.charAt(0)}{worker.lastName?.charAt(0)}
            </div>
          )}
        </div>
        
        <div className="worker-info">
          <h3>{worker.firstName} {worker.lastName}</h3>
          
          <div className="worker-rating">
            <FiStar className="star-icon" />
            <span>{worker.rating?.toFixed(1) || 'Нет оценок'}</span>
            <span className="reviews-count">({worker.reviewsCount} отзывов)</span>
          </div>
        </div>
      </div>
      
      <div className="worker-details">
        <div className="worker-rate">
          <FiDollarSign className="rate-icon" />
          <span>Ставка: {worker.rate?.toLocaleString('ru-RU')} ₽ / смена</span>
        </div>
        
        <div className="worker-skills">
          {worker.skills?.slice(0, 3).map((skill, index) => (
            <span key={index} className="skill-tag">{skill.name || skill}</span>
          ))}
          {worker.skills?.length > 3 && (
            <span className="more-skills">+{worker.skills.length - 3} ещё</span>
          )}
        </div>
        
        <div className="availability-section">
          <div className="availability-header">
            <FiCalendar className="calendar-icon" />
            <span>Доступность:</span>
          </div>
          
          <div className="availability-days">
            {availabilityDays.map(day => (
              <div 
                key={day.date} 
                className={`availability-day ${day.available ? 'available' : 'unavailable'}`}
                title={`${day.formattedDate} ${day.day}, ${day.available ? 'Доступен' : 'Недоступен'}`}
              >
                <div className="day-name">{day.day}</div>
                <div className="date">{day.formattedDate}</div>
                <div className="indicator">
                  {day.available ? '✓' : '✗'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="worker-actions">
        <button className="invite-btn">
          <FiUserCheck className="invite-icon" />
          Пригласить
        </button>
        <button className="message-btn">
          <FiMessageSquare className="message-icon" />
          Написать
        </button>
      </div>
    </div>
  );
};

export default WorkerCard;