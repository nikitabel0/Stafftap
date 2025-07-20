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
  FiStar,
} from "react-icons/fi";
import API_BASE_URL from "../../apiConfig";
import "./NotificationsPage.css";

const NotificationsPage = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProblemWorkers, setSelectedProblemWorkers] = useState([]);
  const [problemDescription, setProblemDescription] = useState("");
  const [activeFeedbackJob, setActiveFeedbackJob] = useState(null);
  const [workersForJob, setWorkersForJob] = useState({});
  const [disputeModal, setDisputeModal] = useState({
    open: false,
    bookingId: null,
    description: "",
    notificationId: null,
  });
  const [reviewForm, setReviewForm] = useState({
    notificationId: null,
    bookingId: null,
    rating: 0,
    comment: "",
  });
  const [error, setError] = useState(null);
  const [loadingConfirmations, setLoadingConfirmations] = useState({});

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
        setError("Не удалось загрузить уведомления");
        setTimeout(() => setError(null), 5000);
      }
    };

    fetchNotifications();
  }, []);

  const fetchWorkersForJob = async (jobId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE_URL}/api/jobs/${jobId}/confirmed_workers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWorkersForJob((prev) => ({ ...prev, [jobId]: response.data }));
    } catch (error) {
      console.error("Ошибка при загрузке работников:", error);
      setError("Не удалось загрузить список работников");
      setTimeout(() => setError(null), 5000);
    }
  };

  const startFeedback = (jobId) => {
    setActiveFeedbackJob(jobId);
    setSelectedProblemWorkers([]);
    setProblemDescription("");

    if (!workersForJob[jobId]) {
      fetchWorkersForJob(jobId);
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
      setError("Не удалось пометить уведомление как прочитанное");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleWorkerCreateDispute = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/disputes/worker-create`,
        {
          booking_id: disputeModal.bookingId,
          description: disputeModal.description,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      
      setNotifications(
        notifications.filter((n) => n.id !== disputeModal.notificationId)
      );
      setDisputeModal({
        open: false,
        bookingId: null,
        description: "",
        notificationId: null,
      });

      
      navigate("/disputes");
    } catch (error) {
      console.error("Ошибка при создании диспута:", error);
      setError("Не удалось создать диспут");
      setTimeout(() => setError(null), 5000);
    }
  };

  
  const parseId = (id) => {
    const parsed = Number(id);
    if (isNaN(parsed)) {
      throw new Error(`Неверный идентификатор: ${id}`);
    }
    return parsed;
  };

 const handleConfirmBooking = async (bookingId, notificationId) => {
  try {
    setError(null);
    
    
    const parsedBookingId = parseId(bookingId);
    const parsedNotificationId = parseId(notificationId);
    
    setLoadingConfirmations(prev => ({ ...prev, [parsedBookingId]: true }));
    
    const token = localStorage.getItem("token");
    
    
    const bookingInfo = await axios.get(
      `${API_BASE_URL}/api/bookings/${parsedBookingId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const job = bookingInfo.data.job;
    
    const userBalance = user.balance;
    
    if (userBalance < job.rate) {
      throw new Error(`Недостаточно средств. Для подтверждения работника необходимо заморозить ${job.rate} руб. на сумму смены. Ваш текущий баланс: ${userBalance} руб. Пополните баланс!`);
    }
    
    
    await axios.post(
      `${API_BASE_URL}/api/bookings/${parsedBookingId}/confirm`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    
    setNotifications(notifications.filter((n) => n.id !== parsedNotificationId));
  } catch (error) {
    console.error("Ошибка при подтверждении бронирования:", error);
    
    let errorMessage = "Ошибка при подтверждении бронирования";
    if (error.response) {
      if (error.response.data && error.response.data.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      } else if (error.response.status === 400) {
        errorMessage = "Ошибка при подтверждении: неверный запрос";
      } else if (error.response.status === 403) {
        errorMessage = "Недостаточно прав для выполнения действия";
      } else if (error.response.status === 404) {
        errorMessage = "Бронирование не найдено";
      } else {
        errorMessage = `Ошибка сервера: ${error.response.status}`;
      }
    } else if (error.request) {
      errorMessage = "Сервер не ответил. Проверьте интернет-соединение";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    setError(errorMessage);
    setTimeout(() => setError(null), 10000);
  } finally {
    setLoadingConfirmations(prev => ({ ...prev, [bookingId]: false }));
  }
};

  const handleRejectBooking = async (bookingId, notificationId) => {
    try {
      
      const parsedBookingId = parseId(bookingId);
      const parsedNotificationId = parseId(notificationId);
      
      setLoadingConfirmations(prev => ({ ...prev, [parsedBookingId]: true }));
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/bookings/${parsedBookingId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(notifications.filter((n) => n.id !== parsedNotificationId));
    } catch (error) {
      console.error("Ошибка при отклонении бронирования:", error);
      
      let errorMessage = "Не удалось отклонить бронирование";
      if (error.response && error.response.data && error.response.data.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoadingConfirmations(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleNavigateToChat = async (bookingId) => {
    try {
      
      const parsedBookingId = parseId(bookingId);
      
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/api/chats/start/${parsedBookingId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/chats/${response.data.id}`);
    } catch (error) {
      console.error("Ошибка при создании чата:", error);
      
      let errorMessage = "Не удалось открыть чат";
      if (error.response && error.response.data && error.response.data.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleViewJob = (jobId) => {
    navigate(`/vacancy/${jobId}`);
  };

  const handleSubmitPositiveFeedback = async (jobId) => {
    try {
      
      const parsedJobId = parseId(jobId);
      
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/jobs/${parsedJobId}/feedback`,
        { status: "success" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.delete(
        `${API_BASE_URL}/api/notifications/job-completed/${parsedJobId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedNotifications = notifications.filter(
        (n) => !(n.type === "job_completed" && n.related_id === parsedJobId)
      );
      setNotifications(updatedNotifications);
      setActiveFeedbackJob(null);
    } catch (error) {
      console.error("Ошибка при отправке фидбэка:", error);
      
      let errorMessage = "Не удалось отправить обратную связь";
      if (error.response && error.response.data && error.response.data.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSubmitProblemFeedback = async (jobId) => {
    try {
      
      const parsedJobId = parseId(jobId);
      
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/jobs/${parsedJobId}/feedback`,
        {
          status: "problem",
          problem_workers: selectedProblemWorkers,
          problem_description: problemDescription,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      
      await axios.delete(
        `${API_BASE_URL}/api/notifications/job-completed/${parsedJobId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      
      const updatedNotifications = notifications.filter(
        (n) => !(n.type === "job_completed" && n.related_id === parsedJobId)
      );
      setNotifications(updatedNotifications);
      navigate(`/disputes`);
      setActiveFeedbackJob(null);
      setSelectedProblemWorkers([]);
      setProblemDescription("");
    } catch (error) {
      console.error("Ошибка при отправке фидбэка:", error);
      
      let errorMessage = "Не удалось отправить обратную связь";
      if (error.response && error.response.data && error.response.data.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleConfirmWork = async (notificationId) => {
    try {
      
      const parsedNotificationId = parseId(notificationId);
      
      setLoadingConfirmations(prev => ({ ...prev, [parsedNotificationId]: true }));
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/jobs/${parsedNotificationId}/confirm-work`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      
      const updatedNotifications = notifications.filter(
        (n) => n.id !== parsedNotificationId
      );
      setNotifications(updatedNotifications);
    } catch (error) {
      console.error("Ошибка при подтверждении работы:", error);
      
      let errorMessage = "Не удалось подтвердить работу";
      if (error.response && error.response.data && error.response.data.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoadingConfirmations(prev => ({ ...prev, [notificationId]: false }));
    }
  };

  const handleSubmitReview = async () => {
    try {
      
      const parsedNotificationId = parseId(reviewForm.notificationId);
      
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/jobs/${parsedNotificationId}/submit-review`,
        {
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      
      const updatedNotifications = notifications.filter(
        (n) => n.id !== parsedNotificationId
      );
      setNotifications(updatedNotifications);

      
      setReviewForm({
        notificationId: null,
        bookingId: null,
        rating: 0,
        comment: "",
      });
    } catch (error) {
      console.error("Ошибка при отправке отзыва:", error);
      
      let errorMessage = "Не удалось отправить отзыв";
      if (error.response && error.response.data && error.response.data.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSkipReview = async (notificationId) => {
    try {
      
      const parsedNotificationId = parseId(notificationId);
      
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/notifications/${parsedNotificationId}/skip-review`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      
      const updatedNotifications = notifications.filter(
        (n) => n.id !== parsedNotificationId
      );
      setNotifications(updatedNotifications);
    } catch (error) {
      console.error("Ошибка при пропуске отзыва:", error);
      
      let errorMessage = "Не удалось пропустить отзыв";
      if (error.response && error.response.data && error.response.data.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

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

    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

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
      case "worker_job_completed":
        return <FiClock className="notification-icon worker-job-completed" />;
      case "dispute_created":
        return (
          <FiAlertTriangle className="notification-icon dispute-created" />
        );
      case "payment_released":
        return <FiThumbsUp className="notification-icon payment-released" />;
      case "worker_rejected_booking":
        return <FiXCircle className="notification-icon worker-rejected" />;
      case "review_request":
        return <FiStar className="notification-icon review-request" />;
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

      {/* Блок отображения ошибок */}
      {error && (
        <div className="error-banner">
          <FiAlertCircle className="error-icon" />
          <div className="error-message">
            {typeof error === 'string' 
              ? error 
              : JSON.stringify(error, null, 2)}
          </div>
          <button 
            className="close-error" 
            onClick={() => setError(null)}
            aria-label="Закрыть ошибку"
          >
            &times;
          </button>
        </div>
      )}

      {/* Модальное окно для создания диспута */}
      {disputeModal.open && (
        <div className="dispute-modal">
          <div className="modal-content">
            <h3>Создать диспут</h3>
            <p>Опишите проблему с оплатой смены</p>

            <textarea
              value={disputeModal.description}
              onChange={(e) =>
                setDisputeModal({
                  ...disputeModal,
                  description: e.target.value,
                })
              }
              placeholder="Подробно опишите проблему..."
              rows={4}
            />

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() =>
                  setDisputeModal({
                    open: false,
                    bookingId: null,
                    description: "",
                    notificationId: null,
                  })
                }
              >
                Отмена
              </button>
              <button
                className="submit-button"
                onClick={handleWorkerCreateDispute}
                disabled={!disputeModal.description}
              >
                Создать диспут
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для оставления отзыва */}
      {reviewForm.notificationId && (
        <div className="review-modal">
          <div className="modal-content">
            <h3>Оставить отзыв о работодателе</h3>

            <div className="rating-section">
              <p>Оценка:</p>
              <div className="stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FiStar
                    key={star}
                    className={
                      star <= reviewForm.rating ? "star-filled" : "star-empty"
                    }
                    onClick={() =>
                      setReviewForm({ ...reviewForm, rating: star })
                    }
                  />
                ))}
              </div>
            </div>

            <div className="comment-section">
              <p>Комментарий (необязательно):</p>
              <textarea
                value={reviewForm.comment}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, comment: e.target.value })
                }
                placeholder="Расскажите о вашем опыте работы..."
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button className="submit-button" onClick={handleSubmitReview}>
                Отправить отзыв
              </button>
              <button
                className="cancel-button"
                onClick={() => handleSkipReview(reviewForm.notificationId)}
              >
                Пропустить
              </button>
            </div>
          </div>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="empty-notifications">
          <p>У вас пока нет уведомлений</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => {
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
                      onClick={() =>
                        setActiveFeedbackJob(notification.related_id)
                      }
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
                                  if (
                                    selectedProblemWorkers.includes(worker.id)
                                  ) {
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
                                  {selectedProblemWorkers.includes(
                                    worker.id
                                  ) ? (
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
                                handleSubmitProblemFeedback(
                                  notification.related_id
                                )
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

            const isLoading = loadingConfirmations[notification.related_id] || 
                             loadingConfirmations[notification.id];

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
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="loading-spinner"></span>
                        ) : (
                          <>
                            <FiCheckCircle /> Подтвердить
                          </>
                        )}
                      </button>
                      <button
                        className="reject-button"
                        onClick={() =>
                          handleRejectBooking(
                            notification.related_id,
                            notification.id
                          )
                        }
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="loading-spinner"></span>
                        ) : (
                          <>
                            <FiXCircle /> Отклонить
                          </>
                        )}
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
                          handleRejectBooking(
                            notification.related_id,
                            notification.id
                          )
                        }
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="loading-spinner"></span>
                        ) : (
                          <>
                            <FiXCircle /> Отказаться
                          </>
                        )}
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
                        <FiCheckCircle /> Подтвердить смену
                      </button>
                      <button
                        className="view-job-button"
                        onClick={() => handleViewJob(notification.related_id)}
                      >
                        <FiBriefcase /> Посмотреть вакансию
                      </button>
                    </div>
                  )}

                  {notification.type === "worker_job_completed" && (
                    <div className="notification-actions">
                      <button
                        className="confirm-button"
                        onClick={() => handleConfirmWork(notification.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="loading-spinner"></span>
                        ) : (
                          <>
                            <FiCheckCircle /> Подтвердить работу
                          </>
                        )}
                      </button>
                      <button
                        className="problem-button"
                        onClick={() =>
                          setDisputeModal({
                            open: true,
                            bookingId: notification.related_id,
                            description: "",
                            notificationId: notification.id,
                          })
                        }
                      >
                        <FiAlertTriangle /> Работодатель не подтверждает
                      </button>
                    </div>
                  )}

                  {notification.type === "review_request" && (
                    <div className="notification-actions">
                      <button
                        className="review-button"
                        onClick={() =>
                          setReviewForm({
                            notificationId: notification.id,
                            bookingId: notification.related_id,
                            rating: 0,
                            comment: "",
                          })
                        }
                      >
                        <FiStar /> Оставить отзыв
                      </button>
                      <button
                        className="skip-button"
                        onClick={() => handleSkipReview(notification.id)}
                      >
                        Пропустить
                      </button>
                    </div>
                  )}

                  {notification.type === "dispute_created" && (
                    <div className="notification-actions">
                      <button
                        className="view-dispute-button"
                        onClick={() => navigate("/disputes")}
                      >
                        Перейти к диспуту
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
                  notification.type !== "job_completed" &&
                  notification.type !== "worker_job_completed" && (
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