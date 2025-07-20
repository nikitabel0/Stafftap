// AdminDisputesManagement.jsx
import React, { useState, useEffect } from "react";
import { 
  FiShield, 
  FiMessageSquare, 
  FiCheck, 
  FiX, 
  FiUser, 
  FiBriefcase, 
  FiDollarSign
} from "react-icons/fi";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../apiConfig";
import "./AdminDisputesManagement.css";

const AdminDisputesManagement = () => {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDispute, setActiveDispute] = useState(null);
  const [adminComment, setAdminComment] = useState("");
  const [decision, setDecision] = useState(null);
  const [chatLoading, setChatLoading] = useState({
    worker: false,
    employer: false
  });

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/admin/disputes`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setDisputes(response.data);
      } catch (err) {
        setError("Ошибка загрузки диспутов");
        console.error("Ошибка загрузки диспутов:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, []);

  const handleSelectDispute = (dispute) => {
    setActiveDispute(dispute);
    setAdminComment("");
    setDecision(null);
  };

  const handleResolveDispute = async () => {
    if (!activeDispute || !decision) {
      alert("Пожалуйста, выберите решение по диспуту");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      await axios.post(
        `${API_BASE_URL}/api/admin/disputes/${activeDispute.id}/resolve`,
        {
          decision,
          comment: adminComment
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setDisputes(disputes.filter(d => d.id !== activeDispute.id));
      setActiveDispute(null);
      setAdminComment("");
      setDecision(null);
      
      alert("Диспут успешно разрешен!");
    } catch (err) {
      console.error("Ошибка разрешения диспута:", err);
      setError("Не удалось разрешить диспут");
    } finally {
      setLoading(false);
    }
  }
const handleStartChat = async (participantId) => {
  if (!activeDispute) return;
  
  console.log("[DEBUG] Starting chat with participant:", participantId);
  console.log("[DEBUG] Active dispute:", activeDispute);
  
  try {
    const participantType = participantId === activeDispute.worker_id ? "worker" : "employer";
    setChatLoading(prev => ({ ...prev, [participantType]: true }));
    
    const token = localStorage.getItem("token");
    
    // ИСПРАВЛЕНИЕ: Явно указываем формат JSON
    const response = await axios.post(
      `${API_BASE_URL}/api/chats/admin/start/${activeDispute.booking_id}`,
      { participant_id: participantId },  // Данные в формате объекта
      { 
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"  // Явное указание типа контента
        } 
      }
    );
    
    console.log("[DEBUG] Chat created:", response.data);
    navigate(`/chats/${response.data.id}`);
  } catch (error) {
    console.error("[ERROR] Full error:", error);
    
    if (error.response) {
      console.error("[ERROR] Response data:", error.response.data);
      
      // Улучшенная обработка ошибок
      let errorMessage = "Ошибка сервера";
      
      if (error.response.status === 400) {
        errorMessage = error.response.data.detail || "Неверный запрос";
      } else if (error.response.status === 403) {
        errorMessage = "Доступ запрещен: недостаточно прав";
      } else if (error.response.status === 404) {
        errorMessage = "Ресурс не найден";
      }
      
      alert(`Ошибка: ${errorMessage}`);
    } else {
      alert("Не удалось создать чат. Проверьте соединение.");
    }
  } finally {
    setChatLoading({ worker: false, employer: false });
  }
}

  return (
    <div className="admin-disputes-management">
      <div className="admin-section-header">
        <h2><FiShield /> Управление диспутами</h2>
        <p>Просмотр и разрешение споров между работниками и работодателями</p>
      </div>

      <div className="disputes-container">
        <div className="disputes-list">
          <h3>Открытые диспуты ({disputes.length})</h3>
          
          {disputes.length === 0 ? (
            <div className="no-disputes">
              <p>Нет открытых диспутов</p>
            </div>
          ) : (
            <div className="disputes-items">
              {disputes.map(dispute => (
                <div 
                  key={dispute.id} 
                  className={`dispute-item ${activeDispute?.id === dispute.id ? 'active' : ''}`}
                  onClick={() => handleSelectDispute(dispute)}
                >
                  <div className="dispute-header">
                    <span className="dispute-id">#{dispute.id}</span>
                    <span className="dispute-date">
                      {new Date(dispute.created_at).toLocaleDateString("ru-RU", {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <div className="dispute-parties">
                    <div className="party worker">
                      <FiUser className="icon" />
                      <span>{dispute.worker_first_name} {dispute.worker_last_name}</span>
                    </div>
                    
                    <div className="vs">vs</div>
                    
                    <div className="party employer">
                      <FiBriefcase className="icon" />
                      <span>{dispute.employer_company_name}</span>
                    </div>
                  </div>
                  
                  <div className="dispute-details">
                    <div className="detail">
                      <span className="label">Сумма:</span>
                      <span className="value">{dispute.frozen_amount} ₽</span>
                    </div>
                    
                    <div className="detail">
                      <span className="label">Смена:</span>
                      <span className="value">{dispute.job_title}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="dispute-detail-panel">
          {activeDispute ? (
            <div className="dispute-detail">
              <div className="dispute-header">
                <h3>Диспут #{activeDispute.id}</h3>
                <span className="status open">Открыт</span>
              </div>
              
              <div className="dispute-info">
                <div className="info-section">
                  <h4>Описание проблемы</h4>
                  <p>{activeDispute.description || "Описание не предоставлено"}</p>
                </div>
                
                <div className="info-section">
                  <h4>Участники</h4>
                  <div className="parties">
                    <div className="party worker">
                      <div className="party-header">
                        <FiUser className="icon" />
                        <h5>Работник</h5>
                      </div>
                      <div className="party-details">
                        <p>{activeDispute.worker_first_name} {activeDispute.worker_last_name}</p>
                        <p>{activeDispute.worker_email}</p>
                        <p>Телефон: {activeDispute.worker_phone || "не указан"}</p>
                      </div>
                      <button 
                        className="chat-button"
                        onClick={() => handleStartChat(activeDispute.worker_id)}
                        disabled={chatLoading.worker}
                      >
                        {chatLoading.worker ? (
                          "Загрузка..."
                        ) : (
                          <>
                            <FiMessageSquare /> Написать работнику
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="party employer">
                      <div className="party-header">
                        <FiBriefcase className="icon" />
                        <h5>Работодатель</h5>
                      </div>
                      <div className="party-details">
                        <p>{activeDispute.employer_company_name}</p>
                        <p>{activeDispute.employer_email}</p>
                        <p>Контакт: {activeDispute.employer_contact_name || "не указан"}</p>
                      </div>
                      <button 
                        className="chat-button"
                        onClick={() => handleStartChat(activeDispute.employer_user_id)}
                        disabled={chatLoading.employer}
                      >
                        {chatLoading.employer ? (
                          "Загрузка..."
                        ) : (
                          <>
                            <FiMessageSquare /> Написать работодателю
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="info-section">
                  <h4>Детали смены</h4>
                  <div className="job-details">
                    <p><strong>Название:</strong> {activeDispute.job_title}</p>
                    <p><strong>Дата:</strong> {new Date(activeDispute.job_date).toLocaleDateString("ru-RU")}</p>
                    <p><strong>Время:</strong> {activeDispute.job_start_time} - {activeDispute.job_end_time}</p>
                    <p><strong>Адрес:</strong> {activeDispute.job_address}</p>
                    <p><strong>Замороженная сумма:</strong> {activeDispute.frozen_amount} ₽</p>
                  </div>
                </div>
                
                <div className="info-section">
                  <h4>Решение администратора</h4>
                  
                  <div className="decision-options">
                    <div 
                      className={`option ${decision === 'worker' ? 'selected' : ''}`}
                      onClick={() => setDecision('worker')}
                    >
                      <FiUser className="icon" />
                      <span>В пользу работника</span>
                      <p>Средства будут переведены работнику</p>
                    </div>
                    
                    <div 
                      className={`option ${decision === 'employer' ? 'selected' : ''}`}
                      onClick={() => setDecision('employer')}
                    >
                      <FiBriefcase className="icon" />
                      <span>В пользу работодателя</span>
                      <p>Средства будут возвращены работодателю</p>
                    </div>
                  </div>
                  
                  <div className="admin-comment">
                    <label>Комментарий администратора:</label>
                    <textarea
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      placeholder="Опишите ваше решение и его причины..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>
              
              <div className="dispute-actions">
                <button 
                  className="resolve-btn" 
                  onClick={handleResolveDispute}
                  disabled={!decision}
                >
                  <FiCheck /> Разрешить диспут
                </button>
              </div>
            </div>
          ) : (
            <div className="no-dispute-selected">
              <FiShield className="icon" />
              <p>Выберите диспут из списка для просмотра деталей и принятия решения</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDisputesManagement;