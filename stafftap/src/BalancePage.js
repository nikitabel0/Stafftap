import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "./apiConfig";

const BalancePage = ({ user, updateUser }) => {
  const [amount, setAmount] = useState(100);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [testCardInfo, setTestCardInfo] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Проверка статуса платежа после возврата с оплаты
  useEffect(() => {
    const checkPaymentStatus = async () => {
      const params = new URLSearchParams(location.search);
      const paymentIdParam = params.get("payment_id");

      if (paymentIdParam) {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(
            `${API_BASE_URL}/api/payments/${paymentIdParam}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          const payment = response.data;

          if (payment.status === "succeeded") {
            setSuccessMessage(`Платеж на сумму ${payment.amount} руб. успешно завершен!`);
            setPaymentHistory(prev => [...prev, payment]);
            
            // Запрос актуального баланса с сервера
            const userResponse = await axios.get(`${API_BASE_URL}/api/users/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            updateUser(userResponse.data);
          }

          // Очищаем параметры URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          setError("Ошибка при проверке статуса платежа");
        }
      }
    };

    checkPaymentStatus();
  }, [location.search, updateUser]);

  // Загрузка истории платежей
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!user) return;

      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/api/payments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPaymentHistory(response.data);
      } catch (err) {
        console.error("Ошибка загрузки истории платежей:", err);
      }
    };

    fetchPaymentHistory();
  }, [user]);

  // Создание платежа
  const handleDeposit = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (amount < 10) {
      setError("Минимальная сумма пополнения - 10 рублей");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    setTestCardInfo(false);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/api/payments/deposit`,
        { amount },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setPaymentUrl(response.data.confirmation_url);
      setTestCardInfo(true);

      // Открываем страницу оплаты
      const paymentWindow = window.open(
        response.data.confirmation_url,
        "_blank",
        "width=600,height=800"
      );

      // Проверка статуса платежа
      const checkInterval = setInterval(async () => {
        if (paymentWindow.closed) {
          clearInterval(checkInterval);
          return;
        }

        try {
          const statusResponse = await axios.get(
            `${API_BASE_URL}/api/payments/${response.data.payment_id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          if (statusResponse.data.status === "succeeded") {
            clearInterval(checkInterval);
            paymentWindow.close();
            setSuccessMessage(`Платеж на сумму ${amount} руб. успешно завершен!`);
            setPaymentHistory(prev => [...prev, statusResponse.data]);
            
            // Запрос актуального баланса
            const userResponse = await axios.get(`${API_BASE_URL}/api/users/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            updateUser(userResponse.data);
          }
        } catch (err) {
          console.error("Ошибка проверки статуса:", err);
        }
      }, 5000);
    } catch (err) {
      setError(err.response?.data?.detail || "Ошибка при создании платежа");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="balance-page">
      <h2>Пополнение баланса</h2>

      <div className="balance-info">
        <p>
          Текущий баланс: <strong>{user?.balance?.toFixed(2)} руб.</strong>
        </p>
      </div>

      {successMessage && (
        <div className="success-message">
          <p>{successMessage}</p>
        </div>
      )}

      <div className="deposit-form">
        <div className="form-group">
          <label htmlFor="amount">Сумма пополнения (руб.):</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            min="10"
            step="10"
          />
        </div>

        <button
          onClick={handleDeposit}
          disabled={isLoading}
          className="deposit-button"
        >
          {isLoading ? "Обработка..." : "Пополнить баланс"}
        </button>

        {error && <p className="error-message">{error}</p>}

        {testCardInfo && (
          <div className="test-card-info">
            <h3>Тестовая информация для оплаты</h3>
            <p>Используйте тестовые данные карты:</p>
            <div className="test-card-details">
              <p><strong>Номер карты:</strong> 4242 4242 4242 4242</p>
              <p><strong>Срок действия:</strong> Любая будущая дата</p>
              <p><strong>CVC:</strong> Любые 3 цифры</p>
            </div>
          </div>
        )}
      </div>

      {paymentHistory.length > 0 && (
        <div className="payment-history">
          <h3>История платежей</h3>
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>ID платежа</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map((payment) => (
                <tr key={payment.id}>
                  <td>{new Date(payment.created_at).toLocaleString()}</td>
                  <td>{payment.amount} руб.</td>
                  <td className={`status-${payment.status}`}>
                    {payment.status === "succeeded" ? "Успешно" : "В обработке"}
                  </td>
                  <td>{payment.payment_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BalancePage;