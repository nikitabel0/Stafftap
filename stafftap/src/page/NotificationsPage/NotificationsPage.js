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
  FiUserX,
  FiThumbsUp,
  FiAlertTriangle,
  FiCheck,
} from "react-icons/fi";
import API_BASE_URL from "../../apiConfig";
import "./NotificationsPage.css";

const NotificationsPage = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProblemWorkers, setSelectedProblemWorkers] = useState([]);
  const [problemDescription, setProblemDescription] = useState("");
  const [activeFeedbackJob, setActiveFeedbackJob] = useState(null);
  const navigate = useNavigate();
  const [workersForJob, setWorkersForJob] = useState({}); // Для хранения работников по jobId

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

  // Загрузка работников для конкретной смены
  const fetchWorkersForJob = async (jobId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE_URL}/api/jobs/${jobId}/confirmed_workers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWorkersForJob(prev => ({ ...prev, [jobId]: response.data }));
    } catch (error) {
      console.error("Ошибка при загрузке работников:", error);
    }
  };

  const startFeedback = (jobId) => {
    setActiveFeedbackJob(jobId);
    setSelectedProblemWorkers([]);
    setProblemDescription("");
    
    // Загружаем работников, если они еще не загружены
    if (!workersForJob[jobId]) {
      fetchWorkersForJob(jobId);
    }
  };

  const handleWorkerRejectBooking = async (bookingId, notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/bookings/${bookingId}/worker-reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedNotifications = notifications.filter(
        (n) => n.id !== notificationId
      );
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

  // Обработка фидбэка "Всё отлично"
  const handleSubmitPositiveFeedback = async (jobId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/jobs/${jobId}/feedback`,
        { status: "success" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedNotifications = notifications.filter(
        (n) => !(n.type === "job_completed" && n.related_id === jobId)
      );
      setNotifications(updatedNotifications);
      setActiveFeedbackJob(null);
    } catch (error) {
      console.error("Ошибка при отправке фидбэка:", error);
    }
  };

  // Обработка фидбэка "Были проблемы"
  const handleSubmitProblemFeedback = async (jobId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/jobs/${jobId}/feedback`,
        {
          status: "problem",
          problem_workers: selectedProblemWorkers,
          problem_description: problemDescription,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedNotifications = notifications.filter(
        (n) => !(n.type === "job_completed" && n.related_id === jobId)
      );
      setNotifications(updatedNotifications);

      // Перенаправляем на страницу диспутов
      navigate(`/disputes`);
      
      // Сбрасываем состояние
      setActiveFeedbackJob(null);
      setSelectedProblemWorkers([]);
      setProblemDescription("");
    } catch (error) {
      console.error("Ошибка при отправке фидбэка:", error);
    }
  };

  const formatDateTime = (dateString) => {
    const options = {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    const date = new Date(dateString);
    const now = new Date();

    // Если уведомление сегодня
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // Если вчера
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return (
        "Вчера в " +
        date.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
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
        return (
          <FiCheckCircle className="notification-icon booking-confirmed" />
        );
      case "employer_booking":
        return <FiBriefcase className="notification-icon employer-booking" />;
      case "job_canceled":
        return <FiAlertCircle className="notification-icon job-canceled" />;
      case "worker_removed":
        return <FiUserX className="notification-icon worker-removed" />;
      case "job_completed":
        return <FiClock className="notification-icon job-completed" />;
      case "dispute_created":
        return (
          <FiAlertTriangle className="notification-icon dispute-created" />
        );
      case "payment_released":
        return <FiThumbsUp className="notification-icon payment-released" />;
      case "worker_rejected_booking":
        return <FiXCircle className="notification-icon worker-rejected" />;
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
          {notifications.map((notification) => {
            // Если это уведомление о завершении смены и оно активно для фидбэка
            if (
              notification.type === "job_completed" &&
              activeFeedbackJob === notification.related_id
            ) {
              const workers = workersForJob[notification.related_id] || [];
              
              return (
                <div key={notification.id} className="feedback-form">
                  <div className="feedback-header">
                    <h3>Обратная связь по смене</h3>
                    <p>Пожалуйста, оцените работу сотрудников</p>
                  </div>

                  <div className="feedback-options">
                    <div
                      className="feedback-option positive-option"
                      onClick={() =>
                        handleSubmitPositiveFeedback(notification.related_id)
                      }
                    >
                      <div className="option-icon">
                        <FiCheck size={36} />
                      </div>
                      <div className="option-content">
                        <h4>Всё отлично</h4>
                        <p>Разморозить оплату всем сотрудникам</p>
                      </div>
                    </div>

                    <div
                      className="feedback-option problem-option"
                      onClick={() => setActiveFeedbackJob(notification.related_id)}
                    >
                      <div className="option-icon">
                        <FiAlertTriangle size={36} />
                      </div>
                      <div className="option-content">
                        <h4>Были проблемы</h4>
                        <p>Указать проблемных сотрудников</p>
                      </div>
                    </div>
                  </div>

                  {activeFeedbackJob === notification.related_id && (
                    <div className="problem-workers-form">
                      <h4>Укажите проблемных сотрудников</h4>
                      <p>Выберите сотрудников, с которыми возникли проблемы</p>

                      {workers.length === 0 ? (
                        <div className="workers-loading">
                          <div className="loader"></div>
                          <p>Загрузка списка работников...</p>
                        </div>
                      ) : (
                        <>
                          <div className="workers-list">
                            {workers.map((worker) => (
                              <div
                                key={worker.id}
                                className={`worker-card ${
                                  selectedProblemWorkers.includes(worker.id)
                                    ? "selected"
                                    : ""
                                }`}
                                onClick={() => {
                                  if (selectedProblemWorkers.includes(worker.id)) {
                                    setSelectedProblemWorkers(
                                      selectedProblemWorkers.filter(
                                        (id) => id !== worker.id
                                      )
                                    );
                                  } else {
                                    setSelectedProblemWorkers([
                                      ...selectedProblemWorkers,
                                      worker.id,
                                    ]);
                                  }
                                }}
                              >
                                <div className="worker-info">
                                  <div className="worker-avatar">
                                    {worker.avatar_url ? (
                                      <img
                                        src={worker.avatar_url}
                                        alt={worker.first_name}
                                      />
                                    ) : (
                                      <div className="avatar-initials">
                                        {worker.first_name?.[0]}
                                        {worker.last_name?.[0]}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h5>
                                      {worker.first_name} {worker.last_name}
                                    </h5>
                                    <p>Рейтинг: {worker.rating || "нет"}</p>
                                  </div>
                                </div>

                                <div className="worker-check">
                                  {selectedProblemWorkers.includes(worker.id) ? (
                                    <FiCheck className="checked" />
                                  ) : (
                                    <FiXCircle className="unchecked" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {selectedProblemWorkers.length > 0 && (
                            <div className="problem-description">
                              <h4>Опишите проблему</h4>
                              <textarea
                                value={problemDescription}
                                onChange={(e) =>
                                  setProblemDescription(e.target.value)
                                }
                                placeholder="Подробно опишите возникшие проблемы..."
                                rows={4}
                              />
                            </div>
                          )}

                          <div className="form-actions">
                            <button
                              className="cancel-button"
                              onClick={() => {
                                setActiveFeedbackJob(null);
                                setSelectedProblemWorkers([]);
                                setProblemDescription("");
                              }}
                            >
                              Отмена
                            </button>
                            <button
                              className="submit-button"
                              onClick={() =>
                                handleSubmitProblemFeedback(notification.related_id)
                              }
                              disabled={
                                selectedProblemWorkers.length === 0 ||
                                (selectedProblemWorkers.length > 0 &&
                                  !problemDescription)
                              }
                            >
                              Отправить диспут
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // Стандартное отображение уведомления
            return (
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
                        onClick={() =>
                          handleNavigateToChat(notification.related_id)
                        }
                      >
                        <FiMessageSquare /> Написать работодателю
                      </button>
                    </div>
                  )}

                  {notification.type === "job_completed" && (
                    <div className="notification-actions">
                      <button
                        className="feedback-button"
                        onClick={() => startFeedback(notification.related_id)}
                      >
                        <FiCheckCircle /> Оставить отзыв
                      </button>
                      <button
                        className="view-job-button"
                        onClick={() => handleViewJob(notification.related_id)}
                      >
                        <FiBriefcase /> Посмотреть вакансию
                      </button>
                    </div>
                  )}

                  {notification.type === "dispute_created" && (
                    <div className="notification-actions">
                      <button
                        className="dispute-button"
                        onClick={() =>
                          navigate(`/disputes/${notification.related_id}`)
                        }
                      >
                        <FiAlertTriangle /> Перейти к диспуту
                      </button>
                    </div>
                  )}

                  {notification.type === "payment_released" && (
                    <div className="notification-actions">
                      <button
                        className="view-job-button"
                        onClick={() => handleViewJob(notification.job_id)}
                      >
                        <FiBriefcase /> Посмотреть смену
                      </button>
                    </div>
                  )}

                  {notification.type === "worker_rejected_booking" && (
                    <div className="notification-actions">
                      <button
                        className="view-job-button"
                        onClick={() => handleViewJob(notification.job_id)}
                      >
                        <FiBriefcase /> Посмотреть вакансию
                      </button>
                    </div>
                  )}
                </div>

                {!notification.is_read &&
                  notification.type !== "job_completed" && (
                    <button
                      className="mark-read-button"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      Пометить как прочитанное
                    </button>
                  )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;