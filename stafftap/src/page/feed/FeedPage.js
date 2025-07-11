import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiSearch, FiPlus, FiList, FiX } from 'react-icons/fi';
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
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [applications, setApplications] = useState([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
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
      // Вместо перехода на страницу открываем модальное окно
      fetchUserApplications();
      setShowApplicationsModal(true);
    }
  };

  const fetchUserApplications = async () => {
    if (!user) return;
    
    setIsLoadingApplications(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:8000/api/bookings/my-applications/', 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setApplications(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке заявок:', error);
    } finally {
      setIsLoadingApplications(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'long' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  const formatDateTime = (dateString) => {
    const options = { 
      day: 'numeric', 
      month: 'long', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleString('ru-RU', options);
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'На рассмотрении';
      case 'confirmed': return 'Подтверждена';
      case 'rejected': return 'Отклонена';
      case 'completed': return 'Завершена';
      case 'canceled': return 'Отменена';
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'rejected': return 'status-rejected';
      case 'completed': return 'status-completed';
      case 'canceled': return 'status-canceled';
      default: return '';
    }
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
                user={user}
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

      {/* Модальное окно заявок */}
      {showApplicationsModal && (
        <div className="applications-modal">
          <div className="modal-overlay" onClick={() => setShowApplicationsModal(false)}></div>
          
          <div className="modal-content">
            <div className="modal-header">
              <h2>Мои заявки</h2>
              <button 
                className="close-button"
                onClick={() => setShowApplicationsModal(false)}
              >
                <FiX size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              {isLoadingApplications ? (
                <div className="loading-applications">
                  <div className="loader"></div>
                  <p>Загрузка ваших заявок...</p>
                </div>
              ) : (
                applications.length === 0 ? (
                  <div className="no-applications">
                    <div className="empty-icon">
                      <FiList size={48} />
                    </div>
                    <h3>У вас пока нет заявок</h3>
                    <p>Найдите подходящую вакансию и отправьте заявку</p>
                  </div>
                ) : (
                  <div className="applications-list">
                    {applications.map(application => (
                      <div 
                        key={application.id} 
                        className="application-card"
                        onClick={() => {
                          setShowApplicationsModal(false);
                          navigate(`/vacancy/${application.job.id}`);
                        }}
                      >
                        <div className="application-header">
                          <h3>{application.job.title}</h3>
                          <div className={`application-status ${getStatusClass(application.status)}`}>
                            <span>{getStatusText(application.status)}</span>
                          </div>
                        </div>
                        
                        <div className="application-details">
                          <div className="detail-row">
                            <div className="detail-item">
                              <span className="detail-label">Компания:</span>
                              <span>{application.job.company_name}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Оплата:</span>
                              <span>{application.job.rate.toLocaleString('ru-RU')} ₽</span>
                            </div>
                          </div>
                          
                          <div className="detail-row">
                            <div className="detail-item">
                              <span className="detail-label">Дата:</span>
                              <span>
                                {formatDate(application.job.work_date)}, {application.job.start_time} - {application.job.end_time}
                              </span>
                            </div>
                          </div>
                          
                          <div className="detail-row">
                            <div className="detail-item">
                              <span className="detail-label">Адрес:</span>
                              <span>{application.job.address}</span>
                            </div>
                          </div>
                          
                          <div className="detail-row">
                            <div className="detail-item">
                              <span className="detail-label">Подана:</span>
                              <span>{formatDateTime(application.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedPage;