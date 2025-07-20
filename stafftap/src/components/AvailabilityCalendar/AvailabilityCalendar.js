import React, { useState, useEffect } from 'react';
import moment from 'moment';
import 'moment/locale/ru';
import './AvailabilityCalendar.css';

moment.locale('ru');

const AvailabilityCalendar = ({ availability, onDayClick, isEditing }) => {
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [expanded, setExpanded] = useState(false);
  const [availableDatesList, setAvailableDatesList] = useState([]);

  
  useEffect(() => {
    if (!availability) return;
    
    
    const dates = Object.keys(availability)
      .filter(date => availability[date])
      .map(date => {
        
        const dateStr = date.split('T')[0];
        return moment(dateStr).format('YYYY-MM-DD');
      });
    
    setAvailableDatesList(dates);
  }, [availability]);

  
  const startOfMonth = currentMonth.clone().startOf('month');
  const startOfCalendar = startOfMonth.clone().startOf('isoWeek');
  const endOfMonth = currentMonth.clone().endOf('month');
  const endOfCalendar = endOfMonth.clone().endOf('isoWeek');

  const weeks = [];
  let day = startOfCalendar.clone();

  
  while (day.isBefore(endOfCalendar) || day.isSame(endOfCalendar)) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(day.clone());
      day.add(1, 'day');
    }
    weeks.push(week);
  }

  
  const checkAvailability = (dateStr) => {
    return availableDatesList.includes(dateStr);
  };

  
  const prevMonth = () => setCurrentMonth(currentMonth.clone().subtract(1, 'month'));
  const nextMonth = () => setCurrentMonth(currentMonth.clone().add(1, 'month'));

  return (
    <div className="availability-calendar">
      <div className="calendar-controls">
        <button onClick={prevMonth}>&lt;</button>
        <h2>{currentMonth.format('MMMM YYYY')}</h2>
        <button onClick={nextMonth}>&gt;</button>
      </div>
      
      <div className="calendar-header">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, index) => (
          <div key={index} className="calendar-header-day">{day}</div>
        ))}
      </div>
      
      <div className="calendar-body">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="calendar-week">
            {week.map((date, dayIndex) => {
              const dateStr = date.format('YYYY-MM-DD');
              const isAvailable = checkAvailability(dateStr);
              const isCurrentMonth = date.month() === currentMonth.month();
              const isToday = date.isSame(moment(), 'day');
              const isPast = date.isBefore(moment(), 'day');

              return (
                <div
                  key={dateStr}
                  className={`calendar-day 
                    ${isCurrentMonth ? 'current-month' : 'other-month'} 
                    ${isAvailable ? 'available' : ''}
                    ${isEditing ? 'editable' : ''}
                    ${isToday ? 'today' : ''}
                    ${isPast ? 'past' : ''}`}
                  onClick={() => !isPast && isEditing && onDayClick(dateStr)}
                >
                  <div className="day-number">{date.date()}</div>
                  {isAvailable && <div className="availability-indicator">✓</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span>Доступен</span>
        </div>
        <div className="legend-item">
          <div className="legend-color today"></div>
          <span>Сегодня</span>
        </div>
      </div>
      
      <div className="available-dates-section">
        <div className="section-header" onClick={() => setExpanded(!expanded)}>
          <h3>Запланированная доступность</h3>
          <span>{expanded ? '▲' : '▼'}</span>
        </div>
        
        {expanded && (
          <div className="dates-container">
            {availableDatesList.length === 0 ? (
              <p>Нет запланированных дней</p>
            ) : (
              <ul className="available-dates-list">
                {availableDatesList
                  .sort()
                  .map(date => (
                    <li key={date}>
                      {moment(date).format('dddd, DD MMMM YYYY')}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilityCalendar;