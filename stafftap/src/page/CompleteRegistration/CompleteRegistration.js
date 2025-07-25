import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import GradientButton from "../../components/GradientButton/GradientButton";
import API_BASE_URL from "../../apiConfig";
import styles from './CompleteRegistration.module.css';

const CompleteRegistration = ({ user, onComplete }) => {
  const [role, setRole] = useState(null);
  const [birthDate, setBirthDate] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState(user.email || "");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!role || !birthDate || !email) {
      setError("Пожалуйста, заполните обязательные поля");
      return;
    }

    if (role === "employer" && !companyName) {
      setError("Пожалуйста, введите название компании");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/me/complete-registration`,
        { 
          role, 
          birth_date: birthDate,
          email,
          ...(role === "employer" && { company_name: companyName })
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      onComplete();
      navigate("/profile");
    } catch (error) {
      setError("Ошибка при завершении регистрации: " + 
        (error.response?.data?.detail || error.message));
    }
  };

  return (
      <div className={styles.pageContainer}>
      <div className={styles.roleSelectionContainer}>
        {/* Заголовок изменен на идентичный регистрации */}
        <h1 className={styles.roleHeading}>Выберите вашу роль:</h1>
        
        <div className={styles.roleCards}>
          <div 
            className={`${styles.roleCard} ${role === "worker" ? styles.selectedCard : ''}`}
            onClick={() => setRole("worker")}
          >
            <img 
              src="/barista.svg" 
              alt="Работник"
              className={styles.roleImage}
            />
            <span className={styles.roleText}>
              Я хочу найти работу!
            </span>
          </div>
          
          <div 
            className={`${styles.roleCard} ${role === "employer" ? styles.selectedCard : ''}`}
            onClick={() => setRole("employer")}
          >
            <img 
              src="/raboradatel.svg"
              alt="Работодатель"
              className={styles.roleImage}
            />
            <span className={styles.roleText}>
              Я хочу найти сотрудника!
            </span>
          </div>
        </div>
        
        {/* Форма появляется только после выбора роли */}
        {role && (
          <div className={styles.registrationContainer}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Дата рождения</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={styles.input}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="example@mail.com"
              />
            </div>
            
            {role === "employer" && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Название компании</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={styles.input}
                  placeholder="Введите официальное название"
                />
              </div>
            )}
          </div>
        )}
        
        <div className={styles.buttonContainer}>
          <GradientButton 
            onClick={handleSubmit} 
            disabled={!role || !birthDate || !email || (role === "employer" && !companyName)}
          >
            Завершить регистрацию
          </GradientButton>
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
};

export default CompleteRegistration;