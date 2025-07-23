import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";
import styles from "./AdminJobsModeration.module.css";

const AdminJobsModeration = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/admin/jobs/moderation`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setJobs(response.data);
      } catch (err) {
        setError("Ошибка загрузки вакансий");
        console.error("Ошибка загрузки вакансий:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleStatusChange = async (jobId, status) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/api/admin/jobs/${jobId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setJobs(jobs.filter((job) => job.id !== jobId));
    } catch (err) {
      console.error("Ошибка изменения статуса:", err);
      setError("Не удалось изменить статус");
    }
  };

  if (loading) {
    return <div className={styles.adminLoading}>Загрузка вакансий...</div>;
  }

  if (error) {
    return <div className={styles.adminError}>{error}</div>;
  }

  return (
    <div className={styles.adminJobsModeration}>
      <h2>Вакансии на модерации</h2>

      {jobs.length === 0 ? (
        <div className={styles.noJobs}>
          <p>Нет вакансий для модерации</p>
        </div>
      ) : (
        <div className={styles.jobsList}>
          {jobs.map((job) => (
            <div key={job.id} className={styles.moderationJobCard}>
              <div className={styles.jobHeader}>
                <h3>{job.title}</h3>
                <span className={styles.company}>{job.company_name}</span>
              </div>

              <div className={styles.jobDetails}>
                <div className={styles.detail}>
                  <strong>Описание:</strong>
                  <p>{job.description}</p>
                </div>

                <div className={styles.detailRow}>
                  <div className={styles.detail}>
                    <strong>Дата:</strong>
                    <span>
                      {new Date(job.work_date).toLocaleDateString("ru-RU")}
                    </span>
                  </div>

                  <div className={styles.detail}>
                    <strong>Время:</strong>
                    <span>
                      {job.start_time} - {job.end_time}
                    </span>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <div className={styles.detail}>
                    <strong>Ставка:</strong>
                    <span>{job.rate} ₽</span>
                  </div>

                  <div className={styles.detail}>
                    <strong>Требуемый навык:</strong>
                    <span>{job.required_skill_name}</span>
                  </div>
                </div>

                <div className={styles.detail}>
                  <strong>Адрес:</strong>
                  <span>{job.address}</span>
                </div>
              </div>

              <div className={styles.jobActions}>
                <button
                  className={styles.approveBtn}
                  onClick={() => handleStatusChange(job.id, "active")}
                >
                  <FiCheckCircle /> Одобрить
                </button>
                <button
                  className={styles.rejectBtn}
                  onClick={() => handleStatusChange(job.id, "rejected")}
                >
                  <FiXCircle /> Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminJobsModeration;