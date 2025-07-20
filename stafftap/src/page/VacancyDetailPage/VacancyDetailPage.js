import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiMapPin,
  FiClock,
  FiDollarSign,
  FiUser,
  FiStar,
  FiCheck,
  FiBookmark,
  FiMessageSquare,
  FiBriefcase,
  FiArrowLeft,
  FiXCircle,
} from "react-icons/fi";
import styles from './VacancyDetailPage.module.css';
import API_BASE_URL from "../../apiConfig";

const VacancyDetailPage = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vacancy, setVacancy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [error, setError] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const role = user?.role || "worker";

  const startChat = async () => {
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
      setError("Не удалось начать чат. Попробуйте позже.");
    }
  };

  useEffect(() => {
    const fetchVacancy = async () => {
      try {
        const token = localStorage.getItem("token");
        const vacancyResponse = await axios.get(
          `${API_BASE_URL}/api/jobs/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = vacancyResponse.data;
        setVacancy({
          id: data.id,
          title: data.title,
          description: data.description,
          profession: data.required_skill_name,
          date: data.work_date,
          startTime: data.start_time,
          endTime: data.end_time,
          address: data.address,
          salary: data.rate,
          workersNeeded: data.workers_needed,
          remainingSlots: data.remaining_slots,
          company: data.company_name,
          employerName: data.employer_name,
          employerRating: data.employer_rating,
          completedJobs: data.completed_jobs,
          employerVerified: data.employer_verified,
          isFavorite: data.is_favorite,
        });

        setIsFavorite(data.is_favorite || false);

        if (user && user.role === "worker") {
          const bookingsResponse = await axios.get(
            `${API_BASE_URL}/api/bookings?job_id=${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const myBooking = bookingsResponse.data.find(
            (b) => b.worker_id === user.id
          );
          if (myBooking) {
            setBookingId(myBooking.id);
            setHasApplied(true);
            setApplicationStatus(myBooking.status);
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Ошибка при загрузке вакансии:", error);
        setIsLoading(false);
        setError("Не удалось загрузить вакансию");
      }
    };

    fetchVacancy();
  }, [id, user]);

  const handleToggleFavorite = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/jobs/${id}/favorite`,
        { is_favorite: !isFavorite },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Ошибка при обновлении избранного:", error);
      setError("Не удалось обновить избранное");
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/api/bookings/`,
        {
          job_id: parseInt(id),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBookingId(response.data.id);
      setHasApplied(true);
      setApplicationStatus("pending");
    } catch (error) {
      console.error("Ошибка при отправке заявки:", error);

      let errorMessage = "Не удалось отправить заявку";

      if (error.response) {
        if (error.response.data && error.response.data.detail) {
          if (Array.isArray(error.response.data.detail)) {
            errorMessage = error.response.data.detail
              .map((item) => item.msg || item.message || JSON.stringify(item))
              .join(", ");
          } else if (typeof error.response.data.detail === "string") {
            errorMessage = error.response.data.detail;
          } else if (
            error.response.data.detail &&
            error.response.data.detail.msg
          ) {
            errorMessage = error.response.data.detail.msg;
          }
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsApplying(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "long" };
    return new Date(dateString).toLocaleDateString("ru-RU", options);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Загрузка вакансии...</p>
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div className={styles.notFoundContainer}>
        <h2>Вакансия не найдена</h2>
        <p>Возможно, она была удалена или перемещена</p>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          Вернуться назад
        </button>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <FiArrowLeft className={styles.backIcon} />
          Назад
        </button>
        <h1>{vacancy.title}</h1>
        <div className={styles.headerActions}>
          <button
            className={`${styles.favoriteButton} ${isFavorite ? styles.active : ""}`}
            onClick={handleToggleFavorite}
            aria-label={
              isFavorite ? "Убрать из избранного" : "Добавить в избранное"
            }
          >
            <FiBookmark className={styles.favoriteIcon} />
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <FiXCircle className={styles.errorIcon} />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.infoCard}>
        <div className={styles.metaInfo}>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <FiBriefcase className={styles.icon} />
              <span>{vacancy.profession}</span>
            </div>
            <div className={`${styles.metaItem} ${styles.salary}`}>
              <FiDollarSign className={styles.icon} />
              <span>{vacancy.salary.toLocaleString("ru-RU")} ₽</span>
            </div>
          </div>

          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <FiClock className={styles.icon} />
              <span>
                {formatDate(vacancy.date)}, {vacancy.startTime} -{" "}
                {vacancy.endTime}
              </span>
            </div>
            <div className={styles.metaItem}>
              <FiUser className={styles.icon} />
              <span>
                {vacancy.remainingSlots}/{vacancy.workersNeeded} мест
              </span>
            </div>
          </div>

          <div className={`${styles.metaItem} ${styles.address}`}>
            <FiMapPin className={styles.icon} />
            <span>{vacancy.address}</span>
          </div>
        </div>

        <div className={styles.description}>
          <h3>Описание вакансии</h3>
          <p>{vacancy.description}</p>
        </div>
      </div>

      <div className={styles.employerCard}>
        <h3>Работодатель</h3>
        <div className={styles.employerInfo}>
          <div className={styles.employerHeader}>
            <h4>{vacancy.company}</h4>
            {vacancy.employerVerified && (
              <span className={styles.verifiedBadge}>
                <FiCheck /> Проверен
              </span>
            )}
          </div>
          <div className={styles.employerStats}>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <FiStar className={styles.icon} />
              </div>
              <div>
                <div className={styles.statLabel}>Рейтинг</div>
                <div className={styles.statValue}>
                  {vacancy.employerRating
                    ? vacancy.employerRating.toFixed(1)
                    : "0.0"}
                </div>
              </div>
            </div>

            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <FiBriefcase className={styles.icon} />
              </div>
              <div>
                <div className={styles.statLabel}>Завершено</div>
                <div className={styles.statValue}>{vacancy.completedJobs} работ</div>
              </div>
            </div>
          </div>

          <div className={styles.employerContact}>
            <span>{vacancy.employerName}</span>
          </div>
        </div>
      </div>

      <div className={styles.actionsContainer}>
        {role === "worker" && !hasApplied && (
          <button
            className={styles.applyButton}
            onClick={handleApply}
            disabled={isApplying}
          >
            {isApplying ? (
              <>
                <span className={styles.spinner}></span> Отправка...
              </>
            ) : (
              "Откликнуться"
            )}
          </button>
        )}

        {role === "worker" && hasApplied && (
          <div className={styles.applicationStatus}>
            {applicationStatus === "confirmed" && (
              <button className={styles.messageButton} onClick={startChat}>
                <FiMessageSquare className={styles.messageIcon} />
                <span>Написать работодателю</span>
              </button>
            )}

            {applicationStatus === "pending" && (
              <div className={`${styles.status} ${styles.pending}`}>
                <p>Ваша заявка на рассмотрении</p>
              </div>
            )}

            {applicationStatus === "rejected" && (
              <div className={`${styles.status} ${styles.rejected}`}>
                <p>Ваша заявка отклонена</p>
              </div>
            )}
          </div>
        )}

        {role === "employer" && (
          <button
            className={styles.manageButton}
            onClick={() => navigate(`/bookings?job_id=${id}`)}
          >
            Управлять откликами
          </button>
        )}
      </div>
    </div>
  );
};

export default VacancyDetailPage;