import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCheck, FiX, FiInfo, FiCreditCard, 
         FiUser, FiPhone, FiHome, FiXCircle } from "react-icons/fi";
import { FaBitcoin } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';

import API_BASE_URL from "../../apiConfig";
import styles from './AdminWithdrawalsManagement.module.css';

const AdminWithdrawalsManagement = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [comment, setComment] = useState('');
  const [activeRequest, setActiveRequest] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/withdrawals`,
        {
          params: { status: statusFilter },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const safeRequests = response.data.map(request => ({
        ...request,
        user: request.user || {
          id: -1,
          first_name: "Удалённый",
          last_name: "пользователь",
          email: "N/A",
          avatar_url: null
        }
      }));
      
      setRequests(safeRequests);
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
      toast.error('Не удалось загрузить заявки');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleStatusChange = async (requestId, status) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/api/admin/withdrawals/${requestId}`,
        {
          status,
          admin_comment: status === 'rejected' ? comment : ''
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      toast.success(`Статус заявки обновлен на "${status}"`);
      loadRequests();
      setActiveRequest(null);
      setComment('');
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      toast.error('Не удалось обновить статус');
    }
  };

  const openDetailsModal = (request) => {
    setSelectedRequest(request);
    setDetailsModalOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseWalletInfo = (walletAddress, paymentMethod) => {
    if (!walletAddress) return [];
    
    if (paymentMethod === 'sbp') {
      const bankMatch = walletAddress.match(/СБП: (.+?), Телефон:/);
      const phoneMatch = walletAddress.match(/Телефон: (.+)$/);
      
      return [
        { icon: <FiHome />, label: 'Банк', value: bankMatch ? bankMatch[1] : 'Не указан' },
        { icon: <FiPhone />, label: 'Телефон', value: phoneMatch ? phoneMatch[1] : 'Не указан' }
      ];
    }
    
    if (paymentMethod === 'bank_card') {
      const cardMatch = walletAddress.match(/Карта: (.+?), Владелец:/);
      const holderMatch = walletAddress.match(/Владелец: (.+)$/);
      
      return [
        { icon: <FiCreditCard />, label: 'Номер карты', value: cardMatch ? cardMatch[1] : 'Не указан' },
        { icon: <FiUser />, label: 'Владелец', value: holderMatch ? holderMatch[1] : 'Не указан' }
      ];
    }
    
    return [
      { icon: <FiDollarSign />, label: 'Реквизиты', value: walletAddress }
    ];
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'bank_card': return <FiCreditCard className={styles.paymentIcon + " " + styles.card} />;
      case 'sbp': return <FiPhone className={styles.paymentIcon + " " + styles.sbp} />;
      case 'yoomoney': return <FiDollarSign className={styles.paymentIcon + " " + styles.yoomoney} />;
      case 'qiwi': return <FiCreditCard className={styles.paymentIcon + " " + styles.qiwi} />;
      case 'crypto': return <FaBitcoin className={styles.paymentIcon + " " + styles.crypto} />;
      default: return <FiDollarSign className={styles.paymentIcon} />;
    }
  };

  const getUserInitials = (user) => {
    if (!user) return '??';
    
    const firstChar = user.first_name?.[0] || '';
    const lastChar = user.last_name?.[0] || '';
    
    if (!firstChar && !lastChar) {
      return user.email?.[0]?.toUpperCase() || '?';
    }
    
    return `${firstChar}${lastChar}`;
  };

  const getFullName = (user) => {
    if (!user) return 'Пользователь удалён';
    
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return fullName || user.email || 'Без имени';
  };

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h2>Управление заявками на вывод средств</h2>
        
        <div className={styles.filters}>
          <label>Фильтр по статусу:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="pending">На рассмотрении</option>
            <option value="paid">Оплаченные</option>
            <option value="rejected">Отклоненные</option>
            <option value="">Все</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.loader}></div>
          <p>Загрузка заявок...</p>
        </div>
      ) : requests.length > 0 ? (
        <div className={styles.requestsList}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Пользователь</th>
                <th>Дата</th>
                <th>Сумма</th>
                <th>Способ</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(request => {
                const walletInfo = parseWalletInfo(request.wallet_address, request.payment_method);
                const primaryInfo = walletInfo.length > 0 ? walletInfo[0].value : '';
                
                return (
                  <tr key={request.id}>
                    <td>#{request.id}</td>
                    <td>
                      <div className={styles.userInfo}>
                        {request.user?.avatar_url ? (
                          <img 
                            src={request.user.avatar_url} 
                            alt="avatar" 
                            className={styles.avatar}
                          />
                        ) : (
                          <div className={styles.avatarInitials}>
                            {getUserInitials(request.user)}
                          </div>
                        )}
                        <div>
                          <div className={styles.userName}>
                            {getFullName(request.user)}
                          </div>
                          <div className={styles.userEmail}>
                            {request.user?.email || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(request.created_at)}</td>
                    <td className={styles.amountCell}>{request.amount} ₽</td>
                    <td>
                      <div className={styles.paymentMethod}>
                        <div className={styles.methodRow}>
                          {getPaymentIcon(request.payment_method)}
                          <span>
                            {request.payment_method === 'bank_card' && 'Карта'}
                            {request.payment_method === 'sbp' && 'СБП'}
                            {request.payment_method === 'yoomoney' && 'ЮMoney'}
                            {request.payment_method === 'qiwi' && 'QIWI'}
                            {request.payment_method === 'crypto' && 'Крипта'}
                          </span>
                        </div>
                        <div className={styles.walletPreview}>{primaryInfo}</div>
                      </div>
                    </td>
                    <td>
                      {request.status === 'pending' && (
                        <span className={`${styles.statusBadge} ${styles.pending}`}>
                          На рассмотрении
                        </span>
                      )}
                      {request.status === 'paid' && (
                        <span className={`${styles.statusBadge} ${styles.paid}`}>
                          Оплачено
                        </span>
                      )}
                      {request.status === 'rejected' && (
                        <span className={`${styles.statusBadge} ${styles.rejected}`}>
                          Отклонено
                        </span>
                      )}
                    </td>
                    <td className={styles.actions}>
                      {request.status === 'pending' ? (
                        <div className={styles.actionButtons}>
                          <button
                            className={`${styles.actionBtn} ${styles.approveBtn}`}
                            onClick={() => handleStatusChange(request.id, 'paid')}
                            title="Одобрить выплату"
                          >
                            <FiCheck /> Одобрить
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.rejectBtn}`}
                            onClick={() => setActiveRequest(request)}
                            title="Отклонить выплату"
                          >
                            <FiX /> Отклонить
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.detailsBtn}`}
                            onClick={() => openDetailsModal(request)}
                            title="Подробности"
                          >
                            <FiInfo />
                          </button>
                        </div>
                      ) : (
                        <div className={styles.actionButtons}>
                          <button
                            className={`${styles.actionBtn} ${styles.detailsBtn}`}
                            onClick={() => openDetailsModal(request)}
                            title="Подробности"
                          >
                            <FiInfo /> Подробности
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.noRequests}>
          <FiDollarSign className={styles.icon} />
          <p>Заявок по выбранному фильтру не найдено</p>
        </div>
      )}

      {/* Модальное окно отклонения заявки */}
      {activeRequest && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Отклонение заявки #{activeRequest.id}</h3>
            
            <div className={styles.requestInfo}>
              <div className={styles.detailRow}>
                <span className={styles.label}>Пользователь:</span>
                <span>{getFullName(activeRequest.user)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Сумма:</span>
                <span className={styles.amount}>{activeRequest.amount} ₽</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Способ:</span>
                <span>
                  {activeRequest.payment_method === 'bank_card' && 'Банковская карта'}
                  {activeRequest.payment_method === 'sbp' && 'СБП'}
                  {activeRequest.payment_method === 'yoomoney' && 'ЮMoney'}
                  {activeRequest.payment_method === 'qiwi' && 'QIWI'}
                  {activeRequest.payment_method === 'crypto' && 'Криптовалюта'}
                </span>
              </div>
              
              <div className={styles.walletDetails}>
                {parseWalletInfo(activeRequest.wallet_address, activeRequest.payment_method).map((info, index) => (
                  <div key={index} className={styles.walletInfoRow}>
                    <span className={styles.infoIcon}>{info.icon}</span>
                    <span className={styles.infoLabel}>{info.label}:</span>
                    <span className={styles.infoValue}>{info.value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label>Причина отклонения:</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Укажите причину отклонения заявки"
                rows={4}
                required
              />
              <small>Этот комментарий будет виден пользователю</small>
            </div>
            
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setActiveRequest(null);
                  setComment('');
                }}
              >
                Отмена
              </button>
              <button
                className={styles.confirmBtn}
                onClick={() => handleStatusChange(activeRequest.id, 'rejected')}
                disabled={!comment.trim()}
              >
                Подтвердить отклонение
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно детализации заявки */}
      {detailsModalOpen && selectedRequest && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button 
              className={styles.closeBtn}
              onClick={() => setDetailsModalOpen(false)}
            >
              <FiXCircle />
            </button>
            
            <h3>Детали заявки #{selectedRequest.id}</h3>
            
            <div className={styles.requestDetails}>
              <div className={styles.detailRow}>
                <span className={styles.label}>Пользователь:</span>
                <span>{getFullName(selectedRequest.user)}</span>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.label}>Email:</span>
                <span>{selectedRequest.user?.email || 'N/A'}</span>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.label}>Дата создания:</span>
                <span>{formatDate(selectedRequest.created_at)}</span>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.label}>Сумма:</span>
                <span className={styles.amount}>{selectedRequest.amount} ₽</span>
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.label}>Способ выплаты:</span>
                <span>
                  {selectedRequest.payment_method === 'bank_card' && 'Банковская карта'}
                  {selectedRequest.payment_method === 'sbp' && 'СБП'}
                  {selectedRequest.payment_method === 'yoomoney' && 'ЮMoney'}
                  {selectedRequest.payment_method === 'qiwi' && 'QIWI Кошелек'}
                  {selectedRequest.payment_method === 'crypto' && 'Криптовалюта'}
                </span>
              </div>
              
              <div className={styles.walletDetails}>
                {parseWalletInfo(selectedRequest.wallet_address, selectedRequest.payment_method).map((info, index) => (
                  <div key={index} className={styles.walletInfoRow}>
                    <span className={styles.infoIcon}>{info.icon}</span>
                    <span className={styles.infoLabel}>{info.label}:</span>
                    <span className={styles.infoValue}>{info.value}</span>
                  </div>
                ))}
              </div>
              
              <div className={styles.detailRow}>
                <span className={styles.label}>Статус:</span>
                <span>
                  {selectedRequest.status === 'pending' && (
                    <span className={`${styles.statusBadge} ${styles.pending}`}>
                      На рассмотрении
                    </span>
                  )}
                  {selectedRequest.status === 'paid' && (
                    <span className={`${styles.statusBadge} ${styles.paid}`}>
                      Оплачено
                    </span>
                  )}
                  {selectedRequest.status === 'rejected' && (
                    <span className={`${styles.statusBadge} ${styles.rejected}`}>
                      Отклонено
                    </span>
                  )}
                </span>
              </div>
              
              {selectedRequest.processed_at && (
                <div className={styles.detailRow}>
                  <span className={styles.label}>Дата обработки:</span>
                  <span>{formatDate(selectedRequest.processed_at)}</span>
                </div>
              )}
              
              {selectedRequest.admin_comment && (
                <div className={styles.detailRow}>
                  <span className={styles.label}>Комментарий:</span>
                  <div className={styles.comment}>{selectedRequest.admin_comment}</div>
                </div>
              )}
            </div>
            
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setDetailsModalOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawalsManagement;