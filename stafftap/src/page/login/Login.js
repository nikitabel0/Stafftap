import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate} from "react-router-dom";
import GradientButton from "../../components/GradientButton/GradientButton";
import API_BASE_URL from "../../apiConfig";
import styles from "./Login.module.css";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const isTelegramApp = window.Telegram?.WebApp;
    const [telegramAuthCompleted, setTelegramAuthCompleted] = useState(false);
  useEffect(() => {
    if (isTelegramApp && !telegramAuthCompleted) {
      // Показываем статус авторизации в Telegram
      const timer = setTimeout(() => {
        setTelegramAuthCompleted(true);
        setError("Не удалось автоматически авторизоваться");
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isTelegramApp, telegramAuthCompleted]);

  if (isTelegramApp && !telegramAuthCompleted) {
    return (
      <div className={styles.telegramMessage}>
        <h2>Добро пожаловать!</h2>
        <div className={styles.loader}></div>
      </div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      const token = response.data.access_token;
      localStorage.setItem("token", token);
      onLogin(token);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(`❌ ${err.response.data.detail}`);
      } else {
        setError("❌ Неверный логин или пароль");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.logoContainer}>
        <img src="/smallLogo.svg" alt="Логотип" className={styles.logo} />
      </div>

      <h1 className={styles.heading}>Давайте войдём в систему!</h1>
      <p className={styles.subheading}>Заполните поля ниже</p>

      <form onSubmit={handleLogin} className={styles.form}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={styles.input}
        />
        <input
          type="password"
          name="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={styles.input}
        />

        <GradientButton type="submit" disabled={isLoading}>
          {isLoading ? "Вход..." : "Войти"}
        </GradientButton>
      </form>

      <div className={styles.authPrompt}>
        <span className={styles.authText}>Еще нет аккаунта?</span>
        <span className={styles.authLink} onClick={() => navigate("/register")}>
          Зарегистрироваться
        </span>
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

export default Login;
