import React from "react";
import { FiFile, FiDownload, FiTrash2, FiCheck, FiX } from "react-icons/fi";
import styles from './DocumentsList.module.css';

const DocumentsList = ({
  documents,
  isEditing,
  onDocumentsChange,
  onAddDocument,
  onDeleteDocument
}) => {
  const safeDocuments = documents || [];

  const getStatusInfo = (status) => {
    switch (status) {
      case "approved":
        return { text: "Подтвержден", icon: <FiCheck className={styles.statusIconApproved} />, className: styles.statusApproved };
      case "rejected":
        return { text: "Отклонен", icon: <FiX className={styles.statusIconRejected} />, className: styles.statusRejected };
      default:
        return { text: "На проверке", icon: null, className: styles.statusPending };
    }
  };

  return (
    <div className={styles.documentsContainer}>
      {safeDocuments.length > 0 ? (
        safeDocuments.map((doc) => {
          const statusInfo = getStatusInfo(doc.status);
          
          return (
            <div key={doc.id} className={`${styles.documentItem} ${statusInfo.className}`}>
              <div className={styles.documentIcon}>
                <FiFile className={styles.fileIcon} />
              </div>
              
              <div className={styles.documentInfo}>
                <div className={styles.documentType}>{doc.document_type}</div>
                <div className={styles.documentStatus}>
                  {statusInfo.icon}
                  <span>{statusInfo.text}</span>
                </div>
                
                {doc.admin_comment && doc.status === "rejected" && (
                  <div className={styles.documentComment}>
                    <strong>Комментарий:</strong> {doc.admin_comment}
                  </div>
                )}
                
                <div className={styles.documentDate}>
                  Загружен: {new Date(doc.created_at).toLocaleDateString("ru-RU")}
                </div>
              </div>
              
              <div className={styles.documentActions}>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.downloadBtn}
                  title="Скачать документ"
                >
                  <FiDownload />
                </a>
                {isEditing && (
                  <button
                    className={styles.removeBtn}
                    onClick={() => onDeleteDocument(doc.id)}
                    title="Удалить документ"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className={styles.noDocuments}>
          <FiFile className={styles.noDocumentsIcon} />
          <p>Документы не загружены</p>
        </div>
      )}

      {isEditing && (
        <button className={styles.addDocumentBtn} onClick={onAddDocument}>
          <span className={styles.plusIcon}>+</span> Добавить документ
        </button>
      )}
    </div>
  );
};

export default DocumentsList;