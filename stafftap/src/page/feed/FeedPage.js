import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiSearch, FiPlus, FiList } from 'react-icons/fi';
import FilterPanel from '../../components/FilterPanel/FilterPanel';
import VacancyCard from '../../components/VacancyCard/VacancyCard';
import './FeedPage.css';

const FeedPage = ({ user }) => {
  const [vacancies, setVacancies] = useState([]);
  const [filters, setFilters] = useState({
    profession: '',
    date: '',
    minRate: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  
  const role = user?.role || 'worker';

  const fetchVacancies = async (filters = {}, query = '') => {
    try {
      const token = localStorage.getItem('token');
      const params = {
        skill: filters.profession || undefined,
        date: filters.date || undefined,
        min_rate: filters.minRate || undefined,
        search: query || undefined
      };

      const response = await axios.get('http://localhost:8000/api/jobs', {
        params,
        headers: { Authorization: `Bearer ${token}` }
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
        postedDate: new Date(job.created_at).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long'
        }),
        isFavorite: job.is_favorite || false,
        employerRating: job.employer_rating || 4.5,
        employerVerified: job.employer_verified || false
      }));
    } catch (error) {
      console.error('Ошибка при загрузке вакансий:', error);
      return [];
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const vacanciesData = await fetchVacancies(filters, searchQuery);
      setVacancies(vacanciesData);
      setIsLoading(false);
    };

    loadData();
  }, [filters, searchQuery]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleToggleFavorite = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const vacancy = vacancies.find(v => v.id === id);
      const newFavoriteStatus = !vacancy.isFavorite;
      
      // Оптимистичное обновление UI
      setVacancies(prev => prev.map(v => 
        v.id === id ? { ...v, isFavorite: newFavoriteStatus } : v
      ));
      
      // Отправка запроса на сервер
      await axios.post(
        `http://localhost:8000/api/jobs/${id}/favorite`,
        { is_favorite: newFavoriteStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
    } catch (error) {
      console.error('Ошибка при обновлении избранного:', error);
      
      // Откат изменений в случае ошибки
      const vacancy = vacancies.find(v => v.id === id);
      if (vacancy) {
        setVacancies(prev => prev.map(v => 
          v.id === id ? { ...v, isFavorite: vacancy.isFavorite } : v
        ));
      }
    }
  };

  const handleFloatingButtonClick = () => {
    if (role === 'employer') {
      navigate('/create-vacancy');
    } else {
      navigate('/my-applications');
    }
  };

  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'long' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  return (
    <div className="feed-page">
      <div className="feed-header">
        <div className="header-top">
          <h1>{role === 'worker' ? 'Доступные вакансии' : 'Кандидаты'}</h1>
          {user && (
            <div className="balance-info">
              <span>Баланс: {user.balance?.toLocaleString('ru-RU') || 0} ₽</span>
            </div>
          )}
        </div>

        <div className="search-container">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Поиск вакансий..."
              value={searchQuery}
              onChange={handleSearch}
              className="search-input"
            />
            <button className="filter-toggle" onClick={toggleFilters}>
              Фильтры
            </button>
          </div>
        </div>
      </div>

      <div className={`filter-wrapper ${showFilters ? 'visible' : ''}`}>
        <FilterPanel 
          filters={filters} 
          onFilterChange={handleFilterChange} 
          role={role}
          onClose={() => setShowFilters(false)}
        />
      </div>

      <div className="filters-info">
        {(filters.profession || filters.date || filters.minRate) && (
          <div className="active-filters">
            <span>Примененные фильтры:</span>
            {filters.profession && (
              <div className="filter-tag">
                Профессия: {filters.profession}
                <button onClick={() => handleFilterChange({...filters, profession: ''})}>
                  &times;
                </button>
              </div>
            )}
            {filters.date && (
              <div className="filter-tag">
                Дата: {formatDate(filters.date)}
                <button onClick={() => handleFilterChange({...filters, date: ''})}>
                  &times;
                </button>
              </div>
            )}
            {filters.minRate && (
              <div className="filter-tag">
                Мин. оплата: {filters.minRate} ₽
                <button onClick={() => handleFilterChange({...filters, minRate: ''})}>
                  &times;
                </button>
              </div>
            )}
          </div>
        )}
        
        {!isLoading && vacancies.length > 0 && (
          <div className="vacancies-count">
            Найдено вакансий: {vacancies.length}
          </div>
        )}
      </div>

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
              <div className="no-results-icon">
                <FiSearch size={48} />
              </div>
              <h3>Ничего не найдено</h3>
              <p>Попробуйте изменить параметры поиска или фильтры</p>
              <button 
                className="reset-filters"
                onClick={() => {
                  setFilters({ profession: '', date: '', minRate: '' });
                  setSearchQuery('');
                }}
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      )}

      <div 
        className={`floating-button ${role}`}
        onClick={handleFloatingButtonClick}
      >
        {role === 'employer' ? (
          <>
            <FiPlus className="button-icon" />
            <span className="button-text">Создать</span>
          </>
        ) : (
          <>
            <FiList className="button-icon" />
            <span className="button-text">Заявки</span>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedPage;