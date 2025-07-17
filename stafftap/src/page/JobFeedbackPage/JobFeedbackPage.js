import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiCheck, FiAlertTriangle, FiUser, FiX } from "react-icons/fi";
import API_BASE_URL from "../../apiConfig";


const JobFeedbackPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState(null);
  const [problemDescription, setProblemDescription] = useState("");

  useEffect(() => {
    const fetchJobWorkers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/jobs/${jobId}/confirmed_workers`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setWorkers(response.data);
        setIsLoading(false);
      } catch (err) {
        console.error("Ошибка загрузки работников:", err);
        setError("Не удалось загрузить данные работников");
        setIsLoading(false);
      }
    };

    fetchJobWorkers();
  }, [jobId]);

  const toggleWorkerSelection = (workerId) => {
    if (selectedWorkers.includes(workerId)) {
      setSelectedWorkers(selectedWorkers.filter(id => id !== workerId));
    } else {
      setSelectedWorkers([...selectedWorkers, workerId]);
    }
  };

  const submitFeedback = async () => {
    try {
      const token = localStorage.getItem("token");
      
      await axios.post(
        `${API_BASE_URL}/api/jobs/${jobId}/feedback`,
        {
          status: feedbackStatus,
          problem_workers: feedbackStatus === "problem" ? selectedWorkers : [],
          problem_description: feedbackStatus === "problem" ? problemDescription : ""
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Перенаправляем на страницу уведомлений
      navigate("/notifications");
    } catch (err) {
      console.error("Ошибка отправки фидбэка:", err);
      setError("Не удалось отправить фидбэк");
    }
  };

  if (isLoading) {
    return (
      <div className="feedback-loading">
        <div className="loader"></div>
        <p>Загрузка данных о смене...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feedback-error">
        <h2>Ошибка</h2>
        <p>{error}</p>
        <button className="back-button" onClick={() => navigate(-1)}>
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="feedback-page">
      <div className="feedback-header">
        <h1>Обратная связь по смене</h1>
        <p>Пожалуйста, оцените работу сотрудников</p>
      </div>

      {!feedbackStatus ? (
        <div className="feedback-options">
          <div className="option-card success-option" onClick={() => setFeedbackStatus("success")}>
            <div className="option-icon">
              <FiCheck size={48} />
            </div>
            <div className="option-content">
              <h3>Всё отлично</h3>
              <p>
                Если все работники выполнили свои обязанности удовлетворительно, 
                выберите этот вариант. Средства будут автоматически переведены всем работникам.
              </p>
            </div>
          </div>

          <div className="option-card problem-option" onClick={() => setFeedbackStatus("problem")}>
            <div className="option-icon">
              <FiAlertTriangle size={48} />
            </div>
            <div className="option-content">
              <h3>Были проблемы</h3>
              <p>
                Если у вас были проблемы с некоторыми работниками, выберите этот вариант. 
                Вы сможете указать проблемных работников и оформить диспут.
              </p>
            </div>
          </div>
        </div>
      ) : feedbackStatus === "problem" ? (
        <div className="problem-feedback">
          <div className="section-header">
            <h2>Укажите проблемных работников</h2>
            <p>Выберите сотрудников, с которыми возникли проблемы</p>
          </div>

          <div className="workers-section">
            <div className="workers-list">
              {workers.map((worker) => (
                <div
                  key={worker.id}
                  className={`worker-card ${
                    selectedWorkers.includes(worker.id) ? "selected" : ""
                  }`}
                  onClick={() => toggleWorkerSelection(worker.id)}
                >
                  <div className="worker-avatar">
                    {worker.avatar_url ? (
                      <img 
                        src={worker.avatar_url} 
                        alt={`${worker.first_name} ${worker.last_name}`} 
                      />
                    ) : (
                      <div className="avatar-initials">
                        {worker.first_name?.[0] || ""}
                        {worker.last_name?.[0] || ""}
                      </div>
                    )}
                  </div>
                  <div className="worker-info">
                    <h3>{worker.first_name} {worker.last_name}</h3>
                    <p>Рейтинг: {worker.rating || "нет данных"}</p>
                    <p>Выполнено смен: {worker.completed_shifts || 0}</p>
                  </div>
                  <div className="worker-check">
                    {selectedWorkers.includes(worker.id) ? (
                      <FiCheck className="check-icon" />
                    ) : (
                      <FiX className="x-icon" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedWorkers.length > 0 && (
            <div className="problem-description">
              <div className="section-header">
                <h2>Опишите проблему</h2>
                <p>Подробно расскажите, какие проблемы возникли с выбранными работниками</p>
              </div>
              <textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Опишите возникшие проблемы..."
                rows={5}
              />
            </div>
          )}

          <div className="feedback-actions">
            <button
              className="back-button"
              onClick={() => setFeedbackStatus(null)}
            >
              Назад
            </button>
            <button
              className="submit-button"
              onClick={submitFeedback}
              disabled={selectedWorkers.length > 0 && !problemDescription}
            >
              Отправить диспут
            </button>
          </div>
        </div>
      ) : (
        <div className="success-feedback">
          <div className="success-message">
            <FiCheck className="success-icon" size={64} />
            <h2>Спасибо за отзыв!</h2>
            <p>
              Средства будут переведены всем работникам, участвовавшим в смене.
              Нажмите "Подтвердить", чтобы завершить процесс.
            </p>
          </div>
          
          <div className="feedback-actions">
            <button
              className="back-button"
              onClick={() => setFeedbackStatus(null)}
            >
              Назад
            </button>
            <button
              className="submit-button"
              onClick={submitFeedback}
            >
              Подтвердить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobFeedbackPage;