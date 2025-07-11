import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiFile, FiDownload, FiTrash2, FiCamera, FiChevronDown, FiChevronUp, FiUser, FiPhone, FiMail } from 'react-icons/fi';
import './ProfilePage.css';
import SkillsList from '../../components/SkillsList/SkillsList';
import AvailabilityCalendar from '../../components/AvailabilityCalendar/AvailabilityCalendar';
import VacancyCards from '../../components/VacancyCards/VacancyCards';
import axios from 'axios';

// Функция для безопасного форматирования чисел
const safeFormatNumber = (value, defaultValue = 0) => {
  const num = Number(value);
  return isNaN(num) 
    ? defaultValue.toLocaleString('ru-RU') 
    : num.toLocaleString('ru-RU');
};

// Компонент DocumentsList
const DocumentsList = ({ documents, isEditing, onDocumentsChange }) => {
  const safeDocuments = documents || [];
  
  const handleAddDocument = () => {
    const newDocument = {
      id: Date.now(),
      type: "ИНН",
      file_url: "document.pdf",
      status: "pending"
    };
    onDocumentsChange([...safeDocuments, newDocument]);
  };

  const handleRemoveDocument = (id) => {
    onDocumentsChange(safeDocuments.filter(doc => doc.id !== id));
  };

  return (
    <div className="documents-container">
      {safeDocuments.map(doc => (
        <div key={doc.id} className="document-item">
          <FiFile className="document-icon" />
          <div className="document-info">
            <div className="document-type">{doc.type}</div>
            <div className={`document-status ${doc.status}`}>
              {doc.status === 'approved' ? 'Подтвержден' : 
               doc.status === 'rejected' ? 'Отклонен' : 'На проверке'}
            </div>
          </div>
          <div className="document-actions">
            <button className="download-btn">
              <FiDownload />
            </button>
            {isEditing && (
              <button 
                className="remove-btn"
                onClick={() => handleRemoveDocument(doc.id)}
              >
                <FiTrash2 />
              </button>
            )}
          </div>
        </div>
      ))}
      
      {isEditing && (
        <button className="add-document-btn" onClick={handleAddDocument}>
          <FiPlus /> Добавить документ
        </button>
      )}
    </div>
  );
};

