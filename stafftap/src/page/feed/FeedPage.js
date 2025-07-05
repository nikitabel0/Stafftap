import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import './FeedPage.css';
import FilterPanel from '../../components/FilterPanel/FilterPanel';
import VacancyCard from '../../components/VacancyCard/VacancyCard';

const FeedPage = () => {
  const [vacancies, setVacancies] = useState([]);
  const [filteredVacancies, setFilteredVacancies] = useState([]);
  const [filters, setFilters] = useState({
    profession: '',
    date: '',
    minRate: '',
    maxDistance: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  
  const role = location.pathname.includes('employer') ? 'employer' : 'worker';

  const testVacancies = [
    {
      id: 1,
      title: "Бариста на выходные",
      company: "Кофейня 'Утренний Эспрессо'",
      description: "Требуется опытный бариста для работы в выходные дни. Обязанности: приготовление кофейных напитков, обслуживание клиентов, поддержание чистоты рабочего места.",
      profession: "Бариста",
      date: "2023-10-28",
      startTime: "08:00",
      endTime: "16:00",
      address: "ул. Пушкинская, 15",
      salary: 2500,
      experience: "1+ год",
      requirements: ["Опыт работы от 1 года", "Знание кофейных рецептур", "Аккуратность"],
      workersNeeded: 2,
      distance: 1.2,
      isFavorite: false,
      companyRating: 4.7
    },
    {
      id: 2,
      title: "Официант на вечернее мероприятие",
      company: "Ресторан 'Гастрономика'",
      description: "Приглашаем официантов для работы на корпоративном мероприятии. Обязанности: обслуживание гостей, сервировка столов, подача блюд.",
      profession: "Официант",
      date: "2023-10-30",
      startTime: "18:00",
      endTime: "23:00",
      address: "пр. Мира, 42",
      salary: 2000,
      experience: "Без опыта",
      requirements: ["Опрятный внешний вид", "Коммуникабельность", "Внимательность"],
      workersNeeded: 5,
      distance: 3.5,
      isFavorite: true,
      companyRating: 4.9
    },
    {
      id: 3,
      title: "Помощник повара на кухню",
      company: "Кафе 'Самовар'",
      description: "Требуется помощник повара для работы на кухне. Обязанности: подготовка ингредиентов, поддержание чистоты, помощь в приготовлении блюд.",
      profession: "Помощник повара",
      date: "2023-10-29",
      startTime: "10:00",
      endTime: "18:00",
      address: "ул. Советская, 8",
      salary: 1800,
      experience: "Без опыта",
      requirements: ["Ответственность", "Исполнительность", "Желание учиться"],
      workersNeeded: 1,
      distance: 0.8,
      isFavorite: false,
      companyRating: 4.5
    },
    {
      id: 4,
      title: "Мерчендайзер в супермаркет",
      company: "Сеть супермаркетов 'ФрешМаркет'",
      description: "Работа по выкладке товара, контроль сроков годности, поддержание товарного вида продукции. Гибкий график.",
      profession: "Мерчендайзер",
      date: "2023-10-27",
      startTime: "09:00",
      endTime: "15:00",
      address: "ТЦ 'Галерея', 3 этаж",
      salary: 1700,
      experience: "Без опыта",
      requirements: ["Аккуратность", "Внимательность", "Ответственность"],
      workersNeeded: 3,
      distance: 2.1,
      isFavorite: false,
      companyRating: 4.3
    },
    {
      id: 5,
      title: "Промоутер на раздачу листовок",
      company: "Рекламное агентство 'МедиаВолна'",
      description: "Приглашаем активных промоутеров для раздачи рекламных материалов в центре города. Работа на улице.",
      profession: "Промоутер",
      date: "2023-10-31",
      startTime: "12:00",
      endTime: "18:00",
      address: "пл. Центральная",
      salary: 1500,
      experience: "Без опыта",
      requirements: ["Коммуникабельность", "Вежливость", "Презентабельный внешний вид"],
      workersNeeded: 10,
      distance: 1.5,
      isFavorite: false,
      companyRating: 4.6
    }
  ];

  // Загрузка тестовых данных (в реальном приложении будет запрос к API)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // Имитация загрузки данных
      setTimeout(() => {
        setVacancies(testVacancies);
        setFilteredVacancies(testVacancies);
        setIsLoading(false);
      }, 800);
    };

    loadData();
  }, []);

  // Обработка изменения фильтров
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    
    // Фильтрация вакансий
    const filtered = vacancies.filter(vacancy => {
      // Фильтр по профессии
      if (newFilters.profession && !vacancy.profession.toLowerCase().includes(newFilters.profession.toLowerCase())) {
        return false;
      }
      
      // Фильтр по дате
      if (newFilters.date && vacancy.date !== newFilters.date) {
        return false;
      }
      
      // Фильтр по минимальной ставке
      if (newFilters.minRate && vacancy.salary < parseInt(newFilters.minRate)) {
        return false;
      }
      
      // Фильтр по расстоянию
      if (newFilters.maxDistance && vacancy.distance > parseFloat(newFilters.maxDistance)) {
        return false;
      }
      
      return true;
    });
    
    setFilteredVacancies(filtered);
  };

  // Обработка добавления в избранное
  const handleToggleFavorite = (id) => {
    const updatedVacancies = vacancies.map(vacancy => {
      if (vacancy.id === id) {
        return { ...vacancy, isFavorite: !vacancy.isFavorite };
      }
      return vacancy;
    });
    
    setVacancies(updatedVacancies);
    setFilteredVacancies(updatedVacancies.filter(v => 
      v.id === id ? true : filteredVacancies.some(fv => fv.id === v.id)
    ));
  };

  return (
    <div className="feed-page">
      <div className="feed-header">
        <h1>{role === 'worker' ? 'Доступные вакансии' : 'Кандидаты'}</h1>
        <div className="balance-info">
          <span>Ваш баланс: 15 400 ₽</span>
        </div>
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
          {filteredVacancies.length > 0 ? (
            filteredVacancies.map(vacancy => (
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

      <div className="floating-button">
        {role === 'employer' ? 'Создать вакансию' : 'Мои заявки'}
      </div>
    </div>
  );
};

export default FeedPage;