import React, { useState } from "react";
import axios from "axios";

function Login({ onLogin }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async () => {
        try {
            const response = await axios.post("http://localhost:8000/auth/login", {
                email,
                password,
            });

            console.log("Login response:", response.data); // 👈 ВАЖНО!

            const token = response.data.access_token;
            localStorage.setItem("token", token);
            onLogin(token);
        } catch (err) {
            setError("❌ Неверный логин или пароль");
        }
    };


    return (
        <div style={{ maxWidth: 400, margin: "auto", paddingTop: 50 }}>
            <h2>Вход</h2>
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: 8, marginBottom: 10 }}
            />
            <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: 8, marginBottom: 10 }}
            />
            <button onClick={handleLogin} style={{ width: "100%", padding: 10 }}>
                Войти
            </button>
            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    );
}

export default Login;
