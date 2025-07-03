import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Register({ onRegister }) {
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        phone: "",
        birth_date: "",
        email: "",
        password: "",
        role: "employer",
        profession: "",
    });
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (formData.role === "employer") {
                delete payload.profession;
            }
            await axios.post("http://localhost:8000/auth/register", payload);
            // После регистрации - логинимся:
            const loginRes = await axios.post("http://localhost:8000/auth/login", {
                email: formData.email,
                password: formData.password,
            });
            localStorage.setItem("token", loginRes.data.access_token);
            await onRegister(); // обновляем профиль в App
            navigate("/profile");
        } catch (e) {
            setError("Ошибка регистрации: " + (e.response?.data?.detail || e.message));
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: "auto", paddingTop: 50 }}>
            <h2>Регистрация</h2>
            <form onSubmit={handleSubmit}>
                <input
                    name="first_name"
                    placeholder="Имя"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                />
                <input
                    name="last_name"
                    placeholder="Фамилия"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                />
                <input
                    name="phone"
                    placeholder="Телефон"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                />
                <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    required
                />
                <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Пароль"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />
                <select name="role" value={formData.role} onChange={handleChange}>
                    <option value="employer">Работодатель</option>
                    <option value="worker">Работник</option>
                </select>
                {formData.role === "worker" && (
                    <input
                        name="profession"
                        placeholder="Профессия"
                        value={formData.profession}
                        onChange={handleChange}
                        required
                    />
                )}
                <button type="submit" style={{ marginTop: 10 }}>
                    Зарегистрироваться
                </button>
            </form>
            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    );
}

export default Register;
