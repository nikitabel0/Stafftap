import React, { useState } from 'react';
import { FiX, FiDollarSign, FiCreditCard, FiUser } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_BASE_URL from "../../apiConfig";

// Список банков для СБП
const SBP_BANKS = [
  { id: 'sberbank', name: 'Сбербанк' },
  { id: 'vtb', name: 'ВТБ' },
  { id: 'gazprom', name: 'Газпромбанк' },
  { id: 'alfabank', name: 'Альфа-Банк' },
  { id: 'tinkoff', name: 'Тинькофф' },
  { id: 'raiffaisen', name: 'Райффайзенбанк' },
  { id: 'promsvyaz', name: 'Промсвязьбанк' },
  { id: 'rosbank', name: 'Росбанк' },
  { id: 'otkritie', name: 'Открытие' },
  { id: 'sovcombank', name: 'Совкомбанк' },
  { id: 'postbank', name: 'Почта Банк' },
  { id: 'uralsib', name: 'Уралсиб' },
  { id: 'rosselhoz', name: 'Россельхозбанк' },
];

const WithdrawModal = ({ user, onClose, onWithdrawSuccess }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_card');
  const [bank, setBank] = useState(''); // Для СБП
  const [phone, setPhone] = useState(''); // Для СБП
  const [cardNumber, setCardNumber] = useState(''); // Для банковской карты
  const [cardHolder, setCardHolder] = useState(''); // Для банковской карты
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Валидация суммы
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      newErrors.amount = "Введите корректную сумму";
    } else if (Number(amount) > user.balance) {
      newErrors.amount = "Недостаточно средств на балансе";
    } else if (Number(amount) < 500) {
      newErrors.amount = "Минимальная сумма вывода 500 ₽";
    }
    
    // Валидация в зависимости от метода
    if (paymentMethod === 'sbp') {
      if (!bank) newErrors.bank = "Выберите банк";
      if (!phone.trim()) newErrors.phone = "Введите номер телефона";
      else if (!/^[\d+]{10,15}$/.test(phone)) newErrors.phone = "Некорректный номер телефона";
    } 
    else if (paymentMethod === 'bank_card') {
      if (!cardNumber.trim()) newErrors.cardNumber = "Введите номер карты";
      else if (!/^\d{16,19}$/.test(cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = "Некорректный номер карты";
      }
      if (!cardHolder.trim()) newErrors.cardHolder = "Введите имя владельца";
    }
    else {
      // Для других методов
      if (!cardNumber.trim()) newErrors.cardNumber = "Введите реквизиты";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatWalletAddress = () => {
    switch (paymentMethod) {
      case 'sbp':
        const bankName = SBP_BANKS.find(b => b.id === bank)?.name || bank;
        return `СБП: ${bankName}, Телефон: ${phone}`;
        
      case 'bank_card':
        return `Карта: ${cardNumber}, Владелец: ${cardHolder}`;
        
      case 'yoomoney':
        return `ЮMoney: ${cardNumber}`;
        
        
      default:
        return cardNumber;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem("token");
      const walletAddress = formatWalletAddress();
      
      await axios.post(
        `${API_BASE_URL}/api/users/withdraw`,
        {
          amount: Number(amount),
          payment_method: paymentMethod,
          wallet_address: walletAddress
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      toast.success("Заявка на вывод успешно создана!");
      onWithdrawSuccess();
      onClose();
    } catch (error) {
      console.error('Ошибка создания заявки:', error);
      let errorMessage = "Ошибка при создании заявки";
      
      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = error.response.data.detail || errorMessage;
        } else if (error.response.status === 401) {
          errorMessage = "Требуется авторизация";
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Форматирование номера карты (добавляем пробелы)
  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = '';
    
    for (let i = 0; i < cleaned.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += cleaned[i];
    }
    
    return formatted;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content withdraw-modal">
        <div className="modal-header">
          <h2>Заявка на вывод средств</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className="balance-info">
          <FiDollarSign className="icon" />
          <span>Доступный баланс: {user.balance.toFixed(2)} ₽</span>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Сумма вывода (₽)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Введите сумму"
              className={errors.amount ? "error-input" : ""}
              min="500"
              step="100"
            />
            {errors.amount && <p className="error-text">{errors.amount}</p>}
          </div>
          
          <div className="form-group">
            <label>Способ вывода</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="payment-select"
            >
              <option value="bank_card">Банковская карта</option>
              <option value="sbp">СБП (Система быстрых платежей)</option>
              <option value="yoomoney">ЮMoney</option>
              <option value="qiwi">QIWI Кошелек</option>
              <option value="crypto">Криптовалюта</option>
            </select>
          </div>
          
          {/* Поля для СБП */}
          {paymentMethod === 'sbp' && (
            <div className="sbp-fields">
              <div className="form-group">
                <label>Банк получателя</label>
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className={errors.bank ? "error-input" : ""}
                >
                  <option value="">Выберите банк</option>
                  {SBP_BANKS.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                {errors.bank && <p className="error-text">{errors.bank}</p>}
              </div>
              
              <div className="form-group">
                <label>Номер телефона</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 XXX XXX XX XX"
                  className={errors.phone ? "error-input" : ""}
                />
                {errors.phone && <p className="error-text">{errors.phone}</p>}
              </div>
            </div>
          )}
          
          {/* Поля для банковской карты */}
          {paymentMethod === 'bank_card' && (
            <div className="card-fields">
              <div className="form-group">
                <label>Номер карты</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className={errors.cardNumber ? "error-input" : ""}
                />
                {errors.cardNumber && <p className="error-text">{errors.cardNumber}</p>}
              </div>
              
              <div className="form-group">
                <label>Имя владельца карты</label>
                <div className="input-with-icon">
                  <FiUser className="input-icon" />
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="IVAN IVANOV"
                    className={errors.cardHolder ? "error-input" : ""}
                  />
                </div>
                {errors.cardHolder && <p className="error-text">{errors.cardHolder}</p>}
              </div>
            </div>
          )}
          
          {/* Поле для других методов */}
          {!['sbp', 'bank_card'].includes(paymentMethod) && (
            <div className="form-group">
              <label>
                {paymentMethod === "yoomoney" 
                  ? "Номер кошелька ЮMoney" 
                  : paymentMethod === "qiwi"
                    ? "Номер QIWI кошелька"
                    : paymentMethod === "crypto" 
                      ? "Крипто-адрес" 
                      : "Реквизиты"}
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder={
                  paymentMethod === "crypto" 
                    ? "Введите крипто-адрес" 
                    : "Введите реквизиты"
                }
                className={errors.cardNumber ? "error-input" : ""}
              />
              {errors.cardNumber && <p className="error-text">{errors.cardNumber}</p>}
            </div>
          )}
          
          <div className="form-note">
            <p>Обработка заявки занимает 1-3 рабочих дня</p>
            <p>Минимальная сумма вывода: 500 ₽</p>
            {paymentMethod === 'sbp' && (
              <p>Вывод через СБП доступен только на карты российских банков</p>
            )}
          </div>
          
          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Отправка..." : "Подать заявку"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;