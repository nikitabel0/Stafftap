import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import './ProfilePage.css';
import SkillsList from '../../components/SkillsList/SkillsList';
import AvailabilityCalendar from '../../components/AvailabilityCalendar/AvailabilityCalendar';
import DocumentsList from '../../components/DocumentsList/DocumentsList';
import VacancyCards from '../../components/VacancyCards/VacancyCards';

const ProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  
  const testProfile = {
    id: 1,
    first_name: "гандон",
    last_name: "пидоров",
    role: "worker2",
    phone: "+79123456789",
    email: "ivan.petrov@example.com",
    birth_date: "1990-05-15",
    company_name: "",
    experience_months: 36,
    rate_per_shift: 2500,
    is_verified: true,
    created_at: "2023-01-10T14:30:00Z",
    rating: 4.7,
    reviews_count: 24,
    balance: 15400,
    skills: [
      { id: 1, name: "Бариста" },
      { id: 2, name: "Официант" },
      { id: 3, name: "Кассир" }
    ],
    availability: [
      { id: 1, date: "2023-10-28" },
      { id: 2, date: "2023-10-29" },
      { id: 3, date: "2023-11-05" }
    ],
    documents: [],
    active_vacancies: [
      {
        id: 1,
        title: "Бариста на выходные",
        company: "Кофейня 'Утренний Эспрессо'",
        date: "2023-10-28",
        startTime: "08:00",
        endTime: "16:00",
        address: "ул. Пушкинская, 15",
        salary: 2500,
        status: "confirmed"
      }
    ]
  };

  
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      
      setTimeout(() => {
        setProfile(testProfile);
        setIsLoading(false);
      }, 800);
    };

    loadProfile();
  }, [id]);

  
  const handleSaveProfile = (updatedProfile) => {
    setProfile(updatedProfile);
    setIsEditing(false);
    
  };

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="loader"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Шапка профиля (не путать с общим хедером приложения) */}
      <div className="profile-banner">
        <div className="profile-avatar">
          <div className="avatar-placeholder">
            {profile.first_name.charAt(0)}{profile.last_name.charAt(0)}
          </div>
          {isEditing && (
            <button className="avatar-edit-btn">
              Изменить фото
            </button>
          )}
        </div>
        
        <div className="profile-info">
          <h1>{profile.first_name} {profile.last_name}</h1>
          <div className="profile-meta">
            <span className={`role-badge ${profile.role}`}>
              {profile.role === 'worker' ? 'Сотрудник' : 'Работодатель'}
            </span>
            {profile.is_verified && (
              <span className="verified-badge">Подтвержден</span>
            )}
            <span className="member-since">
              С {new Date(profile.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          
          <div className="balance-info">
            <span>Баланс: {profile.balance.toLocaleString()} ₽</span>
            <button className="withdraw-btn">Вывести</button>
          </div>
        </div>
        
        <div className="profile-actions">
          {isEditing ? (
            <>
              <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                Отмена
              </button>
              <button className="save-btn" onClick={() => handleSaveProfile(profile)}>
                Сохранить
              </button>
            </>
          ) : (
            <button className="edit-btn" onClick={() => setIsEditing(true)}>
              Редактировать
            </button>
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
        {profile.role === 'worker' && (
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
          {profile.role === 'worker' ? 'Мои вакансии' : 'Мои вакансии'}
        </button>
      </div>
      
      <div className="profile-content">
        {activeTab === 'info' && (
          <>
            <div title="Основная информация">
              <div className="info-grid">
                <div className="info-item">
                  <label>Имя</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={profile.first_name}
                      onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                    />
                  ) : (
                    <p>{profile.first_name}</p>
                  )}
                </div>
                
                <div className="info-item">
                  <label>Фамилия</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={profile.last_name}
                      onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                    />
                  ) : (
                    <p>{profile.last_name}</p>
                  )}
                </div>
                
                <div className="info-item">
                  <label>Телефон</label>
                  {isEditing ? (
                    <input 
                      type="tel" 
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    />
                  ) : (
                    <p>{profile.phone}</p>
                  )}
                </div>
                
                <div className="info-item">
                  <label>Email</label>
                  {isEditing ? (
                    <input 
                      type="email" 
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                    />
                  ) : (
                    <p>{profile.email}</p>
                  )}
                </div>
                
                <div className="info-item">
                  <label>Дата рождения</label>
                  {isEditing ? (
                    <input 
                      type="date" 
                      value={profile.birth_date}
                      onChange={(e) => setProfile({...profile, birth_date: e.target.value})}
                    />
                  ) : (
                    <p>{new Date(profile.birth_date).toLocaleDateString('ru-RU')}</p>
                  )}
                </div>
                
                {profile.role === 'worker' && (
                  <>
                    <div className="info-item">
                      <label>Ставка за смену</label>
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={profile.rate_per_shift}
                          onChange={(e) => setProfile({...profile, rate_per_shift: e.target.value})}
                        />
                      ) : (
                        <p>{profile.rate_per_shift.toLocaleString()} ₽</p>
                      )}
                    </div>
                    
                    <div className="info-item">
                      <label>Опыт работы</label>
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={profile.experience_months}
                          onChange={(e) => setProfile({...profile, experience_months: e.target.value})}
                        />
                      ) : (
                        <p>{Math.floor(profile.experience_months / 12)} лет {profile.experience_months % 12} месяцев</p>
                      )}
                    </div>
                  </>
                )}
                
                {profile.role === 'employer' && (
                  <div className="info-item full-width">
                    <label>Название компании</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={profile.company_name}
                        onChange={(e) => setProfile({...profile, company_name: e.target.value})}
                      />
                    ) : (
                      <p>{profile.company_name}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div title={profile.role === 'worker' ? "Навыки" : "Документы"}>
              {profile.role === 'worker' ? (
                <SkillsList 
                  skills={profile.skills} 
                  isEditing={isEditing}
                  onSkillsChange={(newSkills) => setProfile({...profile, skills: newSkills})}
                />
              ) : (
                <DocumentsList 
                  documents={profile.documents} 
                  isEditing={isEditing}
                  onDocumentsChange={(newDocs) => setProfile({...profile, documents: newDocs})}
                />
              )}
            </div>
            
            <div title="Рейтинг и отзывы">
              <div className="rating-container">
                <div className="rating-value">{profile.rating}</div>
                <div className="stars">
                  {'★'.repeat(Math.floor(profile.rating))}
                  {'☆'.repeat(5 - Math.floor(profile.rating))}
                </div>
                <div className="reviews-count">{profile.reviews_count} отзывов</div>
              </div>
              <button 
                className="view-reviews-btn"
                onClick={() => navigate(`/profile/${id}/reviews`)}
              >
                Посмотреть все отзывы
              </button>
            </div>
          </>
        )}
        
        {activeTab === 'availability' && profile.role === 'worker' && (
          <div title="Мой график доступности">
            <AvailabilityCalendar
              availability={profile.availability}
              isEditing={isEditing}
              onAvailabilityChange={(newAvailability) => setProfile({...profile, availability: newAvailability})}
            />
          </div>
        )}
        
        {activeTab === 'vacancies' && (
          <div title={profile.role === 'worker' ? "Активные вакансии" : "Мои вакансии"}>
            {profile.active_vacancies.length > 0 ? (
              <div className="vacancies-list">
                {profile.active_vacancies.map(vacancy => (
                  <VacancyCards
                    key={vacancy.id}
                    vacancy={vacancy}
                    role={profile.role}
                    onAction={() => console.log("Действие с вакансией", vacancy.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="no-vacancies">
                <p>{profile.role === 'worker' 
                  ? "У вас пока нет активных вакансий" 
                  : "Вы еще не создали ни одной вакансии"}</p>
                <button 
                  className="create-vacancy-btn"
                  onClick={() => navigate(profile.role === 'worker' ? '/feed' : '/create-vacancy')}
                >
                  {profile.role === 'worker' ? "Найти вакансии" : "Создать вакансию"}
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