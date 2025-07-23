import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import GradientButton from "../../components/GradientButton/GradientButton";
import API_BASE_URL from '../../apiConfig';
import styles from './Register.module.css'; // Импорт модульных стилей

// Компонент для шага выбора роли
const RoleSelectionStep = ({ onNext, selectedRole, setSelectedRole }) => {
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  return (
    <div className={styles.roleSelectionContainer}>
      <h1 className={styles.roleHeading}>Выберите вашу роль:</h1>
      
      <div className={styles.roleCards}>
        <div 
          onClick={() => handleRoleSelect("worker")}
          className={`${styles.roleCard} ${selectedRole === "worker" ? styles.selectedCard : ''}`}
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
          onClick={() => handleRoleSelect("employer")}
          className={`${styles.roleCard} ${selectedRole === "employer" ? styles.selectedCard : ''}`}
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
      
      <div className={styles.buttonContainer}>
        <GradientButton 
          onClick={onNext}
          disabled={!selectedRole}
        >
          Продолжить
        </GradientButton>
      </div>
    </div>
  );
};

const RegistrationStep = ({ selectedRole, onRegister }) => {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    birth_date: "",
    email: "",
    password: "",
    profession: "",
  });

  const [formIsValid, setFormIsValid] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({
    first_name: false,
    last_name: false,
    phone: false,
    birth_date: false,
    email: false,
    password: false,
    profession: false,
  });

  const navigate = useNavigate();

  // Проверка валидности всей формы
  React.useEffect(() => {
    const allFieldsValid = Object.entries(formData).every(([name, value]) => {
      if (name === "profession" && selectedRole !== "worker") return true;
      return validateField(name, value);
    });
    setFormIsValid(allFieldsValid);
  }, [formData, selectedRole]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (!touched[name]) {
      setTouched((prev) => ({ ...prev, [name]: true }));
    }
  };

  const validateField = (name, value) => {
    switch (name) {
      case "first_name":
      case "last_name":
        return value.trim().length >= 2;
      case "phone":
        return value.replace(/\D/g, "").length === 11;
      case "birth_date":
        const birthDate = new Date(value);
        const today = new Date();
        return birthDate < today;
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case "password":
        return value.length >= 6;
      case "profession":
        return selectedRole === "worker" ? value.trim().length >= 2 : true;
      default:
        return true;
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const getInputClassName = (name) => {
    const isValid = validateField(name, formData[name]);
    const isTouched = touched[name];
    const showValid = isTouched && isValid && formData[name] !== "";

    return showValid ? styles.inputValid : '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newTouched = {};
    Object.keys(touched).forEach((field) => {
      newTouched[field] = true;
    });
    setTouched(newTouched);

    if (!formIsValid) {
      setError("Пожалуйста, заполните все поля корректно");
      return;
    }

    try {
      const payload = {
        ...formData,
        role: selectedRole,
      };

      if (selectedRole === "employer") {
        delete payload.profession;
      }

      await axios.post(`${API_BASE_URL}/auth/register`, payload);
      const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: formData.email,
        password: formData.password,
      });

      localStorage.setItem("token", loginRes.data.access_token);
      await onRegister();
      navigate("/profile");
    } catch (e) {
      setError(
        "Ошибка регистрации: " + (e.response?.data?.detail || e.message)
      );
    }
  };

  return (
    <div className={styles.registrationContainer}>
      {/* Логотип */}
      <div className={styles.logoContainer}>
        <img src="/smallLogo.svg" alt="Логотип" className={styles.logo} />
      </div>

      {/* Заголовок "Давайте зарегистрируемся!" */}
      <h1 className={styles.heading}>Давайте зарегистрируемся!</h1>

      {/* Подзаголовок "Заполните поля ниже" */}
      <p className={styles.subheading}>Заполните поля ниже</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          name="first_name"
          placeholder="Имя"
          value={formData.first_name}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          className={`${styles.input} ${getInputClassName("first_name")}`}
        />
        <input
          name="last_name"
          placeholder="Фамилия"
          value={formData.last_name}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          className={`${styles.input} ${getInputClassName("last_name")}`}
        />
        <input
          name="phone"
          placeholder="Телефон"
          value={formData.phone}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          className={`${styles.input} ${getInputClassName("phone")}`}
        />
        <input
          type="date"
          name="birth_date"
          value={formData.birth_date}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          className={`${styles.input} ${getInputClassName("birth_date")}`}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          className={`${styles.input} ${getInputClassName("email")}`}
        />
        <input
          type="password"
          name="password"
          placeholder="Пароль"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          className={`${styles.input} ${getInputClassName("password")}`}
        />

        {selectedRole === "worker" && (
          <input
            name="profession"
            placeholder="Профессия"
            value={formData.profession}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            className={`${styles.input} ${getInputClassName("profession")}`}
          />
        )}

        <GradientButton type="submit" disabled={!formIsValid}>
          Зарегистрироваться
        </GradientButton>
      </form>
      
      <div className={styles.authPrompt}>
        <span className={styles.authText}>У вас уже есть учетная запись?</span>
        <span 
          className={styles.authLink}
          onClick={() => navigate("/login")}
        >
          Авторизоваться
        </span>
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

function Register({ onRegister }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();

  const handleNextStep = () => {
    if (selectedRole) {
      setCurrentStep(2);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {currentStep === 1 && (
        <RoleSelectionStep
          onNext={handleNextStep}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
        />
      )}

      {currentStep === 2 && (
        <RegistrationStep selectedRole={selectedRole} onRegister={onRegister} />
      )}
    </div>
  );
}

export default Register;