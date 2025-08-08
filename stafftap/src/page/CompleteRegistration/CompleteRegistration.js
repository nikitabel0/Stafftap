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
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [mergeMode, setMergeMode] = useState(false);
  const navigate = useNavigate();

  const validatePassword = () => {
    if (password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!role || !birthDate || !email) {
      setError("Пожалуйста, заполните обязательные поля");
      return;
    }

    if (role === "employer" && !companyName) {
      setError("Пожалуйста, введите название компании");
      return;
    }

    if (!validatePassword()) {
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
          password,
          ...(role === "employer" && { company_name: companyName })
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Ждем завершения обновления данных перед навигацией
      await onComplete();
      navigate("/profile");
    } catch (error) {
      const errorData = error.response?.data?.detail;
      
      if (errorData?.code === "email_exists_with_password") {
        setMergeMode(true);
        setError("");
      } else {
        setError(errorData?.message || "Ошибка при завершении регистрации");
      }
    }
  };

  const handleMerge = async () => {
    if (!password) {
      setError("Введите пароль");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/auth/merge-account`,
        { email, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Ждем завершения обновления данных перед навигацией
      await onComplete();
      navigate("/profile");
    } catch (error) {
      setError("Ошибка при переносе данных: " + 
        (error.response?.data?.detail || error.message));
    }
  };

  const cancelMerge = () => {
    setMergeMode(false);
    setPassword("");
    setError("");
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.roleSelectionContainer}>
        <h1 className={styles.roleHeading}>Выберите вашу роль:</h1>
        
        {mergeMode ? (
          <div className={styles.mergeContainer}>
            <p className={styles.mergeMessage}>
              Этот email уже зарегистрирован. Введите пароль для переноса данных
            </p>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="Введите пароль"
              />
            </div>
            
            <div className={styles.buttonContainer}>
              <button 
                className={styles.cancelButton}
                onClick={cancelMerge}
              >
                Отмена
              </button>
              <GradientButton onClick={handleMerge}>
                Перенести данные
              </GradientButton>
            </div>
          </div>
        ) : (
          <>
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

                <div className={styles.formGroup}>
                  <label className={styles.label}>Пароль</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Не менее 8 символов"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Подтвердите пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Повторите пароль"
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
                disabled={
                  !role || 
                  !birthDate || 
                  !email || 
                  !password || 
                  !confirmPassword ||
                  (role === "employer" && !companyName)
                }
              >
                Завершить регистрацию
              </GradientButton>
            </div>
          </>
        )}
        
        {error && <p className={styles.error}>{error}</p>}
      </div>
      
      {/* Добавленный блок с реквизитами */}
      <div className={styles.footerInfo}>
        <p>Расчётный счёт: 40802810020000714563</p>
        <p>Название банка: ООО "Банк Точка"</p>
        <p>БИК: 044525104</p>
        <p>Корреспондентский счёт: 30101810745374525104</p>
        <p>Наименование: Индивидуальный предприниматель Филатов Сергей Юрьевич</p>
        <p>ИНН: 711614034305</p>
      </div>
    </div>
  );
};

export default CompleteRegistration;