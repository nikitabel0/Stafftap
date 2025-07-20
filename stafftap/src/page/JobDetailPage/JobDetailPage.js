import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiClock,
  FiMapPin,
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiArrowLeft,
  FiPhone,
  FiUser,
  FiWifiOff,
  FiRefreshCw,
  FiTrash2,
  FiX,
  FiCheck,
  FiMessageSquare,
  FiStar
} from "react-icons/fi";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import styles from './JobDetailPage.module.css';

const JobDetailPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [notification, setNotification] = useState({ type: "", message: "" });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedWorkerForReview, setSelectedWorkerForReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  const fetchCurrentUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(response.data);
    } catch (err) {
      console.error("Ошибка загрузки пользователя:", err);
    }
  };

  const fetchJobDetails = async () => {
    setIsLoading(true);
    setError(null);
    setIsNetworkError(false);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Требуется авторизация");
      }

      const jobUrl = `${API_BASE_URL}/api/jobs/${jobId}`;
      const workersUrl = `${API_BASE_URL}/api/jobs/${jobId}/confirmed_workers`;

      const [jobResponse, workersResponse] = await Promise.all([
        axios.get(jobUrl, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }),
        axios.get(workersUrl, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }),
      ]);

      setJob(jobResponse.data);
      setWorkers(workersResponse.data);
    } catch (err) {
      console.error("Ошибка загрузки данных:", err);

      if (
        err.code === "ECONNABORTED" ||
        err.message === "Network Error" ||
        !err.response
      ) {
        setIsNetworkError(true);
        setError("Ошибка сети. Проверьте подключение к интернету");
      } else if (err.response) {
        switch (err.response.status) {
          case 401:
            setError("Сессия истекла. Пожалуйста, войдите снова.");
            break;
          case 403:
            setError("Недостаточно прав для просмотра этой вакансии");
            break;
          case 404:
            setError("Вакансия не найдена");
            break;
          case 500:
            setError("Ошибка сервера. Пожалуйста, попробуйте позже");
            break;
          default:
            setError(
              `Не удалось загрузить данные (код ${err.response.status})`
            );
        }
      } else {
        setError("Неизвестная ошибка: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToChat = async (bookingId, existingChatId) => {
    setIsChatLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      if (existingChatId) {
        navigate(`/chats/${existingChatId}`);
      } else {
        const response = await axios.post(
          `${API_BASE_URL}/api/chats/start/${bookingId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        navigate(`/chats/${response.data.id}`);
      }
    } catch (error) {
      console.error("Ошибка при создании чата:", error);
      let errorMessage = "Не удалось создать чат";
      
      if (error.response) {
        switch (error.response.status) {
          case 403:
            errorMessage = "Доступ запрещен";
            break;
          case 404:
            errorMessage = "Бронирование не найдено";
            break;
          default:
            errorMessage = `Ошибка сервера (${error.response.status})`;
        }
      }
      
      setNotification({
        type: "error",
        message: errorMessage
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const openReviewModal = (worker) => {
    setSelectedWorkerForReview(worker);
    setReviewRating(0);
    setReviewComment("");
    setIsReviewModalOpen(true);
  };

  const submitReview = async () => {
    if (!selectedWorkerForReview || reviewRating === 0) return;
    
    setIsReviewSubmitting(true);
    
    try {
      const token = getAuthToken();
      await axios.post(
        `${API_BASE_URL}/api/reviews/`,
        {
          booking_id: selectedWorkerForReview.booking_id,
          rating: reviewRating,
          comment: reviewComment
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setNotification({
        type: "success",
        message: "Отзыв успешно отправлен"
      });
      
      setWorkers(workers.map(w => 
        w.id === selectedWorkerForReview.id 
          ? { 
              ...w, 
              rating: calculateNewRating(w.rating, reviewRating),
              has_review: true
            } 
          : w
      ));
      
      setIsReviewModalOpen(false);
    } catch (error) {
      console.error("Ошибка отправки отзыва:", error);
      let errorMessage = "Не удалось отправить отзыв";
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = error.response.data.detail || errorMessage;
            break;
          case 403:
            errorMessage = "Недостаточно прав для оставления отзыва";
            break;
          case 404:
            errorMessage = "Бронирование не найдено";
            break;
        }
      }
      
      setNotification({
        type: "error",
        message: errorMessage
      });
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const calculateNewRating = (currentRating, newRating) => {
    if (!currentRating) return newRating;
    return parseFloat(((currentRating + newRating) / 2).toFixed(1));
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchJobDetails();
  }, [jobId]);

  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ type: "", message: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const formatNumber = (num) => {
    const number = Number(num);
    return isNaN(number) ? "0" : number.toLocaleString('ru-RU');
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Дата не указана";

    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const openConfirmModal = (workerId) => {
    setSelectedWorker(workerId);
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setSelectedWorker(null);
  };

  const handleRemoveWorker = async () => {
    if (!selectedWorker) return;

    try {
      setIsLoading(true);
      const token = getAuthToken();

      await axios.delete(
        `${API_BASE_URL}/api/bookings/remove_worker/${jobId}/${selectedWorker}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await fetchJobDetails();
      setNotification({
        type: "success",
        message: "Работник успешно удален с вакансии"
      });
    } catch (err) {
      console.error("Ошибка удаления работника:", err);

      let errorMessage = "Не удалось удалить работника";
      if (err.response) {
        switch (err.response.status) {
          case 400:
            errorMessage = err.response.data.detail || errorMessage;
            break;
          case 403:
            errorMessage = "Недостаточно прав для удаления работника";
            break;
          case 404:
            errorMessage = "Работник не найден на вакансии";
            break;
        }
      }

      setNotification({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
      closeConfirmModal();
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Загрузка данных о вакансии...</p>
      </div>
    );
  }

  if (isNetworkError) {
    const token = getAuthToken();
    const jobUrl = `${API_BASE_URL}/api/jobs/${jobId}`;

    return (
      <div className={styles.networkError}>
        <div className={styles.errorContent}>
          <FiWifiOff className={styles.errorIcon} size={48} />
          <h2>Проблемы с подключением</h2>
          <p>Не удалось подключиться к серверу. Пожалуйста:</p>
          <ul className={styles.errorList}>
            <li>• Проверьте подключение к интернету</li>
            <li>• Убедитесь, что VPN выключен</li>
            <li>• Проверьте настройки межсетевого экрана</li>
            <li>• Попробуйте обновить страницу</li>
          </ul>

          <div className={styles.debugInfo}>
            <p>
              <strong>URL запроса:</strong> {jobUrl}
            </p>
            <p>
              <strong>Токен:</strong> {token ? "присутствует" : "отсутствует"}
            </p>
            <p>
              <strong>API Base URL:</strong> {API_BASE_URL}
            </p>
          </div>

          <div className={styles.errorActions}>
            <button className={styles.retryButton} onClick={fetchJobDetails}>
              <FiRefreshCw className={styles.buttonIcon} /> Повторить попытку
            </button>
            <button className={styles.backButton} onClick={() => navigate(-1)}>
              <FiArrowLeft className={styles.buttonIcon} /> Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Ошибка</h2>
        <p>{error}</p>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <FiArrowLeft /> Назад
        </button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className={styles.errorContainer}>
        <h2>Вакансия не найдена</h2>
        <p>Запрошенная вакансия не существует или была удалена</p>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <FiArrowLeft /> Назад
        </button>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Уведомления */}
      {notification.message && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          <div className={styles.notificationContent}>
            {notification.type === "success" ? (
              <FiCheck className={styles.notificationIcon} />
            ) : (
              <FiX className={styles.notificationIcon} />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            className={styles.notificationClose}
            onClick={() => setNotification({ type: "", message: "" })}
          >
            <FiX />
          </button>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Подтверждение удаления</h3>
              <button className={styles.modalClose} onClick={closeConfirmModal}>
                <FiX />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>Вы уверены, что хотите удалить этого работника с вакансии?</p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={closeConfirmModal}
                disabled={isLoading}
              >
                Отмена
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleRemoveWorker}
                disabled={isLoading}
              >
                {isLoading ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для отзыва */}
      {isReviewModalOpen && selectedWorkerForReview && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Отзыв о работе {selectedWorkerForReview.first_name}</h3>
              <button 
                className={styles.modalClose} 
                onClick={() => setIsReviewModalOpen(false)}
              >
                <FiX />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.ratingSection}>
                <p>Оценка:</p>
                <div className={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      className={`${styles.star} ${star <= reviewRating ? styles.filled : ''}`}
                      onClick={() => setReviewRating(star)}
                      disabled={isReviewSubmitting}
                    >
                      <FiStar size={24} />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className={styles.commentSection}>
                <label htmlFor="review-comment">Комментарий (необязательно):</label>
                <textarea
                  id="review-comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Расскажите о работе сотрудника..."
                  rows={4}
                  disabled={isReviewSubmitting}
                />
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setIsReviewModalOpen(false)}
                disabled={isReviewSubmitting}
              >
                Отмена
              </button>
              <button
                className={styles.confirmButton}
                onClick={submitReview}
                disabled={isReviewSubmitting || reviewRating === 0}
              >
                {isReviewSubmitting ? "Отправка..." : "Отправить отзыв"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button className={styles.backButton} onClick={() => navigate(-1)}>
        <FiArrowLeft /> Назад
      </button>

      <div className={styles.jobCard}>
        <div className={styles.jobHeader}>
          <h1>{job.title}</h1>
          <div className={styles.jobCompany}>{job.company_name}</div>
          <div className={styles.jobStatus}>
            Статус: <span className={`${styles.status} ${styles['status-' + job.status]}`}>
              {job.status === 'active' && 'Активна'}
              {job.status === 'completed' && 'Завершена'}
              {job.status === 'successfully_completed' && 'Успешно завершена'}
              {job.status === 'disputed' && 'Есть споры'}
            </span>
          </div>
        </div>

        <div className={styles.jobBody}>
          <div className={styles.jobDescription}>
            <h3>Описание</h3>
            <p>{job.description}</p>
          </div>

          <div className={styles.jobMeta}>
            <div className={styles.metaItem}>
              <FiDollarSign className={styles.metaIcon} />
              <span>{formatNumber(job.rate)} ₽</span>
            </div>

            <div className={styles.metaItem}>
              <FiCalendar className={styles.metaIcon} />
              <span>{formatDate(job.work_date)}</span>
            </div>

            <div className={styles.metaItem}>
              <FiClock className={styles.metaIcon} />
              <span>
                {job.start_time} - {job.end_time}
              </span>
            </div>

            <div className={styles.metaItem}>
              <FiMapPin className={styles.metaIcon} />
              <span>{job.address}</span>
            </div>

            <div className={styles.metaItem}>
              <FiUsers className={styles.metaIcon} />
              <span>
                {job.remaining_slots > 0 ? (
                  <span className={styles.slotsAvailable}>
                    Осталось мест: {job.remaining_slots}/{job.workers_needed}
                  </span>
                ) : (
                  <span className={styles.slotsFull}>Все места заполнены</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.workersSection}>
          <h2>Подтвержденные сотрудники</h2>

          {workers.length > 0 ? (
            <div className={styles.workersList}>
              {workers.map((worker) => (
                <div key={worker.id} className={styles.workerCard}>
                  <div className={styles.workerAvatar}>
                    {worker.avatar_url ? (
                      <img
                        src={worker.avatar_url}
                        alt={`${worker.first_name} ${worker.last_name}`}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextElementSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div className={styles.avatarInitials}>
                      {worker.first_name?.[0] || ''}
                      {worker.last_name?.[0] || ''}
                    </div>
                  </div>

                  <div className={styles.workerInfo}>
                    <h3>
                      {worker.first_name} {worker.last_name}
                    </h3>

                    <div className={styles.workerContacts}>
                      {worker.phone && (
                        <div className={styles.contactItem}>
                          <FiPhone className={styles.contactIcon} />
                          <span>{worker.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.workerStats}>
                      <div className={styles.statItem}>
                        <FiStar className={styles.statIcon} />
                        <span>Рейтинг: {worker.rating || "нет оценок"}</span>
                      </div>
                      <div className={styles.statItem}>
                        <span>
                          Выполнено смен: {worker.completed_shifts || 0}
                        </span>
                      </div>
                      {worker.has_review && (
                        <div className={styles.reviewBadge}>
                          <span>Отзыв оставлен</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.workerActions}>
                    {job.status === 'successfully_completed' && 
                 !worker.has_review && (
                      <button
                        className={styles.reviewButton}
                        onClick={() => openReviewModal(worker)}
                        title="Оставить отзыв о работе"
                        disabled={isReviewSubmitting}
                      >
                        <FiStar size={18} /> Оставить отзыв
                      </button>
                    )}

                    <button
                      className={styles.removeButton}
                      onClick={() => openConfirmModal(worker.id)}
                      disabled={isLoading}
                      title="Удалить работника с вакансии"
                    >
                      <FiTrash2 size={18} /> Удалить
                    </button>
                    
                    {worker.chat_id ? (
                      <button
                        className={styles.chatButton}
                        onClick={() => navigate(`/chats/${worker.chat_id}`)}
                        title="Перейти в чат"
                        disabled={isChatLoading}
                      >
                        {isChatLoading ? (
                          <span>Загрузка...</span>
                        ) : (
                          <>
                            <FiMessageSquare size={18} /> Перейти в чат
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        className={styles.chatButton}
                        onClick={() => navigateToChat(worker.booking_id)}
                        title="Создать чат"
                        disabled={isChatLoading}
                      >
                        {isChatLoading ? (
                          <span>Создание...</span>
                        ) : (
                          <>
                            <FiMessageSquare size={18} /> Создать чат
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noWorkers}>
              <p>На эту вакансию еще не приняты сотрудники</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailPage;