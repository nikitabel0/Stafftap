import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate
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
import FinanceHistory from "./components/FinanceHistory/FinanceHistory";
import CompleteRegistration from "./page/CompleteRegistration/CompleteRegistration";
import OfferPage from "./page/OfferPage/OfferPage";
import TermsPage from "./page/TermsPage/TermsPage";
import ContactsPage from "./page/ContactsPage/ContactsPage";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTelegramApp, setIsTelegramApp] = useState(false);
  const [tg, setTg] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tgApp = window.Telegram.WebApp;
      setTg(tgApp);
      setIsTelegramApp(true);
      tgApp.ready();
      tgApp.expand();
      
      authenticateWithTelegram(tgApp.initData); 
    } else {
      fetchProfile();
    }
  }, []);

  const authenticateWithTelegram = async (initData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/telegram`, { initData });
      const token = response.data.access_token;
      localStorage.setItem("token", token);
      await fetchProfile();
    } catch (error) {
      console.error("Telegram auth error:", error);
      if (error.response?.status === 404) {
        setUser({ requiresRegistration: true });
      }
      setLoading(false);
    }
  };

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
      
      if (res.data.telegram_id && !res.data.is_registration_complete) {
        setUser({...res.data, requiresRegistration: true});
      } else {
        setUser(res.data);
      }
    } catch (err) {
      console.error("Ошибка загрузки профиля:", err);
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    if (isTelegramApp && tg) {
      tg.close();
    }
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

      await axios.put(
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

  const handleRegistrationComplete = async () => {
    // Обновляем данные пользователя после завершения регистрации
    await fetchProfile();
  };

  const appStyle = {
    minHeight: "100vh",
    background: '#f7efed url("/back.svg") no-repeat right bottom fixed',
    backgroundSize: "400px",
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div style={appStyle} className={isTelegramApp ? "telegram-app" : "web-app"}>
      {!isTelegramApp && <Header user={user} onLogout={handleLogout} />}
      
      <Routes>
        {/* Редирект для незавершенной регистрации */}
        {user?.requiresRegistration && (
          <Route path="*" element={
            <CompleteRegistration 
              user={user} 
              onComplete={handleRegistrationComplete} 
            />
          } />
        )}

        <Route path="/chats" element={<ChatsPage user={user} />} />
        <Route path="/chats/:chatId" element={<ChatPage user={user} />} />
        <Route path="/job/:jobId" element={<JobDetailPage user={user} />} />

         <Route path="/contacts" element={<ContactsPage/>} />
      <Route path="/offer" element={<OfferPage />} />
      <Route path="/terms" element={<TermsPage />} />
        <Route
          path="/chats/by-booking/:bookingId"
          element={<ChatPage user={user} />}
        />
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
              <FinanceHistory user={user} />
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
          path="/complete-registration"
          element={
            <CompleteRegistration 
              user={user} 
              onComplete={handleRegistrationComplete} 
            />
          }
        />
        <Route
          path="*"
          element={<Navigate to={user ? "/profile" : "/login"} />}
        />
      </Routes>
    </div>
  );
}

function AppWrapper() {
  return (
    <Router>
      <Header />
      <App />
    </Router>
  );
}

export default AppWrapper;