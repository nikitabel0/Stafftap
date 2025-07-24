// VacancyCard.js
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
import styles from './VacancyCard.module.css'; // Импорт модульных стилей
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
    establishment_name,
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
    <div 
      onClick={() => navigate(`/vacancy/${id}`)} 
      className={styles.vacancyCard}
    >
      <div className={styles.cardHeader}>
        <div className={styles.companyInfo}>
          <div className={styles.companyLogo}>
            {company?.charAt(0) || 'C'}
          </div>
          <div className={styles.headerContent}>
            
            <h3>{title}</h3>
            <div className={styles.companyName}>{company}</div>
          </div>
        </div>
        <button
          className={`${styles.favoriteBtn} ${isFavoriteLocal ? styles.active : ""}`}
          onClick={handleFavoriteClick}
          aria-label={isFavoriteLocal ? "Удалить из избранного" : "Добавить в избранное"}
        >
          <FiHeart className={styles.favoriteIcon} />
          {isFavoriteLocal && (
            <FiHeart className={styles.filledHeart} />
          )}
        </button>
      </div>

      <div className={styles.cardContent}>
        <p className={styles.description}>{description}</p>

        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <FiMapPin className={styles.icon} />
            <span>
               {address} {distance && `(${distance} км)`}
            </span>
          </div>

          <div className={styles.detailItem}>
            <FiClock className={styles.icon} />
            <span>
              {formatDate(date)}, {startTime} - {endTime}
            </span>
          </div>

          <div className={styles.detailItem}>
            <FiDollarSign className={styles.icon} />
            <span>{salary.toLocaleString()} ₽ за смену</span>
          </div>

          <div className={styles.detailItem}>
            <FiUser className={styles.icon} />
            <span>
              {profession} {experience && `• ${experience}`}
            </span>
          </div>

          {companyRating && (
            <div className={styles.detailItem}>
              <FiStar className={styles.icon} />
              <span>Рейтинг: {companyRating}</span>
            </div>
          )}
        </div>

        {requirements.length > 0 && (
          <div className={styles.requirements}>
            <strong>Требования:</strong>
            <ul>
              {requirements.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </div>
        )}
        
        {applyError && (
          <div className={styles.applyError}>
            {applyError}
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.workersNeeded}>
          {remainingSlots > 0 ? (
            `Осталось мест: ${remainingSlots}/${workersNeeded}`
          ) : (
            "Все места заняты"
          )}
        </div>
        
        {role === "worker" ? (
          hasApplied ? (
            <button className={`${styles.applyBtn} ${styles.applied}`} disabled>
              <FiCheck className={styles.icon} /> Отправлено
            </button>
          ) : (
            <button
              className={`${styles.applyBtn} ${isApplying ? styles.sending : ""}`}
              onClick={handleApplyClick}
              disabled={isApplying || remainingSlots <= 0}
            >
              {isApplying ? "Отправка..." : "Я готов!"}
            </button>
          )
        ) : (
          <button className={`${styles.applyBtn} ${role === "employer" ? styles.employer : ""}`}>
            {role === "worker" ? "Я готов!" : "Забронировать"}
          </button>
        )}
      </div>
    </div>
  );
};

export default VacancyCard;