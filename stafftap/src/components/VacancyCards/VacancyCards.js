import React from 'react';
import { FiClock, FiMapPin, FiUsers, FiCalendar, FiDollarSign, FiUser } from 'react-icons/fi';

const VacancyCard = ({ vacancy, onToggleFavorite, role, user }) => {
  // Защита от отсутствия vacancy
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
  const rate = vacancy.salary ?? 0;
  const company = vacancy.company || 'Компания не указана';
  const address = vacancy.address || 'Адрес не указан';
  const workDate = vacancy.date ? new Date(vacancy.date) : null;
  const startTime = vacancy.startTime || '--:--';
  const endTime = vacancy.endTime || '--:--';
  const workersNeeded = vacancy.workersNeeded ?? 0;
  const remainingSlots = vacancy.remainingSlots ?? 0;
  const confirmedWorkers = vacancy.confirmedWorkers || [];

  // Форматирование чисел с защитой
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

  // Обработчик нажатия на карточку
  const handleCardClick = () => {
    window.location.href = `/vacancy/${vacancy.id}`;
  };

  // Обработчик избранного
  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(vacancy.id);
    }
  };

  return (
    <div className="vacancy-card" onClick={handleCardClick}>
      <div className="vacancy-header">
        <div>
          <h3 className="vacancy-title">{title}</h3>
          <div className="vacancy-company">
            {company}
            {vacancy.employerVerified && (
              <span className="verified-badge">✓ Проверено</span>
            )}
          </div>
        </div>
        <div className="vacancy-rating">
          <span className="rating-value">
            ★ {vacancy.employerRating?.toFixed(1) || '4.5'}
          </span>
        </div>
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
        
        {/* Блок с подтвержденными сотрудниками */}
        {confirmedWorkers.length > 0 && (
          <div className="confirmed-workers">
            <h4>Подтвержденные сотрудники:</h4>
            <div className="workers-list">
              {confirmedWorkers.map(worker => (
                <div key={worker.id} className="worker-card">
                  <FiUser className="worker-icon" />
                  <div className="worker-info">
                    <span className="worker-name">{worker.name}</span>
                    <span className="worker-phone">{worker.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="vacancy-footer">
        <div className="posted-date">
          Опубликовано: {vacancy.postedDate}
        </div>
        <div className="vacancy-actions">
          <button 
            className={`favorite-button ${vacancy.isFavorite ? 'active' : ''}`}
            onClick={handleFavoriteClick}
          >
            {vacancy.isFavorite ? '★ В избранном' : '☆ В избранное'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VacancyCard;