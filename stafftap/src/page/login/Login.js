import React, { useState } from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";
import GradientButton from "../../components/GradientButton/GradientButton";

function Login({ onLogin }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        
        try {
            const response = await api.post("/auth/login", {
                email,
                password,
            });

            const token = response.data.access_token;
            localStorage.setItem("token", token);
            onLogin(token);
        } catch (err) {
            setError("❌ Неверный логин или пароль");
        } finally {
            setIsLoading(false);
        }
    };

    // Стили (аналогичные регистрации)
    const pageContainerStyle = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "20px",
        fontFamily: "'Roboto', sans-serif",
    };

    const logoContainerStyle = {
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: "20px",
        width: "100%",
        maxWidth: "500px",
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
        width: "100%",
        maxWidth: "500px",
    };

    const subheadingStyle = {
        textAlign: "left",
        marginBottom: "30px",
        color: "#ACACAD",
        fontSize: "16px",
        fontWeight: "400",
        width: "100%",
        maxWidth: "500px",
    };

    const formStyle = {
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        width: "100%",
        maxWidth: "500px",
    };

    const inputStyle = {
        width: "100%",
        height: "56px",
        borderRadius: "12px",
        backgroundColor: "#F7F7FD",
        padding: "16px 20px",
        boxSizing: "border-box",
        fontSize: "16px",
        outline: "none",
        border: "3px solid #A5A29D80",
        color: "#A5A29D80",
        transition: "all 0.3s",
        
        "&:focus": {
            borderColor: "#2C8161",
            color: "#2C8161",
        }
    };

    const authPromptStyle = {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "5px",
        marginTop: "20px",
        width: "100%",
        maxWidth: "500px",
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

    const errorStyle = {
        color: "#EF4444",
        textAlign: "center",
        marginTop: "10px",
        fontSize: "14px",
    };

    return (
        <div style={pageContainerStyle}>
            {/* Логотип */}
            <div style={logoContainerStyle}>
                <img src="./smallLogo.svg" alt="Логотип" style={logoStyle} />
            </div>

            {/* Заголовок "Давайте войдём в систему!" */}
            <h1 style={headingStyle}>Давайте войдём в систему!</h1>

            {/* Подзаголовок "Заполните поля ниже" */}
            <p style={subheadingStyle}>Заполните поля ниже</p>

            <form onSubmit={handleLogin} style={formStyle}>
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={inputStyle}
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={inputStyle}
                />

                <GradientButton type="submit" disabled={isLoading}>
                    {isLoading ? "Вход..." : "Войти"}
                </GradientButton>
            </form>

            {/* Блок с текстом и ссылкой на регистрацию */}
            <div style={authPromptStyle}>
                <span style={authTextStyle}>Еще нет аккаунта?</span>
                <span 
                    style={authLinkStyle}
                    onClick={() => navigate("/register")}
                >
                    Зарегистрироваться
                </span>
            </div>

            {error && <p style={errorStyle}>{error}</p>}
        </div>
    );
}

export default Login;