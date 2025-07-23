import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import styles from './FinanceHistory.module.css';
import API_BASE_URL from '../../apiConfig';

const FinanceHistory = () => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({});
  const [settings, setSettings] = useState({ tax_percent: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [notification, setNotification] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Загрузка истории
      const historyRes = await axios.get(`${API_BASE_URL}/api/admin/finance/history`, {
        params: { page },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setHistory(historyRes.data.history);
      setTotalItems(historyRes.data.total);
      setTotalPages(Math.ceil(historyRes.data.total / historyRes.data.page_size));
      
      // Загрузка сводки
      const summaryRes = await axios.get(`${API_BASE_URL}/api/admin/finance/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummary(summaryRes.data);
      
      // Загрузка настроек комиссии
      const settingsRes = await axios.get(`${API_BASE_URL}/api/payments/commission`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Добавляем налог по умолчанию, если его нет
      setSettings({ 
        ...settingsRes.data, 
        tax_percent: settingsRes.data.tax_percent || 0 
      });
      
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      showNotification('Ошибка загрузки данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const updateSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/payments/commission`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification('Настройки комиссии успешно обновлены!', 'success');
    } catch (error) {
      console.error('Ошибка обновления настроек:', error);
      showNotification('Ошибка при обновлении настроек', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Рассчитываем доход (комиссия минус налог)
  const calculateIncome = () => {
    if (!summary.total_commission) return 0;
    const taxAmount = (summary.total_commission * (settings.tax_percent || 0)) / 100;
    return summary.total_commission - taxAmount;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Загрузка финансовых данных...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Управление финансами</h2>
      
      {notification && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.message}
        </div>
      )}
      
      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <div className={styles.card}>
            <div className={`${styles.cardHeader} ${styles.summaryHeader}`}>
              <h3>Финансовая сводка</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.summaryItem}>
                <span>Общая сумма пополнений:</span>
                <span className={styles.summaryValue}>{summary.total_amount?.toFixed(2)} руб.</span>
              </div>
              <div className={styles.summaryItem}>
                <span>Общая комиссия:</span>
                <span className={styles.summaryValue}>{summary.total_commission?.toFixed(2)} руб.</span>
              </div>
              <div className={styles.summaryItem}>
                <span>Налог ({settings.tax_percent || 0}%):</span>
                <span className={styles.summaryValue}>
                  {(summary.total_commission * (settings.tax_percent || 0) / 100).toFixed(2)} руб.
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span>Доход:</span>
                <span className={styles.summaryIncome}>{calculateIncome().toFixed(2)} руб.</span>
              </div>
              <div className={styles.summaryItem}>
                <span>Всего транзакций:</span>
                <span className={styles.summaryValue}>{summary.total_transactions}</span>
              </div>
            </div>
          </div>
          
          <div className={styles.card}>
            <div className={`${styles.cardHeader} ${styles.settingsHeader}`}>
              <h3>Настройки комиссии</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.formGroup}>
                <div className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={settings.is_active}
                    onChange={(e) => setSettings({...settings, is_active: e.target.checked})}
                  />
                  <label htmlFor="isActive">
                    Комиссия активна
                  </label>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Тип комиссии</label>
                <select
                  className={styles.formSelect}
                  value={settings.commission_type}
                  onChange={(e) => setSettings({...settings, commission_type: e.target.value})}
                >
                  <option value="percentage">Процент</option>
                  <option value="fixed">Фиксированная</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {settings.commission_type === 'percentage' ? 'Процент (%)' : 'Фиксированная сумма'}
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={settings.value}
                  onChange={(e) => setSettings({...settings, value: parseFloat(e.target.value) || 0})}
                  min="0"
                  step={settings.commission_type === 'percentage' ? "0.1" : "10"}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Минимальная комиссия (руб.)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={settings.min_amount}
                  onChange={(e) => setSettings({...settings, min_amount: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="10"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Налог на доход (%)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={settings.tax_percent}
                  onChange={(e) => setSettings({...settings, tax_percent: parseFloat(e.target.value) || 0})}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Описание</label>
                <textarea
                  className={styles.formTextarea}
                  value={settings.description || ''}
                  onChange={(e) => setSettings({...settings, description: e.target.value})}
                />
              </div>
              
              <button className={styles.saveButton} onClick={updateSettings}>
                Сохранить настройки
              </button>
            </div>
          </div>
        </div>
        
        <div className={styles.mainContent}>
          <div className={styles.card}>
            <div className={`${styles.cardHeader} ${styles.historyHeader}`}>
              <div>
                <h3>История операций</h3>
                <p className={styles.totalOperations}>Всего операций: {totalItems}</p>
              </div>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Пользователь</th>
                      <th>Сумма</th>
                      <th>Комиссия</th>
                      <th>Доход</th>
                      <th>Статус</th>
                      <th>ID платежа</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => {
                      const taxAmount = (item.commission * (settings.tax_percent || 0)) / 100;
                      const income = item.commission - taxAmount;
                      
                      return (
                        <tr key={item.id}>
                          <td>{format(new Date(item.created_at), 'dd.MM.yyyy HH:mm')}</td>
                          <td className={styles.userEmail}>{item.user_email}</td>
                          <td>{item.amount.toFixed(2)} руб.</td>
                          <td>{item.commission.toFixed(2)} руб.</td>
                          <td className={styles.incomeCell}>{income.toFixed(2)} руб.</td>
                          <td className={styles.statusCell}>
                            <span className={`${styles.statusBadge} ${
                              item.status === 'succeeded' ? styles.statusSuccess : styles.statusPending
                            }`}>
                              {item.status === 'succeeded' ? 'Успешно' : 'В обработке'}
                            </span>
                          </td>
                          <td>{item.payment_id}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className={styles.pagination}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    className={`${styles.pageButton} ${page === num ? styles.active : ''}`}
                    onClick={() => setPage(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceHistory;