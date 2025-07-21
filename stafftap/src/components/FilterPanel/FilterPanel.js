// FilterPanel.jsx
import React, { useState } from 'react';
import { FiFilter, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import styles from './FilterPanel.module.css';

const FilterPanel = ({ filters, onFilterChange, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  
  const professions = [
    "Бариста", "Официант", "Повар", "Помощник повара", 
    "Мерчендайзер", "Промоутер", "Кассир", "Уборщик"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
    setIsExpanded(false);
    if (onClose) onClose();
  };

  const resetFilters = () => {
    const reset = {
      profession: '',
      date: '',
      minRate: '',
      maxDistance: ''
    };
    setLocalFilters(reset);
    onFilterChange(reset);
    setIsExpanded(false);
    if (onClose) onClose();
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded && onClose) onClose();
  };

  const activeFiltersCount = Object.values(filters).filter(val => val !== '').length;

  return (
    <div className={styles.container}>
      <div 
        className={`${styles.filterHeader} ${isExpanded ? styles.active : ''}`}
        onClick={handleExpand}
      >
        <FiFilter className={styles.filterIcon} />
        <span>Фильтры</span>
        {activeFiltersCount > 0 && (
          <div className={styles.activeFiltersCount}>
            {activeFiltersCount}
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className={styles.filterContent}>
          <button 
            className={styles.closeFilters} 
            onClick={handleExpand}
            aria-label="Закрыть фильтры"
          >
            <FiX />
          </button>
          
          <div className={styles.filterGroup}>
            <label>Профессия</label>
            <select 
              name="profession" 
              value={localFilters.profession}
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
            <label>Дата</label>
            <input 
              type="date" 
              name="date" 
              value={localFilters.date}
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
              value={localFilters.minRate}
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
              value={localFilters.maxDistance}
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
      )}
    </div>
  );
};

export default FilterPanel;