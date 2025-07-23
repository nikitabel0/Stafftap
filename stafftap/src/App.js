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
import VacancyDetailPage from "./page/VacancyDetailPage/VacancyDetailPage";
import ChatsPage from "./page/ChatsPage/ChatsPage";
import ChatPage from "./page/ChatPage/ChatPage";
import FavoritesPage from "./page/FavoritesPage/FavoritesPage";
import NotificationsPage from "./page/NotificationsPage/NotificationsPage";
import API_BASE_URL from "./apiConfig";
import JobDetailPage from "./page/JobDetailPage/JobDetailPage";
import BalancePage from "./BalancePage";
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
      const res = await axios.get(`${API_BASE_URL}/me`, {
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

      
      const response = await axios.put(
        `${API_BASE_URL}/api/users/${user.id}`,
        dataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      
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
          <Route path="/chats" element={<ChatsPage user={user} />} />
          <Route path="/chats/:chatId" element={<ChatPage user={user} />} />
          <Route path="/job/:jobId" element={<JobDetailPage user={user} />} />
          <Route
            path="/chats/by-booking/:bookingId"
            element={<ChatPage user={user} />}
          />
          {/* <Route path="/bookings" element={<BookingsPage user={user} />} /> */}
          <Route
            path="/vacancy/:id"
            element={<VacancyDetailPage user={user} />}
          />
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
            path="/notifications"
            element={<NotificationsPage user={user} />}
          />

          <Route 
            path="/balance" 
            element={
              user ? (
                <BalancePage user={user} />
              ) : (
                <Navigate to="/login" />
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
          <Route path="/favorites" element={<FavoritesPage user={user} />} />
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
