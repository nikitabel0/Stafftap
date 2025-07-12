import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiBell,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiMessageSquare,
} from "react-icons/fi";
import API_BASE_URL from '../../apiConfig';

const NotificationsPage = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          ` ${API_BASE_URL}/api/notifications`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotifications(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error("Ошибка при загрузке уведомлений:", error);
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        ` ${API_BASE_URL}/api/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("Ошибка при обновлении уведомления:", error);
    }
  };

  const handleConfirmBooking = async (bookingId, notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        ` ${API_BASE_URL}/api/bookings/${bookingId}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Удаляем уведомление из списка
      setNotifications(notifications.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Ошибка при подтверждении бронирования:", error);
      alert("Не удалось подтвердить бронирование. Попробуйте позже.");
    }
  };

  const handleRejectBooking = async (bookingId, notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        ` ${API_BASE_URL}/api/bookings/${bookingId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(notifications.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Ошибка при отклонении бронирования:", error);
      alert("Не удалось отклонить бронирование. Попробуйте позже.");
    }
  };

  const handleNavigateToChat = async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      // Используем POST запрос для создания/получения чата
      const response = await axios.post(
        ` ${API_BASE_URL}/api/chats/start/${bookingId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Переходим в чат
      navigate(`/chats/${response.data.id}`);
    } catch (error) {
      console.error("Ошибка при создании чата:", error);
      alert("Не удалось перейти в чат. Попробуйте позже.");
    }
  };

  const formatDateTime = (dateString) => {
    const options = {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("ru-RU", options);
  };

  if (isLoading) {
    return (
      <div className="notifications-loading">
        <div className="loader"></div>
        <p>Загрузка уведомлений...</p>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>
          <FiBell className="header-icon" /> Уведомления
        </h1>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-notifications">
          <p>У вас пока нет уведомлений</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-card ${
                notification.is_read ? "read" : "unread"
              }`}
            >
              <div className="notification-header">
                <h3>{notification.title}</h3>
                <span className="notification-time">
                  <FiClock /> {formatDateTime(notification.created_at)}
                </span>
              </div>

              <div className="notification-body">
                <p>{notification.message}</p>

                {notification.type === "booking_request" && (
                  <div className="notification-actions">
                    <button
                      className="confirm-button"
                      onClick={() =>
                        handleConfirmBooking(
                          notification.related_id,
                          notification.id
                        )
                      }
                    >
                      <FiCheckCircle /> Подтвердить
                    </button>
                    <button
                      className="reject-button"
                      onClick={() =>
                        handleRejectBooking(
                          notification.related_id,
                          notification.id
                        )
                      }
                    >
                      <FiXCircle /> Отклонить
                    </button>
                  </div>
                )}

                {notification.type === "booking_confirmed" && (
                  <div className="notification-actions">
                    <button
                      className="chat-button"
                      onClick={() =>
                        handleNavigateToChat(notification.related_id)
                      }
                    >
                      <FiMessageSquare /> Перейти в чат
                    </button>
                  </div>
                )}
              </div>

              {!notification.is_read && (
                <button
                  className="mark-read-button"
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  Пометить как прочитанное
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
