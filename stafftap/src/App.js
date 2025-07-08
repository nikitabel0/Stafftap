import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./page/login/Login";
import Register from "./page/registr/Register";
import Profile from "./page/profile/Profile";
import Header from "./components/Header/Header";
import FeedPage from "./page/feed/FeedPage";
import CreateVacancyPage from "./page/CreateVacancyPage/CreateVacancyPage";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get("http://localhost:8000/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUser(res.data);
    } catch (err) {
      console.error("Ошибка загрузки профиля:", err);
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const handleSaveProfile = async (updatedData) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !user) {
        throw new Error("Токен отсутствует или пользователь не определен");
      }

      // Подготовка данных для отправки
      const dataToSend = {
        first_name: updatedData.first_name,
        last_name: updatedData.last_name,
        phone: updatedData.phone,
        email: updatedData.email,
        birth_date: updatedData.birth_date,
        company_name: updatedData.company_name,
        experience_months: updatedData.experience_months,
        rate_per_shift: updatedData.rate_per_shift,
      };

      // Отправка запроса на сервер
      const response = await axios.put(
        `http://localhost:8000/api/users/${user.id}`,
        dataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Обновляем данные пользователя
      await fetchProfile();
      return true;
    } catch (error) {
      console.error("Ошибка сохранения профиля:", error);
      throw error;
    }
  };

  const appStyle = {
    minHeight: "100vh",
    background: '#f7efed url("/back.svg") no-repeat right bottom fixed',
    backgroundSize: "400px",
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#f7efed",
        }}
      >
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div style={appStyle}>
      <Router>
        <Header user={user} onLogout={handleLogout} />
        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/profile" />
              ) : (
                <Login onLogin={fetchProfile} />
              )
            }
          />
          <Route
            path="/register"
            element={
              user ? (
                <Navigate to="/profile" />
              ) : (
                <Register onRegister={fetchProfile} />
              )
            }
          />
          <Route
            path="/profile/:id?"
            element={
              user ? (
                <Profile
                  user={user}
                  onLogout={handleLogout}
                  onSave={handleSaveProfile}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route path="/create-vacancy" element={<CreateVacancyPage />} />
         <Route
  path="/feed"
  element={user ? <FeedPage user={user} /> : <Navigate to="/login" />}
/>
          <Route
            path="*"
            element={<Navigate to={user ? "/profile" : "/login"} />}
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
