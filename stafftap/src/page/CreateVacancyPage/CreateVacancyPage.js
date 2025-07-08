import './CreateVacancyPage.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateVacancyPage = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    required_skill_id: '',
    work_date: '',
    start_time: '09:00',
    end_time: '18:00',
    address: '',
    rate: '',
    workers_needed: 1
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/skills');
        setSkills(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке навыков:', error);
        alert('Не удалось загрузить список навыков');
      } finally {
        setLoadingSkills(false);
      }
    };
    fetchSkills();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) newErrors.title = 'Введите название';
    if (!formData.description.trim()) newErrors.description = 'Введите описание';
    if (!formData.work_date) newErrors.work_date = 'Укажите дату';
    if (!formData.address.trim()) newErrors.address = 'Укажите адрес';
    
    const rateValue = parseFloat(formData.rate);
    if (isNaN(rateValue)) {
      newErrors.rate = 'Введите числовое значение';
    } else if (rateValue <= 0) {
      newErrors.rate = 'Ставка должна быть больше 0';
    }
    

    const workersValue = parseInt(formData.workers_needed);
    if (isNaN(workersValue)) {
      newErrors.workers_needed = 'Введите числовое значение';
    } else if (workersValue < 1) {
      newErrors.workers_needed = 'Нужен хотя бы 1 работник';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;


    const payload = {
      ...formData,
      required_skill_id: formData.required_skill_id || null,
      rate: parseFloat(formData.rate),
      workers_needed: parseInt(formData.workers_needed)
    };

    setIsSubmitting(true);
    try {
      await axios.post('http://localhost:8000/api/jobs', payload, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      navigate('/employer-feed'); 
    } catch (error) {
      console.error('Ошибка создания вакансии:', error);
      
      let errorMessage = 'Ошибка при создании вакансии';
      if (error.response) {
  
        if (error.response.data && error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.status === 401) {
          errorMessage = 'Ошибка авторизации';
        } else if (error.response.status === 403) {
          errorMessage = 'Доступ запрещен';
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-vacancy-page">
      <h1>Создать вакансию</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Название вакансии *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={errors.title ? 'error' : ''}
            placeholder="Например: Официант на мероприятие"
          />
          {errors.title && <span className="error-message">{errors.title}</span>}
        </div>

        <div className="form-group">
          <label>Описание *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className={errors.description ? 'error' : ''}
            placeholder="Опишите обязанности и требования"
          />
          {errors.description && <span className="error-message">{errors.description}</span>}
        </div>

        <div className="form-group">
          <label>Требуемый навык</label>
          {loadingSkills ? (
            <p>Загрузка навыков...</p>
          ) : (
            <select
              name="required_skill_id"
              value={formData.required_skill_id}
              onChange={handleChange}
            >
              <option value="">Выберите навык (необязательно)</option>
              {skills.map(skill => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Дата работы *</label>
            <input
              type="date"
              name="work_date"
              value={formData.work_date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]} // Запрет прошлых дат
              className={errors.work_date ? 'error' : ''}
            />
            {errors.work_date && <span className="error-message">{errors.work_date}</span>}
          </div>

          <div className="form-group">
            <label>Время начала</label>
            <input
              type="time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Время окончания</label>
            <input
              type="time"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Адрес *</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className={errors.address ? 'error' : ''}
            placeholder="Где будет проходить работа"
          />
          {errors.address && <span className="error-message">{errors.address}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Ставка (₽) *</label>
            <input
              type="number"
              name="rate"
              value={formData.rate}
              onChange={handleChange}
              min="0"
              step="100"
              className={errors.rate ? 'error' : ''}
              placeholder="1000"
            />
            {errors.rate && <span className="error-message">{errors.rate}</span>}
          </div>

          <div className="form-group">
            <label>Количество работников *</label>
            <input
              type="number"
              name="workers_needed"
              value={formData.workers_needed}
              onChange={handleChange}
              min="1"
              className={errors.workers_needed ? 'error' : ''}
            />
            {errors.workers_needed && (
              <span className="error-message">{errors.workers_needed}</span>
            )}
          </div>
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Создание...' : 'Создать вакансию'}
        </button>
      </form>
    </div>
  );
};

export default CreateVacancyPage;