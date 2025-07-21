import React, { useState, useEffect } from "react";
import { 
  FiShield, 
  FiMessageSquare, 
  FiCheck, 
  FiX, 
  FiUser, 
  FiBriefcase,
  FiDollarSign,
  FiXCircle
} from "react-icons/fi";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../apiConfig";
import styles from './AdminDisputesManagement.module.css';

const AdminDisputesManagement = () => {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
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
    if (!activeDispute || !decision) return;

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

      // Обновляем список диспутов
      setDisputes(disputes.filter(d => d.id !== activeDispute.id));
      setActiveDispute(null);
      setAdminComment("");
      setDecision(null);
    } catch (err) {
      console.error("Ошибка разрешения диспута:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (participantId) => {
    if (!activeDispute) return;
    
    try {
      const participantType = participantId === activeDispute.worker_id ? "worker" : "employer";
      setChatLoading(prev => ({ ...prev, [participantType]: true }));
      
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/api/chats/admin/start/${activeDispute.booking_id}`,
        { participant_id: participantId },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          } 
        }
      );
      
      navigate(`/chats/${response.data.id}`);
    } catch (error) {
      console.error("Ошибка создания чата:", error);
      let errorMessage = "Ошибка сервера";
      
      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = error.response.data.detail || "Неверный запрос";
        } else if (error.response.status === 403) {
          errorMessage = "Доступ запрещен";
        } else if (error.response.status === 404) {
          errorMessage = "Ресурс не найден";
        }
      }
    } finally {
      setChatLoading({ worker: false, employer: false });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.headerTitle}>
          <FiShield className={styles.headerIcon} /> 
          Управление диспутами
        </h2>
        <p className={styles.headerDescription}>
          Просмотр и разрешение споров между работниками и работодателями
        </p>
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.disputesList}>
          <h3>Открытые диспуты ({disputes.length})</h3>
          
          {disputes.length === 0 ? (
            <div className={styles.noDisputes}>
              <p>Нет открытых диспутов</p>
            </div>
          ) : (
            <div className={styles.disputesItems}>
              {disputes.map(dispute => (
                <div 
                  key={dispute.id} 
                  className={`${styles.disputeItem} ${activeDispute?.id === dispute.id ? styles.active : ''}`}
                  onClick={() => handleSelectDispute(dispute)}
                >
                  <div className={styles.disputeHeader}>
                    <span className={styles.disputeId}>#{dispute.id}</span>
                    <span className={styles.disputeDate}>
                      {formatDate(dispute.created_at)}
                    </span>
                  </div>
                  
                  <div className={styles.disputeParties}>
                    <div className={`${styles.party} ${styles.worker}`}>
                      <FiUser className={`${styles.partyIcon} ${styles.workerIcon}`} />
                      <span>{dispute.worker_first_name} {dispute.worker_last_name}</span>
                    </div>
                    
                    <div className={styles.vs}>vs</div>
                    
                    <div className={`${styles.party} ${styles.employer}`}>
                      <FiBriefcase className={`${styles.partyIcon} ${styles.employerIcon}`} />
                      <span>{dispute.employer_company_name}</span>
                    </div>
                  </div>
                  
                  <div className={styles.disputeDetails}>
                    <div className={styles.detail}>
                      <span className={styles.label}>Сумма:</span>
                      <span className={styles.value}>{dispute.frozen_amount} ₽</span>
                    </div>
                    
                    <div className={styles.detail}>
                      <span className={styles.label}>Смена:</span>
                      <span className={styles.value}>{dispute.job_title}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className={styles.detailPanel}>
          {activeDispute ? (
            <div className={styles.disputeDetail}>
              <div className={styles.disputeDetailHeader}>
                <h3>Диспут #{activeDispute.id}</h3>
                <span className={`${styles.statusBadge} ${styles.statusOpen}`}>
                  Открыт
                </span>
              </div>
              
              <div className={styles.infoSection}>
                <h4>Описание проблемы</h4>
                <p>{activeDispute.description || "Описание не предоставлено"}</p>
              </div>
              
              <div className={styles.infoSection}>
                <h4>Участники</h4>
                <div className={styles.partiesContainer}>
                  <div className={styles.partyCard}>
                    <div className={styles.partyHeader}>
                      <FiUser className={`${styles.partyIcon} ${styles.workerIcon}`} />
                      <h5 className={styles.partyTitle}>Работник</h5>
                    </div>
                    <div className={styles.partyDetails}>
                      <p>{activeDispute.worker_first_name} {activeDispute.worker_last_name}</p>
                      <p>{activeDispute.worker_email}</p>
                      <p>Телефон: {activeDispute.worker_phone || "не указан"}</p>
                    </div>
                    <button 
                      className={styles.chatButton}
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
                  
                  <div className={styles.partyCard}>
                    <div className={styles.partyHeader}>
                      <FiBriefcase className={`${styles.partyIcon} ${styles.employerIcon}`} />
                      <h5 className={styles.partyTitle}>Работодатель</h5>
                    </div>
                    <div className={styles.partyDetails}>
                      <p>{activeDispute.employer_company_name}</p>
                      <p>{activeDispute.employer_email}</p>
                      <p>Контакт: {activeDispute.employer_contact_name || "не указан"}</p>
                    </div>
                    <button 
                      className={styles.chatButton}
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
              
              <div className={styles.infoSection}>
                <h4>Детали смены</h4>
                <div className={styles.jobDetails}>
                  <p><strong>Название:</strong> {activeDispute.job_title}</p>
                  <p><strong>Дата:</strong> {new Date(activeDispute.job_date).toLocaleDateString("ru-RU")}</p>
                  <p><strong>Время:</strong> {activeDispute.job_start_time} - {activeDispute.job_end_time}</p>
                  <p><strong>Адрес:</strong> {activeDispute.job_address}</p>
                  <p><strong>Замороженная сумма:</strong> {activeDispute.frozen_amount} ₽</p>
                </div>
              </div>
              
              <div className={`${styles.infoSection} ${styles.decisionSection}`}>
                <h4>Решение администратора</h4>
                
                <div className={styles.decisionOptions}>
                  <div 
                    className={`${styles.optionCard} ${decision === 'worker' ? styles.selected : ''}`}
                    onClick={() => setDecision('worker')}
                  >
                    <FiUser className={styles.optionIcon} />
                    <span className={styles.optionTitle}>В пользу работника</span>
                    <p className={styles.optionDescription}>Средства будут переведены работнику</p>
                  </div>
                  
                  <div 
                    className={`${styles.optionCard} ${decision === 'employer' ? styles.selected : ''}`}
                    onClick={() => setDecision('employer')}
                  >
                    <FiBriefcase className={styles.optionIcon} />
                    <span className={styles.optionTitle}>В пользу работодателя</span>
                    <p className={styles.optionDescription}>Средства будут возвращены работодателю</p>
                  </div>
                </div>
                
                <div className={styles.commentField}>
                  <label>Комментарий администратора:</label>
                  <textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Опишите ваше решение и его причины..."
                    rows={4}
                  />
                </div>
              </div>
              
              <div className={styles.actionsBar}>
                <button 
                  className={styles.resolveButton}
                  onClick={handleResolveDispute}
                  disabled={!decision || loading}
                >
                  <FiCheck /> Разрешить диспут
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.noSelection}>
              <FiShield className={styles.noSelectionIcon} />
              <p>Выберите диспут из списка для просмотра деталей и принятия решения</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDisputesManagement;