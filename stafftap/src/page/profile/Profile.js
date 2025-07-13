import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiFile, FiDownload, FiTrash2, FiCamera, FiCheckCircle, FiXCircle, FiUser, FiLock, FiUnlock } from 'react-icons/fi';
import './ProfilePage.css';
import SkillsList from '../../components/SkillsList/SkillsList';
import AvailabilityCalendar from '../../components/AvailabilityCalendar/AvailabilityCalendar';
import VacancyCards from '../../components/VacancyCards/VacancyCards';
import axios from 'axios';
import API_BASE_URL from '../../apiConfig';

// Функция для безопасного форматирования чисел
const safeFormatNumber = (value, defaultValue = 0) => {
  const num = Number(value);
  return isNaN(num) 
    ? defaultValue.toLocaleString('ru-RU') 
    : num.toLocaleString('ru-RU');
};

// Компонент списка документов
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

// Функция преобразования данных пользователя
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

// Компонент модерации вакансий для администратора
const AdminJobsModeration = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/jobs/moderation`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setJobs(response.data);
      } catch (err) {
        setError('Ошибка загрузки вакансий');
        console.error('Ошибка загрузки вакансий:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobs();
  }, []);

  const handleStatusChange = async (jobId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/api/jobs/${jobId}/status`, 
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setJobs(jobs.filter(job => job.id !== jobId));
    } catch (err) {
      console.error('Ошибка изменения статуса:', err);
      setError('Не удалось изменить статус');
    }
  };

  if (loading) {
    return <div className="admin-loading">Загрузка вакансий...</div>;
  }

  if (error) {
    return <div className="admin-error">{error}</div>;
  }

  return (
    <div className="admin-jobs-moderation">
      <h2>Вакансии на модерации</h2>
      
      {jobs.length === 0 ? (
        <div className="no-jobs">
          <p>Нет вакансий для модерации</p>
        </div>
      ) : (
        <div className="jobs-list">
          {jobs.map(job => (
            <div key={job.id} className="moderation-job-card">
              <div className="job-header">
                <h3>{job.title}</h3>
                <span className="company">{job.company_name}</span>
              </div>
              
              <div className="job-details">
                <div className="detail">
                  <strong>Описание:</strong>
                  <p>{job.description}</p>
                </div>
                
                <div className="detail-row">
                  <div className="detail">
                    <strong>Дата:</strong>
                    <span>{new Date(job.work_date).toLocaleDateString('ru-RU')}</span>
                  </div>
                  
                  <div className="detail">
                    <strong>Время:</strong>
                    <span>{job.start_time} - {job.end_time}</span>
                  </div>
                </div>
                
                <div className="detail-row">
                  <div className="detail">
                    <strong>Ставка:</strong>
                    <span>{job.rate} ₽</span>
                  </div>
                  
                  <div className="detail">
                    <strong>Требуемый навык:</strong>
                    <span>{job.required_skill_name}</span>
                  </div>
                </div>
                
                <div className="detail">
                  <strong>Адрес:</strong>
                  <span>{job.address}</span>
                </div>
              </div>
              
              <div className="job-actions">
                <button 
                  className="approve-btn"
                  onClick={() => handleStatusChange(job.id, 'active')}
                >
                  <FiCheckCircle /> Одобрить
                </button>
                <button 
                  className="reject-btn"
                  onClick={() => handleStatusChange(job.id, 'rejected')}
                >
                  <FiXCircle /> Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Компонент управления пользователями для администратора
const AdminUsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/admin/users`, {
          params: {
            page: currentPage,
            page_size: pageSize,
            search: searchTerm
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setUsers(response.data.users);
        setTotalPages(response.data.total_pages);
      } catch (err) {
        setError('Ошибка загрузки пользователей');
        console.error('Ошибка загрузки пользователей:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [currentPage, searchTerm]);

  const handleBlockToggle = async (userId, isBlocked) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/api/admin/users/${userId}/block`, 
        { is_blocked: !isBlocked },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_blocked: !isBlocked } : user
      ));
    } catch (err) {
      console.error('Ошибка изменения статуса блокировки:', err);
      setError('Не удалось изменить статус блокировки');
    }
  };

  const handleVerifyToggle = async (userId, isVerified) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/api/admin/users/${userId}/verify`, 
        { is_verified: !isVerified },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_verified: !isVerified } : user
      ));
    } catch (err) {
      console.error('Ошибка изменения статуса верификации:', err);
      setError('Не удалось изменить статус верификации');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/api/admin/users/${userId}/role`, 
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (err) {
      console.error('Ошибка изменения роли:', err);
      setError('Не удалось изменить роль пользователя');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return <div className="admin-loading">Загрузка пользователей...</div>;
  }

  if (error) {
    return <div className="admin-error">{error}</div>;
  }

  return (
    <div className="admin-users-management">
      <h2>Управление пользователями</h2>
      
      <div className="admin-search">
        <input
          type="text"
          placeholder="Поиск по email, имени или компании..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>
      
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Компания</th>
              <th>Верифицирован</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={user.is_blocked ? 'blocked' : ''}>
                <td>{user.id}</td>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="role-select"
                  >
                    <option value="worker">Сотрудник</option>
                    <option value="employer">Работодатель</option>
                    <option value="admin">Администратор</option>
                  </select>
                </td>
                <td>{user.company_name || '-'}</td>
                <td>
                  {user.is_verified ? (
                    <span className="verified">Да</span>
                  ) : (
                    <span className="not-verified">Нет</span>
                  )}
                </td>
                <td>
                  {user.is_blocked ? (
                    <span className="blocked">Заблокирован</span>
                  ) : (
                    <span className="active">Активен</span>
                  )}
                </td>
                <td className="actions">
                  <button
                    className={`action-btn ${user.is_verified ? 'unverify' : 'verify'}`}
                    onClick={() => handleVerifyToggle(user.id, user.is_verified)}
                  >
                    {user.is_verified ? 'Снять верификацию' : 'Верифицировать'}
                  </button>
                  <button
                    className={`action-btn ${user.is_blocked ? 'unblock' : 'block'}`}
                    onClick={() => handleBlockToggle(user.id, user.is_blocked)}
                  >
                    {user.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`page-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => handlePageChange(page)}
              disabled={currentPage === page}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Основной компонент страницы профиля
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
  
  const [employerJobs, setEmployerJobs] = useState([]);
  const [workerBookings, setWorkerBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  useEffect(() => {
    if (user) {
      setEditingProfile(transformUser(user));
      setErrors({});
      setAvatarFile(null);
      setAvatarPreview(null);
      
      if (user.role === 'employer') {
        loadEmployerJobs(user.id);
      } else if (user.role === 'worker') {
        loadWorkerBookings(user.id);
      }
    }
  }, [user]);

  const loadEmployerJobs = async (employerId) => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${API_BASE_URL}/api/jobs/employer/${employerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setEmployerJobs(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке вакансий работодателя:', error);
      if (error.response?.status === 401) onLogout();
      setEmployerJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkerBookings = async (workerId) => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${API_BASE_URL}/api/bookings/my-applications/`,
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
      if (error.response?.status === 401) onLogout();
      setWorkerBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const validateFields = () => {
    const newErrors = {};
    let isValid = true;

    if (!editingProfile.first_name?.trim()) {
      newErrors.first_name = 'Имя обязательно для заполнения';
      isValid = false;
    } else if (editingProfile.first_name.length < 2) {
      newErrors.first_name = 'Имя должно содержать минимум 2 символа';
      isValid = false;
    }

    if (!editingProfile.last_name?.trim()) {
      newErrors.last_name = 'Фамилия обязательна для заполнения';
      isValid = false;
    } else if (editingProfile.last_name.length < 2) {
      newErrors.last_name = 'Фамилия должна содержать минимум 2 символа';
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editingProfile.email) {
      newErrors.email = 'Email обязателен для заполнения';
      isValid = false;
    } else if (!emailRegex.test(editingProfile.email)) {
      newErrors.email = 'Неверный формат email';
      isValid = false;
    }

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

    if (editingProfile.role === 'worker') {
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

    if (editingProfile.role === 'employer') {
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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        alert('Пожалуйста, выберите файл изображения');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер 5MB');
        return;
      }

      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleSaveClick = async () => {
    if (!onSave || !editingProfile) {
      setIsEditing(false);
      return;
    }

    if (!validateFields()) {
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        ...editingProfile,
        rate_per_shift: Number(editingProfile.rate_per_shift),
        experience_months: Number(editingProfile.experience_months),
        avatarFile: avatarFile,
      };

      await onSave(dataToSave);
      setIsEditing(false);
      setErrors({});
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
      setAvatarFile(null);
      setAvatarPreview(null);
    }
    setIsEditing(false);
  };

  const handleNumericChange = (field, value) => {
    if (value === '' || /^\d+$/.test(value)) {
      setEditingProfile({
        ...editingProfile,
        [field]: value
      });
    }
  };

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleVacancyClick = (jobId) => {
    navigate(`/job/${jobId}`);
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
  const isAdmin = currentProfile?.role === 'admin';

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
            className={`avatar-placeholder ${isEditing && !isAdmin ? 'editable' : ''}`}
            onClick={isEditing && !isAdmin ? handleAvatarClick : undefined}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="avatar-image" />
            ) : currentProfile.avatar_url ? (
              <img src={currentProfile.avatar_url} alt="Profile" className="avatar-image" />
            ) : (
              <div className="avatar-initials">{getInitials()}</div>
            )}
            
            {isEditing && !isAdmin && (
              <div className="avatar-overlay">
                <FiCamera className="camera-icon" />
                <span>Изменить фото</span>
              </div>
            )}
          </div>
          
          {isEditing && !isAdmin && (
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
              {isAdmin ? 'Администратор' : 
               currentProfile.role === 'worker' ? 'Сотрудник' : 'Работодатель'}
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
          
          {!isAdmin && (
            <div className="balance-info">
              <span>Баланс: {formatBalance(currentProfile.balance)} ₽</span>
              <button className="withdraw-btn">Вывести</button>
            </div>
          )}
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
              {!isAdmin && (
                <button 
                  className="edit-btn" 
                  onClick={() => setIsEditing(true)}
                >
                  Редактировать
                </button>
              )}
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
        
        {isAdmin ? (
          <>
            <button 
              className={`tab-btn ${activeTab === 'admin-jobs' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-jobs')}
            >
              Модерация вакансий
            </button>
            <button 
              className={`tab-btn ${activeTab === 'admin-users' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-users')}
            >
              Управление пользователями
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
      
      <div className="profile-content">
        {activeTab === 'info' && (
          <>
            <div className="section" title="Основная информация">
              <div className="info-grid">
                <div className="info-item">
                  <label>Имя</label>
                  {isEditing && !isAdmin ? (
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
                  {isEditing && !isAdmin ? (
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
                  {isEditing && !isAdmin ? (
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
                  {isEditing && !isAdmin ? (
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
                
                {!isAdmin && currentProfile.role === 'worker' && (
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
                
                {!isAdmin && currentProfile.role === 'employer' && (
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
            
            {!isAdmin && (
              <>
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
          </>
        )}
        
        {activeTab === 'availability' && currentProfile.role === 'worker' && !isAdmin && (
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
        
        {activeTab === 'vacancies' && !isAdmin && (
          <div className="section" title={currentProfile.role === 'worker' ? "Активные вакансии" : "Мои вакансии"}>
            {isLoading ? (
              <div className="loading-vacancies">
                <p>Загрузка данных...</p>
              </div>
            ) : currentProfile.role === 'employer' ? (
              employerJobs.length > 0 ? (
                <div className="vacancies-list">
                  {employerJobs.map(job => (
                    <div 
                      key={job.id} 
                      className="vacancy-container"
                      onClick={() => handleVacancyClick(job.id)}
                    >
                      <VacancyCards
                        vacancy={{
                          ...job,
                          rate: job.rate || 0,
                          startTime: job.start_time,
                          endTime: job.end_time,
                          company_name: job.company_name,
                          remaining_slots: job.remaining_slots || 0
                        }}
                        role={currentProfile.role}
                      />
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
                  <div 
                    key={booking.job.id} 
                    className="vacancy-container"
                    onClick={() => handleVacancyClick(booking.job.id)}
                  >
                    <VacancyCards
                      vacancy={{
                        ...booking.job,
                        rate: booking.job.rate || 0,
                        startTime: booking.job.start_time,
                        endTime: booking.job.end_time,
                        company_name: booking.job.company_name,
                        remaining_slots: booking.job.remaining_slots || 0
                      }}
                      role={currentProfile.role}
                    />
                  </div>
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
        
        {isAdmin && activeTab === 'admin-jobs' && (
          <AdminJobsModeration />
        )}
        
        {isAdmin && activeTab === 'admin-users' && (
          <AdminUsersManagement />
        )}
      </div>
    </div>
  );
};

export default ProfilePage;