// Компонент для отображения списка сотрудников по вакансии
const WorkersList = ({ workers }) => {
  if (!workers || workers.length === 0) {
    return (
      <div className="no-workers">
        <p>На эту вакансию еще не приняты сотрудники</p>
      </div>
    );
  }

  return (
    <div className="workers-list">
      {workers.map(worker => (
        <div key={worker.id} className="worker-card">
          <div className="worker-avatar">
            {worker.avatar_url ? (
              <img src={worker.avatar_url} alt={worker.first_name} />
            ) : (
              <div className="avatar-initials">
                {worker.first_name?.[0]}{worker.last_name?.[0]}
              </div>
            )}
          </div>
          
          <div className="worker-info">
            <h3>{worker.first_name} {worker.last_name}</h3>
            
            <div className="worker-contacts">
              {worker.phone && (
                <div className="contact-item">
                  <FiPhone className="contact-icon" />
                  <span>{worker.phone}</span>
                </div>
              )}
              
              {worker.email && (
                <div className="contact-item">
                  <FiMail className="contact-icon" />
                  <span>{worker.email}</span>
                </div>
              )}
            </div>
            
            <div className="worker-stats">
              <div className="stat-item">
                <span className="stat-label">Рейтинг:</span>
                <span className="stat-value">{worker.rating || 'Нет оценок'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Выполнено смен:</span>
                <span className="stat-value">{worker.completed_shifts || 0}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Функция для преобразования данных пользователя
const transformUser = (userData) => {
  if (!userData) return null;
  
  return {
    ...userData,
    balance: userData.balance || 0,
    skills: userData.skills || [],
    documents: userData.documents || [],
    availability: userData.availability || {},
    rating: userData.rating || 0,
    reviews_count: userData.reviews_count || 0,
    company_name: userData.company_name || '',
    rate_per_shift: userData.rate_per_shift || 0,
    experience_months: userData.experience_months || 0
  };
};

// Основной компонент ProfilePage
const ProfilePage = ({ user, onSave, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  
  // Состояния для вакансий
  const [employerJobs, setEmployerJobs] = useState([]);
  const [workerBookings, setWorkerBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Состояния для управления отображением сотрудников по вакансиям
  const [expandedVacancies, setExpandedVacancies] = useState({});
  const [workersByVacancy, setWorkersByVacancy] = useState({});

  // Функция для получения токена авторизации
  const getAuthToken = () => {
    return localStorage.getItem('access_token');
  };

  useEffect(() => {
    if (user) {
      setEditingProfile(transformUser(user));
      setErrors({});
      setAvatarFile(null);
      setAvatarPreview(null);
      
      // Загружаем данные в зависимости от роли
      if (user.role === 'employer') {
        loadEmployerJobs(user.id);
      } else if (user.role === 'worker') {
        loadWorkerBookings(user.id);
      }
    }
  }, [user]);

  // Загрузка вакансий работодателя
  const loadEmployerJobs = async (employerId) => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `http://localhost:8000/api/jobs/employer/${employerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setEmployerJobs(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке вакансий работодателя:', error);
      setEmployerJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка бронирований работника
  const loadWorkerBookings = async (workerId) => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `http://localhost:8000/api/bookings/my-applications/`,
        {
          params: { status: 'confirmed' },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setWorkerBookings(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке бронирований работника:', error);
      setWorkerBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка сотрудников для конкретной вакансии (ИСПРАВЛЕНА ОШИБКА 401)
  const loadWorkersForVacancy = async (jobId) => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('Токен авторизации отсутствует');
        return;
      }

      const response = await axios.get(
        `http://localhost:8000/api/jobs/${jobId}/confirmed_workers`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setWorkersByVacancy(prev => ({
        ...prev,
        [jobId]: response.data.map(item => item.worker)
      }));
    } catch (error) {
      console.error('Ошибка при загрузке сотрудников:', error);
      setWorkersByVacancy(prev => ({
        ...prev,
        [jobId]: []
      }));
    }
  };

  // Переключение отображения сотрудников по вакансии
  const toggleVacancyExpand = (jobId) => {
    setExpandedVacancies(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
    
    // Если сотрудники еще не загружены - загружаем
    if (!workersByVacancy[jobId]) {
      loadWorkersForVacancy(jobId);
    }
  };

  // Валидация полей формы
  const validateFields = () => {
    const newErrors = {};
    let isValid = true;

    // Проверка имени
    if (!editingProfile.first_name?.trim()) {
      newErrors.first_name = 'Имя обязательно для заполнения';
      isValid = false;
    } else if (editingProfile.first_name.length < 2) {
      newErrors.first_name = 'Имя должно содержать минимум 2 символа';
      isValid = false;
    }

    // Проверка фамилии
    if (!editingProfile.last_name?.trim()) {
      newErrors.last_name = 'Фамилия обязательна для заполнения';
      isValid = false;
    } else if (editingProfile.last_name.length < 2) {
      newErrors.last_name = 'Фамилия должна содержать минимум 2 символа';
      isValid = false;
    }

    // Проверка email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editingProfile.email) {
      newErrors.email = 'Email обязателен для заполнения';
      isValid = false;
    } else if (!emailRegex.test(editingProfile.email)) {
      newErrors.email = 'Неверный формат email';
      isValid = false;
    }

    // Проверка даты рождения
    if (!editingProfile.birth_date) {
      newErrors.birth_date = 'Дата рождения обязательна';
      isValid = false;
    } else {
      const birthDate = new Date(editingProfile.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        newErrors.birth_date = 'Возраст должен быть не менее 18 лет';
        isValid = false;
      }
    }

    // Валидация для работника
    if (editingProfile.role === 'worker') {
      // Проверка ставки за смену
      if (!editingProfile.rate_per_shift) {
        newErrors.rate_per_shift = 'Ставка обязательна';
        isValid = false;
      } else if (isNaN(Number(editingProfile.rate_per_shift))) {
        newErrors.rate_per_shift = 'Ставка должна быть числом';
        isValid = false;
      } else if (Number(editingProfile.rate_per_shift) <= 0) {
        newErrors.rate_per_shift = 'Ставка должна быть положительной';
        isValid = false;
      }

      // Проверка опыта работы
      if (!editingProfile.experience_months) {
        newErrors.experience_months = 'Опыт обязателен';
        isValid = false;
      } else if (isNaN(Number(editingProfile.experience_months))) {
        newErrors.experience_months = 'Опыт должен быть числом';
        isValid = false;
      } else if (Number(editingProfile.experience_months) < 0) {
        newErrors.experience_months = 'Опыт не может быть отрицательным';
        isValid = false;
      }
    }

    // Валидация для работодателя
    if (editingProfile.role === 'employer') {
      // Проверка названия компании
      if (!editingProfile.company_name?.trim()) {
        newErrors.company_name = 'Название компании обязательно';
        isValid = false;
      } else if (editingProfile.company_name.length < 2) {
        newErrors.company_name = 'Название компании должно содержать минимум 2 символа';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  // Обработчик выбора файла аватара
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Проверка типа файла
      if (!file.type.match('image.*')) {
        alert('Пожалуйста, выберите файл изображения');
        return;
      }

      // Проверка размера файла (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер 5MB');
        return;
      }

      setAvatarFile(file);
      
      // Создание URL для превью
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleSaveClick = async () => {
    if (!onSave || !editingProfile) {
      setIsEditing(false);
      return;
    }

    // Проверка валидации перед сохранением
    if (!validateFields()) {
      return;
    }

    setIsSaving(true);
    try {
      // Подготовка данных для сохранения
      const dataToSave = {
        ...editingProfile,
        // Преобразование числовых полей
        rate_per_shift: Number(editingProfile.rate_per_shift),
        experience_months: Number(editingProfile.experience_months),
        // Добавляем файл аватара
        avatarFile: avatarFile,
      };

      await onSave(dataToSave);
      setIsEditing(false);
      setErrors({});
      // Сбрасываем состояние аватара после сохранения
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error("Ошибка сохранения:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setEditingProfile(transformUser(user));
      setErrors({});
      // Сбрасываем состояние аватара
      setAvatarFile(null);
      setAvatarPreview(null);
    }
    setIsEditing(false);
  };

  // Обработчик изменения числовых полей (только цифры)
  const handleNumericChange = (field, value) => {
    // Разрешаем только цифры и пустую строку
    if (value === '' || /^\d+$/.test(value)) {
      setEditingProfile({
        ...editingProfile,
        [field]: value
      });
    }
  };

  // Обработчик клика по области аватара
  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (!user || !editingProfile) {
    return (
      <div className="profile-loading">
        <div className="loader"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  const currentProfile = isEditing ? editingProfile : transformUser(user);

  const formatBalance = (balance) => {
    return safeFormatNumber(balance);
  };

  const getInitials = () => {
    const firstNameChar = currentProfile.first_name?.charAt(0) || '';
    const lastNameChar = currentProfile.last_name?.charAt(0) || '';
    return `${firstNameChar}${lastNameChar}`;
  };

  return (
    <div className="profile-page">
      <div className="profile-banner">
        <div className="profile-avatar">
          <div 
            className={`avatar-placeholder ${isEditing ? 'editable' : ''}`}
            onClick={handleAvatarClick}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="avatar-image" />
            ) : currentProfile.avatar_url ? (
              <img src={currentProfile.avatar_url} alt="Profile" className="avatar-image" />
            ) : (
              <div className="avatar-initials">{getInitials()}</div>
            )}
            
            {isEditing && (
              <div className="avatar-overlay">
                <FiCamera className="camera-icon" />
                <span>Изменить фото</span>
              </div>
            )}
          </div>
          
          {isEditing && (
            <input 
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          )}
        </div>
        
        <div className="profile-info">
          <h1>{currentProfile.first_name || ''} {currentProfile.last_name || ''}</h1>
          <div className="profile-meta">
            <span className={`role-badge ${currentProfile.role}`}>
              {currentProfile.role === 'worker' ? 'Сотрудник' : 'Работодатель'}
            </span>
            {currentProfile.is_verified && (
              <span className="verified-badge">Подтвержден</span>
            )}
            <span className="member-since">
              {currentProfile.created_at ? 
                `С ${new Date(currentProfile.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}` : 
                'Дата регистрации неизвестна'}
            </span>
          </div>
          
          <div className="balance-info">
            <span>Баланс: {formatBalance(currentProfile.balance)} ₽</span>
            <button className="withdraw-btn">Вывести</button>
          </div>
        </div>
        
        <div className="profile-actions">
          {isEditing ? (
            <>
              <button 
                className="cancel-btn" 
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button 
                className="save-btn" 
                onClick={handleSaveClick}
                disabled={isSaving}
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </>
          ) : (
            <>
              <button 
                className="edit-btn" 
                onClick={() => setIsEditing(true)}
              >
                Редактировать
              </button>
              <button 
                className="logout-btn" 
                onClick={onLogout}
              >
                Выйти
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Информация
        </button>
        {currentProfile.role === 'worker' && (
          <button 
            className={`tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            Доступность
          </button>
        )}
        <button 
          className={`tab-btn ${activeTab === 'vacancies' ? 'active' : ''}`}
          onClick={() => setActiveTab('vacancies')}
        >
          Мои вакансии
        </button>
      </div>
      
      <div className="profile-content">
        {activeTab === 'info' && (
          <>
            <div className="section" title="Основная информация">
              <div className="info-grid">
                <div className="info-item">
                  <label>Имя</label>
                  {isEditing ? (
                    <div>
                      <input 
                        type="text" 
                        value={editingProfile.first_name || ''}
                        onChange={(e) => setEditingProfile({
                          ...editingProfile,
                          first_name: e.target.value
                        })}
                        className={errors.first_name ? 'error-input' : ''}
                      />
                      {errors.first_name && <div className="error-message">{errors.first_name}</div>}
                    </div>
                  ) : (
                    <p>{currentProfile.first_name || 'Не указано'}</p>
                  )}
                </div>
                
                <div className="info-item">
                  <label>Фамилия</label>
                  {isEditing ? (
                    <div>
                      <input 
                        type="text" 
                        value={editingProfile.last_name || ''}
                        onChange={(e) => setEditingProfile({
                          ...editingProfile,
                          last_name: e.target.value
                        })}
                        className={errors.last_name ? 'error-input' : ''}
                      />
                      {errors.last_name && <div className="error-message">{errors.last_name}</div>}
                    </div>
                  ) : (
                    <p>{currentProfile.last_name || 'Не указано'}</p>
                  )}
                </div>
                
                <div className="info-item">
                  <label>Телефон</label>
                  <p>{currentProfile.phone || 'Не указан'}</p>
                </div>
                
                <div className="info-item">
                  <label>Email</label>
                  {isEditing ? (
                    <div>
                      <input 
                        type="email" 
                        value={editingProfile.email || ''}
                        onChange={(e) => setEditingProfile({
                          ...editingProfile,
                          email: e.target.value
                        })}
                        className={errors.email ? 'error-input' : ''}
                      />
                      {errors.email && <div className="error-message">{errors.email}</div>}
                    </div>
                  ) : (
                    <p>{currentProfile.email || 'Не указан'}</p>
                  )}
                </div>
                
                <div className="info-item">
                  <label>Дата рождения</label>
                  {isEditing ? (
                    <div>
                      <input 
                        type="date" 
                        value={editingProfile.birth_date || ''}
                        onChange={(e) => setEditingProfile({
                          ...editingProfile,
                          birth_date: e.target.value
                        })}
                        max={new Date().toISOString().split('T')[0]}
                        className={errors.birth_date ? 'error-input' : ''}
                      />
                      {errors.birth_date && <div className="error-message">{errors.birth_date}</div>}
                    </div>
                  ) : (
                    <p>{currentProfile.birth_date ? 
                          new Date(currentProfile.birth_date).toLocaleDateString('ru-RU') : 
                          'Не указана'}
                    </p>
                  )}
                </div>
                
                {currentProfile.role === 'worker' && (
                  <>
                    <div className="info-item">
                      <label>Ставка за смену</label>
                      {isEditing ? (
                        <div>
                          <input 
                            type="text" 
                            value={editingProfile.rate_per_shift || ''}
                            onChange={(e) => handleNumericChange('rate_per_shift', e.target.value)}
                            className={errors.rate_per_shift ? 'error-input' : ''}
                          />
                          {errors.rate_per_shift && <div className="error-message">{errors.rate_per_shift}</div>}
                        </div>
                      ) : (
                        <p>{safeFormatNumber(currentProfile.rate_per_shift)} ₽</p>
                      )}
                    </div>
                    
                    <div className="info-item">
                      <label>Опыт работы (месяцев)</label>
                      {isEditing ? (
                        <div>
                          <input 
                            type="text" 
                            value={editingProfile.experience_months || ''}
                            onChange={(e) => handleNumericChange('experience_months', e.target.value)}
                            className={errors.experience_months ? 'error-input' : ''}
                          />
                          {errors.experience_months && <div className="error-message">{errors.experience_months}</div>}
                        </div>
                      ) : (
                        <p>
                          {currentProfile.experience_months ? 
                            `${Math.floor(currentProfile.experience_months / 12)} лет ${currentProfile.experience_months % 12} месяцев` : 
                            'Без опыта'}
                        </p>
                      )}
                    </div>
                  </>
                )}
                
                {currentProfile.role === 'employer' && (
                  <div className="info-item full-width">
                    <label>Название компании</label>
                    {isEditing ? (
                      <div>
                        <input 
                          type="text" 
                          value={editingProfile.company_name || ''}
                          onChange={(e) => setEditingProfile({
                            ...editingProfile,
                            company_name: e.target.value
                          })}
                          className={errors.company_name ? 'error-input' : ''}
                        />
                        {errors.company_name && <div className="error-message">{errors.company_name}</div>}
                      </div>
                    ) : (
                      <p>{currentProfile.company_name || 'Не указано'}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="section" title={currentProfile.role === 'worker' ? "Навыки" : "Документы"}>
              {currentProfile.role === 'worker' ? (
                <SkillsList 
                  skills={isEditing ? editingProfile.skills : currentProfile.skills} 
                  isEditing={isEditing}
                  onSkillsChange={(newSkills) => setEditingProfile({
                    ...editingProfile,
                    skills: newSkills
                  })}
                />
              ) : (
                <DocumentsList 
                  documents={isEditing ? editingProfile.documents : currentProfile.documents} 
                  isEditing={isEditing}
                  onDocumentsChange={(newDocs) => setEditingProfile({
                    ...editingProfile,
                    documents: newDocs
                  })}
                />
              )}
            </div>
            
            <div className="section" title="Рейтинг и отзывы">
              <div className="rating-container">
                <div className="rating-value">{safeFormatNumber(currentProfile.rating)}</div>
                <div className="stars">
                  {'★'.repeat(Math.floor(currentProfile.rating || 0))}
                  {'☆'.repeat(5 - Math.floor(currentProfile.rating || 0))}
                </div>
                <div className="reviews-count">
                  {currentProfile.reviews_count || 0} отзывов
                </div>
              </div>
              <button 
                className="view-reviews-btn"
                onClick={() => navigate(`/profile/${currentProfile.id}/reviews`)}
              >
                Посмотреть все отзывы
              </button>
            </div>
          </>
        )}
        
        {activeTab === 'availability' && currentProfile.role === 'worker' && (
          <div className="section" title="Мой график доступности">
            <AvailabilityCalendar
              availability={isEditing ? editingProfile.availability : currentProfile.availability}
              isEditing={isEditing}
              onAvailabilityChange={(newAvailability) => setEditingProfile({
                ...editingProfile,
                availability: newAvailability
              })}
            />
          </div>
        )}
        
        {activeTab === 'vacancies' && (
          <div className="section" title={currentProfile.role === 'worker' ? "Активные вакансии" : "Мои вакансии"}>
            {isLoading ? (
              <div className="loading-vacancies">
                <p>Загрузка данных...</p>
              </div>
            ) : currentProfile.role === 'employer' ? (
              employerJobs.length > 0 ? (
                <div className="vacancies-list">
                  {employerJobs.map(job => (
                    <div key={job.id} className="vacancy-container">
                      <div className="vacancy-header">
                        <VacancyCards
                          vacancy={{
                            ...job,
                            rate: job.rate || 0, // Защита от undefined
                            startTime: job.start_time,
                            endTime: job.end_time
                          }}
                          role={currentProfile.role}
                        />
                        
                        <button 
                          className="toggle-workers-btn"
                          onClick={() => toggleVacancyExpand(job.id)}
                        >
                          {expandedVacancies[job.id] ? 'Скрыть сотрудников' : 'Показать сотрудников'}
                          {expandedVacancies[job.id] ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </div>
                      
                      {expandedVacancies[job.id] && (
                        <div className="workers-container">
                          <h3>Принятые сотрудники:</h3>
                          <WorkersList workers={workersByVacancy[job.id] || []} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-vacancies">
                  <p>Вы еще не создали ни одной вакансии</p>
                  <button 
                    className="create-vacancy-btn"
                    onClick={() => navigate('/create-vacancy')}
                  >
                    Создать вакансию
                  </button>
                </div>
              )
            ) : workerBookings.length > 0 ? (
              <div className="vacancies-list">
                {workerBookings.map(booking => (
                  <VacancyCards
                    key={booking.job.id}
                    vacancy={{
                      ...booking.job,
                      rate: booking.job.rate || 0, // Защита от undefined
                      startTime: booking.job.start_time,
                      endTime: booking.job.end_time
                    }}
                    role={currentProfile.role}
                  />
                ))}
              </div>
            ) : (
              <div className="no-vacancies">
                <p>У вас пока нет активных вакансий</p>
                <button 
                  className="create-vacancy-btn"
                  onClick={() => navigate('/feed')}
                >
                  Найти вакансии
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;