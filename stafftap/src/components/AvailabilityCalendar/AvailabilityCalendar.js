import React, { useState } from 'react';
import { format, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const AvailabilityCalendar = ({ availability, isEditing, onAvailabilityChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState(
    availability.map(a => parseISO(a.date))
  );

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleDateClick = (date) => {
    if (!isEditing) return;
    
    const newSelectedDates = [...selectedDates];
    const dateIndex = newSelectedDates.findIndex(d => isSameDay(d, date));
    
    if (dateIndex > -1) {
      newSelectedDates.splice(dateIndex, 1);
    } else {
      newSelectedDates.push(date);
    }
    
    setSelectedDates(newSelectedDates);
    onAvailabilityChange(newSelectedDates.map(d => ({ 
      id: d.getTime(), 
      date: format(d, 'yyyy-MM-dd') 
    })));
  };

  
  const renderDays = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    startDate.setDate(monthStart.getDate() - monthStart.getDay());
    
    const endDate = new Date(monthEnd);
    endDate.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));
    
    const days = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      days.push(currentDate);
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days.map((date, i) => {
      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
      const isSelected = selectedDates.some(d => isSameDay(d, date));
      const isToday = isSameDay(date, new Date());
      
      return (
        <div 
          key={i}
          className={`calendar-day 
            ${isCurrentMonth ? 'current-month' : 'other-month'} 
            ${isSelected ? 'selected' : ''}
            ${isToday ? 'today' : ''}`}
          onClick={() => handleDateClick(date)}
        >
          {date.getDate()}
          {isSelected && <div className="availability-indicator"></div>}
        </div>
      );
    });
  };

  return (
    <div className="availability-calendar">
      <div className="calendar-header">
        <button onClick={prevMonth}>&lt;</button>
        <h3>{format(currentMonth, 'LLLL yyyy', { locale: ru })}</h3>
        <button onClick={nextMonth}>&gt;</button>
      </div>
      
      <div className="calendar-weekdays">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, i) => (
          <div key={i} className="weekday">{day}</div>
        ))}
      </div>
      
      <div className="calendar-days">
        {renderDays()}
      </div>
      
      {isEditing && (
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="availability-indicator"></div>
            <span>Доступен</span>
          </div>
          <p>Нажмите на дату, чтобы изменить доступность</p>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendar;