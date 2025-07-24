import React, { useState } from "react";
import { FiFile, FiUpload, FiX } from "react-icons/fi";
import styles from './DocumentUploadModal.module.css';
import { toast } from "react-toastify";

const DocumentUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [documentType, setDocumentType] = useState("ИНН");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Пожалуйста, выберите файл");
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(documentType, file);
      onClose();
      toast.success("Документ успешно загружен!");
    } catch (error) {
      console.error("Ошибка загрузки документа:", error);
      toast.error("Не удалось загрузить документ");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Загрузить документ</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className={styles.formGroup}>
          <label>
            <span className={styles.labelIcon}><FiFile /></span> 
            Тип документа
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className={styles.selectInput}
          >
            <option value="ИНН">ИНН</option>
            <option value="ОГРН">ОГРН</option>
            <option value="Выписка из ЕГРЮЛ">Выписка из ЕГРЮЛ</option>
            <option value="Паспорт">Паспорт</option>
            <option value="Доверенность">Доверенность</option>
            <option value="Другое">Другое</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.fileUploadLabel}>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            <div className={styles.fileUploadBox}>
              {fileName ? (
                <div className={styles.fileInfo}>
                  <FiFile className={styles.fileIcon} />
                  <span className={styles.fileName}>{fileName}</span>
                </div>
              ) : (
                <>
                  <FiUpload className={styles.uploadIcon} />
                  <span>Выберите файл</span>
                  <span className={styles.fileTypes}>PDF, JPG, PNG, DOC</span>
                </>
              )}
            </div>
          </label>
        </div>

        <div className={styles.modalActions}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isUploading}
          >
            Отмена
          </button>
          <button
            className={styles.uploadBtn}
            onClick={handleSubmit}
            disabled={isUploading}
          >
            {isUploading ? "Загрузка..." : "Загрузить"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;