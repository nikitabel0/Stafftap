import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ContactsPage.module.css'; // Создадим CSS модуль

const ContactsPage = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Реквизиты компании</h1>
        
        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Банковские реквизиты</h2>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Расчётный счёт:</span>
            <span className={styles.detailValue}>40802810020000714563</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Название банка:</span>
            <span className={styles.detailValue}>ООО "Банк Точка"</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>БИК:</span>
            <span className={styles.detailValue}>044525104</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Корреспондентский счёт:</span>
            <span className={styles.detailValue}>30101810745374525104</span>
          </div>
        </div>
        
        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Юридическая информация</h2>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Наименование:</span>
            <span className={styles.detailValue}>
              Индивидуальный предприниматель Филатов Сергей Юрьевич
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>ИНН:</span>
            <span className={styles.detailValue}>711614034305</span>
          </div>
        </div>
        
        <button 
          className={styles.backButton}
          onClick={() => navigate(-1)}
        >
          Вернуться назад
        </button>
      </div>
    </div>
  );
};

export default ContactsPage;