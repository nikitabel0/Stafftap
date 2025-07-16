import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiBell,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiMessageSquare,
  FiFileText,
  FiAlertCircle,
  FiUserPlus,
  FiBriefcase,
  FiUserX
} from "react-icons/fi";
import API_BASE_URL from "../../apiConfig";
import "./NotificationsPage.css";

const NotificationsPage = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error("Ошибка при загрузке уведомлений:", error);
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleWorkerRejectBooking = async (bookingId, notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/bookings/${bookingId}/worker-reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedNotifications = notifications.filter((n) => n.id !== notificationId);
      setNotifications(updatedNotifications);
    } catch (error) {
      console.error("Ошибка при отказе от бронирования:", error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/notifications/${id}/read`,
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
        `${API_BASE_URL}/api/bookings/${bookingId}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(notifications.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Ошибка при подтверждении бронирования:", error);
    }
  };

  const handleRejectBooking = async (bookingId, notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/bookings/${bookingId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(notifications.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Ошибка при отклонении бронирования:", error);
    }
  };

  const handleNavigateToChat = async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/api/chats/start/${bookingId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/chats/${response.data.id}`);
    } catch (error) {
      console.error("Ошибка при создании чата:", error);
    }
  };

  const handleViewJob = (jobId) => {
    navigate(`/vacancy/${jobId}`);
  };

  const formatDateTime = (dateString) => {
    const options = {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    };
    
    const date = new Date(dateString);
    const now = new Date();
    
    // Если уведомление сегодня
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    
    // Если вчера
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return "Вчера в " + date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    
    return date.toLocaleDateString("ru-RU", options);
  };

  // Функция для получения иконки по типу уведомления
  const getNotificationIcon = (type) => {
    switch (type) {
      case "job_moderation":
        return <FiFileText className="notification-icon job-moderation" />;
      case "booking_request":
        return <FiUserPlus className="notification-icon booking-request" />;
      case "booking_confirmed":
        return <FiCheckCircle className="notification-icon booking-confirmed" />;
      case "employer_booking":
        return <FiBriefcase className="notification-icon employer-booking" />;
      case "job_canceled":
        return <FiAlertCircle className="notification-icon job-canceled" />;
      case "worker_removed":
        return <FiUserX className="notification-icon worker-removed" />;
      default:
        return <FiBell className="notification-icon" />;
    }
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
                {getNotificationIcon(notification.type)}
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

                {notification.type === "employer_booking" && (
                  <div className="notification-actions">
                    <button
                      className="reject-button"
                      onClick={() =>
                        handleWorkerRejectBooking(
                          notification.related_id,
                          notification.id
                        )
                      }
                    >
                      <FiXCircle /> Отказаться
                    </button>
                    <button
                      className="chat-button"
                      onClick={() =>
                        handleNavigateToChat(notification.related_id)
                      }
                    >
                      <FiMessageSquare /> Перейти в чат
                    </button>
                    <button
                      className="view-job-button"
                      onClick={() => handleViewJob(notification.job_id)}
                    >
                      <FiBriefcase /> Посмотреть вакансию
                    </button>
                  </div>
                )}

                {(notification.type === "job_moderation" ||
                  notification.type === "job_canceled") && (
                  <div className="notification-actions">
                    <button
                      className="view-job-button"
                      onClick={() => handleViewJob(notification.related_id)}
                    >
                      Посмотреть вакансию
                    </button>
                  </div>
                )}

                {/* Новый тип уведомления: Удаление работника */}
                {notification.type === "worker_removed" && (
                  <div className="notification-actions">
                    <button
                      className="view-job-button"
                      onClick={() => handleViewJob(notification.job_id)}
                    >
                      <FiBriefcase /> Посмотреть вакансию
                    </button>
                    <button
                      className="chat-button"
                      onClick={() => handleNavigateToChat(notification.related_id)}
                    >
                      <FiMessageSquare /> Написать работодателю
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