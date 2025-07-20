import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  FiBriefcase,
  FiClock,
  FiMapPin,
  FiDollarSign,
  FiUser,
  FiStar,
  FiCheck,
  FiX,
  FiHeart
} from "react-icons/fi";
import styles from './FavoritesPage.module.css';
import API_BASE_URL from '../../apiConfig';

const FavoritesPage = ({ user }) => {
  const [favoriteJobs, setFavoriteJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFavoriteJobs = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/jobs/favorites/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setFavoriteJobs(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error("Ошибка при загрузке избранных вакансий:", error);
        setIsLoading(false);
      }
    };

    if (user) {
      fetchFavoriteJobs();
    }
  }, [user]);

  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "long" };
    return new Date(dateString).toLocaleDateString("ru-RU", options);
  };

  const handleJobClick = (jobId) => {
    navigate(`/vacancy/${jobId}`);
  };

  const handleRemoveFavorite = async (jobId, e) => {
    e.stopPropagation();
    setIsRemoving(prev => ({ ...prev, [jobId]: true }));
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/jobs/${jobId}/favorite`,
        { is_favorite: false },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setFavoriteJobs(prev => prev.filter(job => job.id !== jobId));
      
      const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
      delete favorites[jobId];
      localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (error) {
      console.error("Ошибка при удалении из избранного:", error);
    } finally {
      setIsRemoving(prev => {
        const newState = { ...prev };
        delete newState[jobId];
        return newState;
      });
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Загрузка избранных вакансий...</p>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Избранные вакансии</h1>
        <div className={styles.favoritesCount}>
          {favoriteJobs.length} {favoriteJobs.length === 1 ? 'вакансия' : 
            favoriteJobs.length > 1 && favoriteJobs.length < 5 ? 'вакансии' : 'вакансий'}
        </div>
      </div>

      {favoriteJobs.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FiHeart size={48} />
          </div>
          <p>У вас пока нет избранных вакансий</p>
          <button className={styles.primaryButton} onClick={() => navigate("/")}>
            Найти вакансии
          </button>
        </div>
      ) : (
        <div className={styles.jobsGrid}>
          {favoriteJobs.map((job) => (
            <div
              key={job.id}
              className={styles.jobCard}
              onClick={() => handleJobClick(job.id)}
            >
              <button
                className={`${styles.removeButton} ${isRemoving[job.id] ? styles.removing : ""}`}
                onClick={(e) => handleRemoveFavorite(job.id, e)}
                disabled={isRemoving[job.id]}
              >
                {isRemoving[job.id] ? (
                  <div className={styles.spinner}></div>
                ) : (
                  <FiX size={20} />
                )}
              </button>
              
              <div className={styles.jobHeader}>
                <h3>{job.title}</h3>
                <div className={styles.companyInfo}>
                  <span className={styles.companyName}>{job.company_name}</span>
                  {job.employer_verified && (
                    <span className={styles.verifiedBadge}>
                      <FiCheck /> Проверен
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.jobDetails}>
                <div className={styles.detailRow}>
                  <div className={styles.detailItem}>
                    <FiBriefcase className={styles.icon} />
                    <span>{job.required_skill_name}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <FiClock className={styles.icon} />
                    <span>
                      {formatDate(job.work_date)}, {job.start_time} -{" "}
                      {job.end_time}
                    </span>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <div className={styles.detailItem}>
                    <FiMapPin className={styles.icon} />
                    <span>{job.address}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <FiDollarSign className={styles.icon} />
                    <span>{job.rate.toLocaleString()} ₽</span>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <div className={styles.detailItem}>
                    <FiUser className={styles.icon} />
                    <span>
                      Осталось мест: {job.remaining_slots}/{job.workers_needed}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <FiStar className={styles.icon} />
                    <span>
                      Рейтинг: {job.employer_rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.jobFooter}>
                <div className={styles.completedJobs}>
                  <FiBriefcase className={styles.icon} />
                  <span>Завершено работ: {job.completed_jobs}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;