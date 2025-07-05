import React, { useState } from 'react';
import { FiFilter, FiX } from 'react-icons/fi';

const FilterPanel = ({ filters, onFilterChange, role }) => {
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
  };

  return (
    <div className={`filter-panel ${isExpanded ? 'expanded' : ''}`}>
      <div className="filter-header" onClick={() => setIsExpanded(!isExpanded)}>
        <FiFilter className="filter-icon" />
        <span>Фильтры</span>
        <div className="active-filters-count">
          {Object.values(filters).filter(val => val !== '').length}
        </div>
      </div>
      
      {isExpanded && (
        <div className="filter-content">
          <button className="close-filters" onClick={() => setIsExpanded(false)}>
            <FiX />
          </button>
          
          <div className="filter-group">
            <label>Профессия</label>
            <select 
              name="profession" 
              value={localFilters.profession}
              onChange={handleInputChange}
            >
              <option value="">Все профессии</option>
              {professions.map(prof => (
                <option key={prof} value={prof}>{prof}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Дата</label>
            <input 
              type="date" 
              name="date" 
              value={localFilters.date}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="filter-group">
            <label>Минимальная ставка (₽)</label>
            <input 
              type="number" 
              name="minRate" 
              placeholder="0"
              value={localFilters.minRate}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          
          <div className="filter-group">
            <label>Макс. расстояние (км)</label>
            <input 
              type="number" 
              name="maxDistance" 
              placeholder="10"
              value={localFilters.maxDistance}
              onChange={handleInputChange}
              min="0"
              step="0.1"
            />
          </div>
          
          <div className="filter-actions">
            <button className="reset-btn" onClick={resetFilters}>
              Сбросить
            </button>
            <button className="apply-btn" onClick={applyFilters}>
              Применить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;