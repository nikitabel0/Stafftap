import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import { FiFile, FiCheck, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import styles from "./AdminDocumentsModeration.module.css";

const AdminDocumentsModeration = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [currentDocumentId, setCurrentDocumentId] = useState(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/admin/documents/pending`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setDocuments(response.data);
      } catch (err) {
        setError("Ошибка загрузки документов");
        console.error("Ошибка загрузки документов:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleStatusChange = async (docId, status, comment = "") => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/admin/documents/${docId}/review`,
        { status, comment },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setDocuments(documents.filter((doc) => doc.id !== docId));
      setCurrentDocumentId(null);
      setReviewComment("");
      toast.success(
        `Документ ${status === "approved" ? "одобрен" : "отклонен"}`
      );
    } catch (err) {
      console.error("Ошибка изменения статуса документа:", err);
      setError("Не удалось изменить статус");
      toast.error("Ошибка при обновлении статуса документа");
    }
  };

  const openReviewModal = (docId) => {
    setCurrentDocumentId(docId);
  };

  const closeReviewModal = () => {
    setCurrentDocumentId(null);
    setReviewComment("");
  };

  if (loading) {
    return <div className={styles.adminLoading}>Загрузка документов...</div>;
  }

  if (error) {
    return <div className={styles.adminError}>{error}</div>;
  }

  return (
    <div className={styles.adminDocumentsModeration}>
      <h2>Документы на проверке</h2>

      {documents.length === 0 ? (
        <div className={styles.noDocuments}>
          <p>Нет документов для проверки</p>
        </div>
      ) : (
        <div className={styles.documentsList}>
          {documents.map((doc) => (
            <div key={doc.id} className={styles.moderationDocCard}>
              <div className={styles.docHeader}>
                <h3>{doc.document_type}</h3>
                <span className={styles.user}>
                  От: {doc.user_email} ({doc.company_name})
                </span>
              </div>

              <div className={styles.docDetails}>
                <div className={styles.detail}>
                  <strong>Загружено:</strong>
                  <span>
                    {new Date(doc.uploaded_at).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div className={styles.docPreview}>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.previewLink}
                >
                  <FiFile className={styles.fileIcon} />
                  <span>Просмотреть документ</span>
                </a>
              </div>

              <div className={styles.docActions}>
                <button
                  className={styles.approveBtn}
                  onClick={() => handleStatusChange(doc.id, "approved")}
                >
                  <FiCheck /> Одобрить
                </button>
                <button
                  className={styles.rejectBtn}
                  onClick={() => openReviewModal(doc.id)}
                >
                  <FiX /> Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentDocumentId && (
        <div className={styles.modalOverlay}>
          <div className={styles.documentReviewModal}>
            <h2>Отклонение документа</h2>
            <p>Укажите причину отклонения документа:</p>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Причина отклонения..."
              rows={4}
            />

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeReviewModal}>
                Отмена
              </button>
              <button
                className={styles.rejectConfirmBtn}
                onClick={() =>
                  handleStatusChange(
                    currentDocumentId,
                    "rejected",
                    reviewComment
                  )
                }
                disabled={!reviewComment.trim()}
              >
                Подтвердить отклонение
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDocumentsModeration;