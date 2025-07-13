import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import GradientButton from "../../components/GradientButton/GradientButton";
import API_BASE_URL from '../../apiConfig';
// Компонент для шага выбора роли
const RoleSelectionStep = ({ onNext, selectedRole, setSelectedRole }) => {
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  return (
    <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{
        textAlign: "center",
        color: "#373737",
        fontSize: "clamp(1.5rem, 4vw, 2rem)",
        fontWeight: 700,
        marginBottom: "2rem"
      }}>
        Выберите вашу роль:
      </h1>
      
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "20px",
        width: "100%"
      }}>
        <div 
          onClick={() => handleRoleSelect("worker")}
          style={{
            background: selectedRole === "worker" 
              ? "linear-gradient(#f7efed, #f7efed) padding-box, linear-gradient(to right, #2C8161, #56BD66) border-box" 
              : "#f7efed",
            border: "3px solid transparent",
            borderRadius: "16px",
            transition: "all 0.2s ease",
            cursor: "pointer",
            padding: "15px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "300px",
          }}
        >
          <img 
            src="/barista.svg" 
            alt="Работник"
            style={{
              width: "100%",
              maxWidth: "250px",
              height: "auto",
              aspectRatio: "1/1",
              objectFit: "contain"
            }} 
          />
          <span style={{
            marginTop: "1rem",
            fontSize: "clamp(1rem, 3vw, 1.2rem)",
            fontWeight: 600,
            textAlign: "center",
            color: selectedRole === "worker" ? "#2C8161" : "#373737"
          }}>
            Я хочу найти работу!
          </span>
        </div>
        
        <div 
          onClick={() => handleRoleSelect("employer")}
          style={{
            background: selectedRole === "employer" 
              ? "linear-gradient(#f7efed, #f7efed) padding-box, linear-gradient(to right, #2C8161, #56BD66) border-box" 
              : "#f7efed",
            border: "3px solid transparent",
            borderRadius: "16px",
            transition: "all 0.2s ease",
            cursor: "pointer",
            padding: "15px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "300px",
          }}
        >
          <img 
            src="/raboradatel.svg"
            alt="Работодатель"
            style={{
              width: "100%",
              maxWidth: "250px",
              height: "auto",
              aspectRatio: "1/1",
              objectFit: "contain"
            }} 
          />
          <span style={{
            marginTop: "1rem",
            fontSize: "clamp(1rem, 3vw, 1.2rem)",
            fontWeight: 600,
            textAlign: "center",
            color: selectedRole === "employer" ? "#2C8161" : "#373737"
          }}>
            Я хочу найти сотрудника!
          </span>
        </div>
      </div>
      
      <div style={{
        display: "flex",
        justifyContent: "center",
        marginTop: "2.5rem"
      }}>
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

  const getInputStyle = (name) => {
    const isValid = validateField(name, formData[name]);
    const isTouched = touched[name];
    const showValid = isTouched && isValid && formData[name] !== "";

    return {
      ...inputStyle,
      border: showValid ? "3px solid #2C8161" : "3px solid #A5A29D80",
      color: showValid ? "#2C8161" : "#A5A29D80",
    };
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
    <div>
      {/* Логотип */}
      <div style={logoContainerStyle}>
        <img src="/smallLogo.svg" alt="Логотип" style={logoStyle} />
      </div>

      {/* Заголовок "Давайте зарегистрируемся!" */}
      <h1 style={headingStyle}>Давайте зарегистрируемся!</h1>

      {/* Подзаголовок "Заполните поля ниже" */}
      <p style={subheadingStyle}>Заполните поля ниже</p>

      <form onSubmit={handleSubmit} style={formStyle}>
        <input
          name="first_name"
          placeholder="Имя"
          value={formData.first_name}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          style={getInputStyle("first_name")}
        />
        <input
          name="last_name"
          placeholder="Фамилия"
          value={formData.last_name}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          style={getInputStyle("last_name")}
        />
        <input
          name="phone"
          placeholder="Телефон"
          value={formData.phone}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          style={getInputStyle("phone")}
        />
        <input
          type="date"
          name="birth_date"
          value={formData.birth_date}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          style={getInputStyle("birth_date")}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          style={getInputStyle("email")}
        />
        <input
          type="password"
          name="password"
          placeholder="Пароль"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          style={getInputStyle("password")}
        />

        {selectedRole === "worker" && (
          <input
            name="profession"
            placeholder="Профессия"
            value={formData.profession}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            style={getInputStyle("profession")}
          />
        )}

        <GradientButton type="submit" disabled={!formIsValid}>
          Зарегистрироваться
        </GradientButton>
      </form>
   <div style={authPromptStyle}>
        <span style={authTextStyle}>У вас уже есть учетная запись?</span>
        <span 
          style={authLinkStyle}
          onClick={() => navigate("/login")}
        >
          Авторизоваться
        </span>
      </div>

      {error && <p style={errorStyle}>{error}</p>}
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
    <div style={pageContainerStyle}>
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
const stepContainerStyle = {
  width: "90%",
  maxWidth: "500px",
  backgroundColor: "white",
  borderRadius: "20px",
  padding: "20px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
  margin: "0 auto",
};




const authPromptStyle = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "5px",
  marginTop: "20px",
};

const authTextStyle = {
  color: "#373737",
  fontSize: "16px",
};

const authLinkStyle = {
  color: "#56BD66",
  fontWeight: "600",
  cursor: "pointer",
  transition: "text-decoration 0.3s",
  
  "&:hover": {
    textDecoration: "underline",
  }
};

const roleButtonsContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const roleButtonStyle = {
  width: "100%",
  minHeight: "110px",
  borderRadius: "16px",
  cursor: "pointer",
  padding: "15px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.3s ease",
};

const roleButtonContent = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "10px",
};

const roleIconContainer = {
  width: "250px",
  height: "250px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.3s ease",
};

const roleButtonText = {
  fontSize: "16px",
  fontWeight: "600",
  textAlign: "center",
  transition: "color 0.3s ease",
};

const buttonContainerStyle = {
  display: "flex",
  justifyContent: "center",
  marginTop: "25px",
};

// Адаптивные стили
const roleHeadingStyle = {
  textAlign: "center",
  color: "#373737",
  fontSize: "clamp(22px, 5vw, 28px)", // Адаптивный размер
  fontWeight: "700",
  marginBottom: "25px",
};

// Стили
const pageContainerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",

  padding: "20px",
  fontFamily: "'Roboto', sans-serif",
};

const topLogoContainer = {
  marginBottom: "40px",
};

const topLogoStyle = {
  height: "60px",
};


const logoContainerStyle = {
  display: "flex",
  justifyContent: "flex-start",
  marginBottom: "20px",
};

const logoStyle = {
  height: "60px",
};

const headingStyle = {
  textAlign: "left",
  marginBottom: "5px",
  color: "#373737",
  fontSize: "24px",
  fontWeight: "700",
};

const subheadingStyle = {
  textAlign: "left",
  marginBottom: "30px",
  color: "#ACACAD",
  fontSize: "16px",
  fontWeight: "400",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const inputStyle = {
  width: "100%",
  height: "56px",
  borderRadius: "12px",
  backgroundColor: "#F7F7FD",
  padding: "16px 20px 16px 10px",
  boxSizing: "border-box",
  fontSize: "16px",
  outline: "none",
  transition: "border 0.3s, color 0.3s",
};

const errorStyle = {
  color: "#EF4444",
  textAlign: "center",
  marginTop: "10px",
  fontSize: "14px",
};

const roleTextButtonStyle = {
  background: "none",
  border: "none",
  padding: "0",
  color: "#373737",
  fontSize: "18px",
  fontWeight: "600",
  cursor: "pointer",
};
export default Register;
