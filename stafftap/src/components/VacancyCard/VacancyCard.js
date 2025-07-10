import React from "react";
import { useNavigate } from 'react-router-dom';
import {
  FiHeart,
  FiMapPin,
  FiClock,
  FiDollarSign,
  FiUser,
  FiStar,
} from "react-icons/fi";
import './VacancyCard.css';

const VacancyCard = ({ vacancy, onToggleFavorite, role }) => {
  const navigate = useNavigate();
  
  const handleCardClick = () => {
    navigate(`/vacancy/${vacancy.id}`);
  };
  
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
    requirements = [],
    workersNeeded,
    distance,
    isFavorite,
    companyRating,
  } = vacancy;

  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "long" };
    return new Date(dateString).toLocaleDateString("ru-RU", options);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(id);
  };

  return (
    <div onClick={handleCardClick} className="vacancy-card">
      <div className="card-header">
        <div className="company-info">
          <div className="company-logo">{company?.charAt(0) || 'C'}</div>
          <div className="header-content">
            <h3>{title}</h3>
            <div className="company-name">{company}</div>
          </div>
        </div>
        <button
          className={`favorite-btn ${isFavorite ? "active" : ""}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
        >
          <FiHeart className="favorite-icon" />
          {isFavorite && (
            <FiHeart className="filled-heart" />
          )}
        </button>
      </div>

      <div className="card-content">
        <p className="description">{description}</p>

        <div className="details-grid">
          <div className="detail-item">
            <FiMapPin className="icon" />
            <span>
              {address} {distance && `(${distance} км)`}
            </span>
          </div>

          <div className="detail-item">
            <FiClock className="icon" />
            <span>
              {formatDate(date)}, {startTime} - {endTime}
            </span>
          </div>

          <div className="detail-item">
            <FiDollarSign className="icon" />
            <span>{salary.toLocaleString()} ₽ за смену</span>
          </div>

          <div className="detail-item">
            <FiUser className="icon" />
            <span>
              {profession} {experience && `• ${experience}`}
            </span>
          </div>

          {companyRating && (
            <div className="detail-item">
              <FiStar className="icon" />
              <span>Рейтинг: {companyRating}</span>
            </div>
          )}
        </div>

        {requirements.length > 0 && (
          <div className="requirements">
            <strong>Требования:</strong>
            <ul>
              {requirements.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="workers-needed">
          Требуется: {workersNeeded}{" "}
          {workersNeeded === 1
            ? "сотрудник"
            : workersNeeded > 1 && workersNeeded < 5
            ? "сотрудника"
            : "сотрудников"}
        </div>
        <button
          className={`apply-btn ${role === "employer" ? "employer" : ""}`}
        >
          {role === "worker" ? "Я готов!" : "Забронировать"}
        </button>
      </div>
    </div>
  );
};

export default VacancyCard;