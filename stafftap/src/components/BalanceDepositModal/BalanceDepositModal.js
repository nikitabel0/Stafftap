const BalanceDepositModal = ({ user, updateUser, onClose, onDepositSuccess }) => {
  const [amount, setAmount] = useState(100);
  const [commission, setCommission] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [testCardInfo, setTestCardInfo] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const location = useLocation();

  // Расчет комиссии при изменении суммы
  useEffect(() => {
    const calculateCommission = async () => {
      if (amount < 10) {
        setCommission(0);
        setTotalAmount(amount);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/payments/calculate-commission?amount=${amount}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        // Защита от отсутствующих значений в ответе
        const safeCommission = response.data.commission || 0;
        const safeTotal = response.data.total || amount;
        
        setCommission(safeCommission);
        setTotalAmount(safeTotal);
      } catch (err) {
        console.error("Ошибка расчета комиссии", err);
        setCommission(0);
        setTotalAmount(amount);
      }
    };

    calculateCommission();
  }, [amount]);

  // Вспомогательная функция для безопасного форматирования чисел
  const safeToFixed = (value, decimals = 2) => {
    const num = parseFloat(value);
    return isNaN(num) ? "0.00" : num.toFixed(decimals);
  };

  // Создание платежа
  const handleDeposit = async () => {
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

          const paymentData = statusResponse.data;
          
          if (paymentData.status === "succeeded") {
            clearInterval(checkInterval);
            paymentWindow.close();
            
            // Безопасное форматирование значений
            const safeAmount = paymentData.amount || 0;
            const safeCommission = paymentData.commission || 0;
            
            setSuccessMessage(
              `Платеж на сумму ${safeAmount.toFixed(2)} руб. (комиссия: ${safeCommission.toFixed(2)} руб.) успешно завершен!`
            );
            
            // Обновление данных пользователя
            const userResponse = await axios.get(`${API_BASE_URL}/api/users/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            updateUser(userResponse.data);
            
            if (onDepositSuccess) {
              onDepositSuccess();
            }
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
    <div className={styles.modalOverlay}>
      <div className={styles.depositModal}>
        <div className={styles.modalHeader}>
          <h2>Пополнение баланса</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className={styles.balanceInfo}>
          <FiDollarSign className={styles.icon} />
          <span>Доступный баланс: {safeToFixed(user.balance)} ₽</span>
        </div>
        
        <div className={styles.depositForm}>
          <div className={styles.formGroup}>
            <label>Сумма пополнения (₽)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setAmount(isNaN(value) ? 0 : value);
              }}
              min="10"
              step="10"
              className={styles.amountInput}
            />
          </div>
          
          <div className={styles.commissionDetails}>
            <div className={styles.detailRow}>
              <span>Сумма пополнения:</span>
              <span>{safeToFixed(amount)} ₽</span>
            </div>
            <div className={styles.detailRow}>
              <span>Комиссия:</span>
              <span>{safeToFixed(commission)} ₽</span>
            </div>
            <div className={`${styles.detailRow} ${styles.totalRow}`}>
              <span>Итого к оплате:</span>
              <span>{safeToFixed(totalAmount)} ₽</span>
            </div>
          </div>

          <button
            onClick={handleDeposit}
            disabled={isLoading}
            className={styles.depositButton}
          >
            {isLoading ? "Обработка..." : "Пополнить баланс"}
          </button>

          {error && <p className={styles.errorMessage}>{error}</p>}

          {testCardInfo && (
            <div className={styles.testCardInfo}>
              <h3>Тестовая информация для оплаты</h3>
              <p>Используйте тестовые данные карты:</p>
              <div className={styles.testCardDetails}>
                <p><strong>Номер карты:</strong> 4242 4242 4242 4242</p>
                <p><strong>Срок действия:</strong> Любая будущая дата</p>
                <p><strong>CVC:</strong> Любые 3 цифры</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BalanceDepositModal