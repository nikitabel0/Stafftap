// FeedPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import './FeedPage.css';
import FilterPanel from '../../components/FilterPanel/FilterPanel';
import VacancyCard from '../../components/VacancyCard/VacancyCard';

const FeedPage = ({ user }) => {
  const [vacancies, setVacancies] = useState([]);
  const [filters, setFilters] = useState({
    profession: '',
    date: '',
    minRate: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  const role = user?.role || 'worker';

  const fetchVacancies = async (filters = {}) => {
    try {
      const token = localStorage.getItem('token');
      const params = {
        skill: filters.profession || undefined,
        date: filters.date || undefined,
        min_rate: filters.minRate || undefined,
      };

      const response = await axios.get('http://localhost:8000/api/jobs', {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company_name,
        description: job.description,
        profession: job.required_skill_name,
        date: job.work_date,
        startTime: job.start_time,
        endTime: job.end_time,
        address: job.address,
        salary: job.rate,
        workersNeeded: job.workers_needed,
        remainingSlots: job.remaining_slots,
        postedDate: new Date(job.created_at).toLocaleDateString(),
        isFavorite: job.is_favorite || false,
        companyRating: 4.5 
      }));
    } catch (error) {
      console.error('Ошибка при загрузке вакансий:', error);
      return [];
    }
  };

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const vacanciesData = await fetchVacancies(filters);
      setVacancies(vacanciesData);
      setIsLoading(false);
    };

    loadData();
  }, [filters]);

  // Обработка изменения фильтров
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Обработка добавления в избранное
  const handleToggleFavorite = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const vacancy = vacancies.find(v => v.id === id);
      const newFavoriteStatus = !vacancy.isFavorite;
      
      // Отправляем запрос на сервер
      await axios.post(
        `http://localhost:8000/api/jobs/${id}/favorite`,
        { is_favorite: newFavoriteStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Обновляем локальное состояние
      setVacancies(prev => prev.map(v => 
        v.id === id ? { ...v, isFavorite: newFavoriteStatus } : v
      ));
      
    } catch (error) {
      console.error('Ошибка при обновлении избранного:', error);
    }
  };

  // Переход на страницу создания вакансии/заявок
  const handleFloatingButtonClick = () => {
    if (role === 'employer') {
      navigate('/create-vacancy');
    } else {
      navigate('/my-applications');
    }
  };

  return (
    <div className="feed-page">
      <div className="feed-header">
        <h1>{role === 'worker' ? 'Доступные вакансии' : 'Кандидаты'}</h1>
        {user && (
          <div className="balance-info">
            <span>Ваш баланс: {user.balance ? user.balance.toLocaleString('ru-RU') : 0} ₽</span>
          </div>
        )}
      </div>

      <FilterPanel 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        role={role}
      />

      {isLoading ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Загрузка вакансий...</p>
        </div>
      ) : (
        <div className="vacancies-list">
          {vacancies.length > 0 ? (
            vacancies.map(vacancy => (
              <VacancyCard
                key={vacancy.id}
                vacancy={vacancy}
                onToggleFavorite={handleToggleFavorite}
                role={role}
              />
            ))
          ) : (
            <div className="no-results">
              <h3>Ничего не найдено</h3>
              <p>Попробуйте изменить параметры фильтра</p>
            </div>
          )}
        </div>
      )}

      <div 
        className="floating-button"
        onClick={handleFloatingButtonClick}
      >
        {role === 'employer' ? 'Создать вакансию' : 'Мои заявки'}
      </div>
    </div>
  );
};

export default FeedPage;