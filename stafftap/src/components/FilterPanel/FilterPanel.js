import React from 'react';
import { FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import styles from './FilterPanel.module.css';

const FilterPanel = ({ 
  filters, 
  onFilterChange,
  onClose,
  isOpen
}) => {
  if (!isOpen) return null;
  
  const professions = [
    "Бариста", "Официант", "Повар", "Помощник повара", 
    "Мерчендайзер", "Промоутер", "Кассир", "Уборщик"
  ];

  const popularCities = [
    "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург",
    "Казань", "Нижний Новгород", "Челябинск", "Самара",
    "Омск", "Ростов-на-Дону", "Уфа", "Красноярск"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  const applyFilters = () => {
    onClose();
  };

  const resetFilters = () => {
    onFilterChange({ 
      profession: '',
      date: '',
      minRate: '',
      maxDistance: '',
      city: ''
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.filterContent}>
        <button 
          className={styles.closeFilters} 
          onClick={onClose}
          aria-label="Закрыть фильтры"
        >
          <FiX />
        </button>
        
        <div className={styles.filterGroup}>
          <label>Профессия</label>
          <select 
            name="profession" 
            value={filters.profession}
            onChange={handleInputChange}
            className={styles.select}
          >
            <option value="">Все профессии</option>
            {professions.map(prof => (
              <option key={prof} value={prof}>{prof}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.filterGroup}>
          <label>Город</label>
          <input 
            type="text"
            name="city"
            value={filters.city}
            onChange={handleInputChange}
            placeholder="Введите город"
            className={styles.input}
            list="cities-list"
          />
          <datalist id="cities-list">
            {popularCities.map(city => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </div>
        
        <div className={styles.filterGroup}>
          <label>Дата</label>
          <input 
            type="date" 
            name="date" 
            value={filters.date}
            onChange={(e) => {
              const selectedDate = e.target.value;
              const today = new Date().toISOString().split('T')[0];
              
              if (selectedDate < today) {
                toast.error("Нельзя выбирать прошедшие даты");
                return;
              }
              handleInputChange(e);
            }}
            min={new Date().toISOString().split('T')[0]}
            className={styles.input}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <label>Минимальная ставка (₽)</label>
          <input 
            type="number" 
            name="minRate" 
            placeholder="0"
            value={filters.minRate}
            onChange={handleInputChange}
            min="0"
            className={styles.input}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <label>Макс. расстояние (км)</label>
          <input 
            type="number" 
            name="maxDistance" 
            placeholder="10"
            value={filters.maxDistance}
            onChange={handleInputChange}
            min="0"
            step="0.1"
            className={styles.input}
          />
        </div>
        
        <div className={styles.filterActions}>
          <button 
            className={styles.resetBtn} 
            onClick={resetFilters}
          >
            Сбросить
          </button>
          <button 
            className={styles.applyBtn} 
            onClick={applyFilters}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;