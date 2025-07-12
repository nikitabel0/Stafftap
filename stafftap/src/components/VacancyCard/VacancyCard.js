import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import {
  FiHeart,
  FiMapPin,
  FiClock,
  FiDollarSign,
  FiUser,
  FiStar,
  FiCheck
} from "react-icons/fi";
import axios from 'axios';
import './VacancyCard.css';
import API_BASE_URL from '../../apiConfig';

const VacancyCard = ({ vacancy, onToggleFavorite, role, user }) => {
  const navigate = useNavigate();
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);
  
  // Состояние для заявки (используем localStorage)
  const [hasApplied, setHasApplied] = useState(() => {
    const appliedJobs = JSON.parse(localStorage.getItem('appliedJobs') || '{}');
    return appliedJobs[vacancy.id] || false;
  });

  // Состояние для избранного (используем localStorage)
  const [isFavoriteLocal, setIsFavoriteLocal] = useState(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    return favorites[vacancy.id] || false;
  });

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
    companyRating,
    remainingSlots
  } = vacancy;

  // Синхронизация состояний при изменении вакансии
  useEffect(() => {
    // Для заявок
    const appliedJobs = JSON.parse(localStorage.getItem('appliedJobs') || '{}');
    setHasApplied(appliedJobs[id] || false);
    
    // Для избранного
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    setIsFavoriteLocal(favorites[id] || false);
  }, [id]);

  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "long" };
    return new Date(dateString).toLocaleDateString("ru-RU", options);
  };

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    
    const newFavoriteStatus = !isFavoriteLocal;
    
    // Оптимистичное обновление UI
    setIsFavoriteLocal(newFavoriteStatus);
    
    // Сохраняем в localStorage
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    favorites[id] = newFavoriteStatus;
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    try {
      // Вызываем функцию родителя для синхронизации с сервером
      await onToggleFavorite(id);
    } catch (error) {
      console.error('Ошибка при обновлении избранного:', error);
      
      // Откатываем изменения в случае ошибки
      setIsFavoriteLocal(!newFavoriteStatus);
      
      // Восстанавливаем предыдущее состояние в localStorage
      const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
      favorites[id] = !newFavoriteStatus;
      localStorage.setItem('favorites', JSON.stringify(favorites));
    }
  };

  const handleApplyClick = async (e) => {
    e.stopPropagation();
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.role !== 'worker') {
      setApplyError('Только работники могут откликаться на вакансии');
      return;
    }
    
    if (remainingSlots <= 0) {
      setApplyError('Все места уже заняты');
      return;
    }
    
    setIsApplying(true);
    setApplyError(null);
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/api/bookings/`,
        { job_id: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Обновляем состояние и localStorage
      setHasApplied(true);
      
      // Сохраняем в localStorage
      const appliedJobs = JSON.parse(localStorage.getItem('appliedJobs') || '{}');
      appliedJobs[id] = true;
      localStorage.setItem('appliedJobs', JSON.stringify(appliedJobs));
      
      // Обновляем количество оставшихся мест
      vacancy.remainingSlots = vacancy.remainingSlots - 1;
    } catch (error) {
      console.error('Ошибка при отклике на вакансию:', error);
      
      let errorMessage = 'Не удалось отправить отклик';
      if (error.response) {
        if (error.response.data && error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.status === 400) {
          errorMessage = 'Вы уже откликались на эту вакансию';
        } else if (error.response.status === 403) {
          errorMessage = 'Только работники могут откликаться';
        }
      }
      
      setApplyError(errorMessage);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div onClick={() => navigate(`/vacancy/${id}`)} className="vacancy-card">
      <div className="card-header">
        <div className="company-info">
          <div className="company-logo">{company?.charAt(0) || 'C'}</div>
          <div className="header-content">
            <h3>{title}</h3>
            <div className="company-name">{company}</div>
          </div>
        </div>
        <button
          className={`favorite-btn ${isFavoriteLocal ? "active" : ""}`}
          onClick={handleFavoriteClick}
          aria-label={isFavoriteLocal ? "Удалить из избранного" : "Добавить в избранное"}
        >
          <FiHeart className="favorite-icon" />
          {isFavoriteLocal && (
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
        
        {applyError && (
          <div className="apply-error">
            {applyError}
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="workers-needed">
          {remainingSlots > 0 ? (
            `Осталось мест: ${remainingSlots}/${workersNeeded}`
          ) : (
            "Все места заняты"
          )}
        </div>
        
        {role === "worker" ? (
          hasApplied ? (
            <button className="apply-btn applied" disabled>
              <FiCheck className="icon" /> Отправлено
            </button>
          ) : (
            <button
              className={`apply-btn ${isApplying ? "sending" : ""}`}
              onClick={handleApplyClick}
              disabled={isApplying || remainingSlots <= 0}
            >
              {isApplying ? "Отправка..." : "Я готов!"}
            </button>
          )
        ) : (
          <button className={`apply-btn ${role === "employer" ? "employer" : ""}`}>
            {role === "worker" ? "Я готов!" : "Забронировать"}
          </button>
        )}
      </div>
    </div>
  );
};

export default VacancyCard;