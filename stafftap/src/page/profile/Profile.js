import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiPlus,
  FiStar,
  FiFile,
  FiBriefcase,
  FiShield,
  FiUsers,
  FiDownload,
  FiTrash2,
  FiCamera,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiUser,
  FiLock,
  FiUnlock,
  FiBarChart2,
  FiFileText,
  FiCheck,
  FiX,
  FiSearch,
  FiUpload,
  FiType,
  FiDollarSign,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./ProfilePage.css";
import SkillsList from "../../components/SkillsList/SkillsList";
import AvailabilityCalendar from "../../components/AvailabilityCalendar/AvailabilityCalendar";
import VacancyCards from "../../components/VacancyCards/VacancyCards";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminDisputesManagement from "../../components/AdminDisputesManagement/AdminDisputesManagement";
import WithdrawModal from "../../components/WithdrawModal/WithdrawModal";
import AdminWithdrawalsManagement from "../../components/AdminWithdrawalsManagement/AdminWithdrawalsManagement";
import FinanceHistory from "../../components/FinanceHistory/FinanceHistory";
import PlatformStatistics from "../../components/PlatformStatistics/PlatformStatistics";
import AdminJobsModeration from "../../components/AdminJobsModeration/AdminJobsModeration";
import AdminUsersManagement from "../../components/AdminUsersManagement/AdminUsersManagement";
import AdminDocumentsModeration from "../../components/AdminDocumentsModeration/AdminDocumentsModeration";
import styles from './BalanceDepositModal.module.css';

const safeFormatNumber = (value, defaultValue = 0) => {
  const num = Number(value);
  return isNaN(num)
    ? defaultValue.toLocaleString("ru-RU")
    : num.toLocaleString("ru-RU");
};

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
    <div className="modal-overlay">
      <div className="modal-content document-upload-modal">
        <h2>Загрузить документ</h2>

        <div className="form-group">
          <label>
            <FiType /> Тип документа
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            <option value="ИНН">ИНН</option>
            <option value="ОГРН">ОГРН</option>
            <option value="Выписка из ЕГРЮЛ">Выписка из ЕГРЮЛ</option>
            <option value="Паспорт">Паспорт</option>
            <option value="Доверенность">Доверенность</option>
            <option value="Другое">Другое</option>
          </select>
        </div>

        <div className="form-group file-upload-group">
          <label className="file-upload-label">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <div className="file-upload-box">
              {fileName ? (
                <div className="file-info">
                  <FiFile className="file-icon" />
                  <span className="file-name">{fileName}</span>
                </div>
              ) : (
                <>
                  <FiUpload className="upload-icon" />
                  <span>Выберите файл</span>
                  <span className="file-types">PDF, JPG, PNG, DOC</span>
                </>
              )}
            </div>
          </label>
          <button className="browse-btn">Обзор</button>
        </div>

        <div className="modal-actions">
          <button
            className="cancel-btn"
            onClick={onClose}
            disabled={isUploading}
          >
            Отмена
          </button>
          <button
            className="upload-btn"
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

const DocumentsList = ({
  documents,
  isEditing,
  onDocumentsChange,
  onAddDocument,
}) => {
  const safeDocuments = documents || [];

  const handleRemoveDocument = (id) => {
    onDocumentsChange(safeDocuments.filter((doc) => doc.id !== id));
  };

  return (
    <div className="documents-container">
      {safeDocuments.map((doc) => (
        <div key={doc.id} className="document-item">
          <FiFile className="document-icon" />
          <div className="document-info">
            <div className="document-type">{doc.document_type}</div>
            <div className={`document-status ${doc.status}`}>
              {doc.status === "approved"
                ? "Подтвержден"
                : doc.status === "rejected"
                ? "Отклонен"
                : "На проверке"}
            </div>
            {doc.admin_comment && doc.status === "rejected" && (
              <div className="document-comment">
                <strong>Комментарий администратора:</strong> {doc.admin_comment}
              </div>
            )}
          </div>
          <div className="document-actions">
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="download-btn"
            >
              <FiDownload />
            </a>
            {isEditing && (
              <button
                className="remove-btn"
                onClick={() => handleRemoveDocument(doc.id)}
              >
                <FiTrash2 />
              </button>
            )}
          </div>
        </div>
      ))}

      {isEditing && (
        <button className="add-document-btn" onClick={onAddDocument}>
          <FiPlus /> Добавить документ
        </button>
      )}
    </div>
  );
};

const transformUser = (userData) => {
  if (!userData) return null;

  const availabilityObj = {};

  if (userData.availability) {
    if (Array.isArray(userData.availability)) {
      userData.availability.forEach((item) => {
        const dateValue = item.available_date;
        if (dateValue) {
          const dateStr =
            typeof dateValue === "string"
              ? dateValue.split("T")[0]
              : new Date(dateValue).toISOString().split("T")[0];
          availabilityObj[dateStr] = true;
        }
      });
    } else if (typeof userData.availability === "object") {
      Object.entries(userData.availability).forEach(
        ([dateStr, isAvailable]) => {
          if (isAvailable) {
            availabilityObj[dateStr] = true;
          }
        }
      );
    }
  }

  return {
    ...userData,
    balance: userData.balance || 0,
    skills: userData.skills || [],
    documents: userData.documents || [],
    availability: availabilityObj,
    rating: userData.rating || 0,
    reviews_count: userData.reviews_count || 0,
    company_name: userData.company_name || "",
    rate_per_shift: userData.rate_per_shift || 0,
    experience_months: userData.experience_months || 0,
  };
};

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

        </div>
      </div>
    </div>
  );
};

const ProfilePage = ({ user, onSave, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [allSkills, setAllSkills] = useState([]);
  const [employerJobs, setEmployerJobs] = useState([]);
  const [workerBookings, setWorkerBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [reviews, setReviews] = useState({
    rating: 0,
    reviews_count: 0,
    reviews: [],
  });
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);

  const loadUserReviews = async (userId) => {
    setIsLoadingReviews(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/users/${userId}/reviews`
      );
      setReviews(response.data);
    } catch (error) {
      console.error("Ошибка загрузки отзывов:", error);
      toast.error("Не удалось загрузить отзывы");
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (activeTab === "reviews" && user?.id) {
      loadUserReviews(user.id);
    }
  }, [activeTab, user]);

  const handleAvailabilityToggle = (dateStr) => {
    setEditingProfile((prev) => ({
      ...prev,
      availability: {
        ...prev.availability,
        [dateStr]: !prev.availability[dateStr],
      },
    }));
  };

  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  useEffect(() => {
    if (user) {
      setEditingProfile(transformUser(user));
      setErrors({});
      setAvatarFile(null);
      setAvatarPreview(null);

      if (user.role === "employer") {
        loadEmployerJobs(user.id);
      } else if (user.role === "worker") {
        loadWorkerBookings(user.id);
      }
    }
  }, [user]);

  const loadWithdrawalRequests = async () => {
    setIsLoadingWithdrawals(true);
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/api/users/withdraw`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setWithdrawalRequests(response.data);
    } catch (error) {
      console.error("Ошибка загрузки заявок:", error);
      toast.error("Не удалось загрузить историю выводов");
    } finally {
      setIsLoadingWithdrawals(false);
    }
  };

  useEffect(() => {
    if (activeTab === "withdrawals" && user?.id) {
      loadWithdrawalRequests();
    }
  }, [activeTab, user]);

  const loadEmployerJobs = async (employerId) => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${API_BASE_URL}/api/jobs/employer/${employerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setEmployerJobs(response.data);
    } catch (error) {
      console.error("Ошибка при загрузке вакансий работодателя:", error);
      if (error.response?.status === 401) onLogout();
      setEmployerJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkerBookings = async (workerId) => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${API_BASE_URL}/api/bookings/my-applications/`,
        {
          params: { status: "confirmed" },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setWorkerBookings(response.data);
    } catch (error) {
      console.error("Ошибка при загрузке бронирований работника:", error);
      if (error.response?.status === 401) onLogout();
      setWorkerBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const validateFields = () => {
    const newErrors = {};
    let isValid = true;

    if (!editingProfile.first_name?.trim()) {
      newErrors.first_name = "Имя обязательно для заполнения";
      isValid = false;
    } else if (editingProfile.first_name.length < 2) {
      newErrors.first_name = "Имя должно содержать минимум 2 символа";
      isValid = false;
    }

    if (!editingProfile.last_name?.trim()) {
      newErrors.last_name = "Фамилия обязательна для заполнения";
      isValid = false;
    } else if (editingProfile.last_name.length < 2) {
      newErrors.last_name = "Фамилия должна содержать минимум 2 символа";
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editingProfile.email) {
      newErrors.email = "Email обязателен для заполнения";
      isValid = false;
    } else if (!emailRegex.test(editingProfile.email)) {
      newErrors.email = "Неверный формат email";
      isValid = false;
    }

    if (!editingProfile.birth_date) {
      newErrors.birth_date = "Дата рождения обязательна";
      isValid = false;
    } else {
      const birthDate = new Date(editingProfile.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      if (age < 18) {
        newErrors.birth_date = "Возраст должен быть не менее 18 лет";
        isValid = false;
      }
    }

    if (editingProfile.role === "worker") {
      if (!editingProfile.rate_per_shift) {
        newErrors.rate_per_shift = "Ставка обязательна";
        isValid = false;
      } else if (isNaN(Number(editingProfile.rate_per_shift))) {
        newErrors.rate_per_shift = "Ставка должна быть числом";
        isValid = false;
      } else if (Number(editingProfile.rate_per_shift) <= 0) {
        newErrors.rate_per_shift = "Ставка должна быть положительной";
        isValid = false;
      }

      if (!editingProfile.experience_months) {
        newErrors.experience_months = "Опыт обязателен";
        isValid = false;
      } else if (isNaN(Number(editingProfile.experience_months))) {
        newErrors.experience_months = "Опыт должен быть числом";
        isValid = false;
      } else if (Number(editingProfile.experience_months) < 0) {
        newErrors.experience_months = "Опыт не может быть отрицательным";
        isValid = false;
      }
    }

    if (editingProfile.role === "employer") {
      if (!editingProfile.company_name?.trim()) {
        newErrors.company_name = "Название компании обязательно";
        isValid = false;
      } else if (editingProfile.company_name.length < 2) {
        newErrors.company_name =
          "Название компании должно содержать минимум 2 символа";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/skills`);
        setAllSkills(response.data);
      } catch (error) {
        console.error("Ошибка загрузки навыков:", error);
      }
    };

    if (user?.role === "worker") {
      fetchSkills();
    }
  }, [user]);

  const createNewSkill = async (name) => {
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_BASE_URL}/api/users/skills/create`,
        { name },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setAllSkills((prev) => [...prev, response.data]);
      return response.data;
    } catch (error) {
      console.error("Ошибка создания навыка:", error);
      throw error;
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match("image.*")) {
        alert("Пожалуйста, выберите файл изображения");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("Файл слишком большой. Максимальный размер 5MB");
        return;
      }

      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleSaveClick = async () => {
    if (!onSave || !editingProfile) {
      setIsEditing(false);
      return;
    }

    if (!validateFields()) {
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("token");

      const updateData = {
        first_name: editingProfile.first_name || "",
        last_name: editingProfile.last_name || "",
        email: editingProfile.email || "",
        birth_date: editingProfile.birth_date || "",
      };

      if (editingProfile.role === "worker") {
        updateData.rate_per_shift = Number(editingProfile.rate_per_shift) || 0;
        updateData.experience_months =
          Number(editingProfile.experience_months) || 0;

        updateData.availability = [];
        for (const [date, isAvailable] of Object.entries(
          editingProfile.availability
        )) {
          if (isAvailable) {
            updateData.availability.push(date);
          }
        }

        updateData.skills = editingProfile.skills.map((skill) => skill.id);
      } else if (editingProfile.role === "employer") {
        updateData.company_name = editingProfile.company_name || "";
      }

      const response = await axios.put(
        `${API_BASE_URL}/api/users/${editingProfile.id}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append("avatar", avatarFile);

        await axios.post(
          `${API_BASE_URL}/api/users/${editingProfile.id}/avatar`,
          avatarFormData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      onSave(response.data);
      setIsEditing(false);
      setErrors({});
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("Профиль успешно обновлен!");
    } catch (error) {
      console.error("Ошибка сохранения:", error);

      let errorMessage = "Произошла ошибка при сохранении";
      if (error.response) {
        if (error.response.status === 422) {
          errorMessage = "Ошибка валидации: ";
          if (error.response.data.detail) {
            if (Array.isArray(error.response.data.detail)) {
              errorMessage += error.response.data.detail
                .map((err) => `${err.loc[1]}: ${err.msg}`)
                .join(", ");
            } else {
              errorMessage += error.response.data.detail;
            }
          }
        } else if (error.response.status === 401) {
          errorMessage = "Сессия истекла. Пожалуйста, войдите снова";
          onLogout();
        } else if (error.response.status === 403) {
          errorMessage = "У вас нет прав для этого действия";
        } else if (error.response.status === 413) {
          errorMessage = "Размер файла слишком большой. Максимум 5MB";
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setEditingProfile(transformUser(user));
      setErrors({});
      setAvatarFile(null);
      setAvatarPreview(null);
    }
    setIsEditing(false);
  };

  const handleNumericChange = (field, value) => {
    if (value === "" || /^\d+$/.test(value)) {
      setEditingProfile({
        ...editingProfile,
        [field]: value,
      });
    }
  };

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleVacancyClick = (jobId) => {
    navigate(`/job/${jobId}`);
  };

  const handleUploadDocument = async (documentType, file) => {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/users/${editingProfile.id}/documents`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const newDocument = response.data;
      setEditingProfile((prev) => ({
        ...prev,
        documents: [...prev.documents, newDocument],
      }));

      setEditingProfile((prev) => ({
        ...prev,
        is_verified: false,
      }));

      return newDocument;
    } catch (error) {
      console.error("Ошибка загрузки документа:", error);
      throw error;
    }
  };

  const handleDeleteDocument = async (docId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `${API_BASE_URL}/api/users/${editingProfile.id}/documents/${docId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setEditingProfile((prev) => ({
        ...prev,
        documents: prev.documents.filter((doc) => doc.id !== docId),
      }));

      toast.success("Документ удален");
    } catch (error) {
      console.error("Ошибка удаления документа:", error);
      toast.error("Не удалось удалить документ");
    }
  };

  if (!user || !editingProfile) {
    return (
      <div className="profile-loading">
        <div className="loader"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  const currentProfile = isEditing ? editingProfile : transformUser(user);
  const isAdmin = currentProfile?.role === "admin";

  const formatBalance = (balance) => {
    return safeFormatNumber(balance);
  };

  const getInitials = () => {
    const firstNameChar = currentProfile.first_name?.charAt(0) || "";
    const lastNameChar = currentProfile.last_name?.charAt(0) || "";
    return `${firstNameChar}${lastNameChar}`;
  };

  return (
    <div className="profile-page">
      <div className="profile-banner">
        <div className="profile-avatar">
          <div
            className={`avatar-placeholder ${
              isEditing && !isAdmin ? "editable" : ""
            }`}
            onClick={isEditing && !isAdmin ? handleAvatarClick : undefined}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="avatar-image" />
            ) : currentProfile.avatar_url ? (
              <img
                src={currentProfile.avatar_url}
                alt="Profile"
                className="avatar-image"
              />
            ) : (
              <div className="avatar-initials">{getInitials()}</div>
            )}

            {isEditing && !isAdmin && (
              <div className="avatar-overlay">
                <FiCamera className="camera-icon" />
                <span>Изменить фото</span>
              </div>
            )}
          </div>

          {isEditing && !isAdmin && (
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          )}
        </div>

        <div className="profile-info">
          <h1>
            {currentProfile.first_name || ""} {currentProfile.last_name || ""}
          </h1>
          <div className="profile-meta">
            <span className={`role-badge ${currentProfile.role}`}>
              {isAdmin
                ? "Администратор"
                : currentProfile.role === "worker"
                ? "Сотрудник"
                : "Работодатель"}
            </span>
            {currentProfile.is_verified && (
              <span className="verified-badge">Подтвержден</span>
            )}
            <span className="member-since">
              {currentProfile.created_at
                ? `С ${new Date(currentProfile.created_at).toLocaleDateString(
                    "ru-RU",
                    { month: "long", year: "numeric" }
                  )}`
                : "Дата регистрации неизвестна"}
            </span>
          </div>

          {!isAdmin && (
            <div className="balance-info">
              <span>Баланс: {formatBalance(currentProfile.balance)} ₽</span>
              <button
                className="deposit-btn"
                onClick={() => setIsDepositModalOpen(true)}
              >
                Пополнить
              </button>
              <button
                className="withdraw-btn"
                onClick={() => setIsWithdrawModalOpen(true)}
              >
                Вывести средства
              </button>
            </div>
          )}
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <>
              <button
                className="cancel-btn"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button
                className="save-btn"
                onClick={handleSaveClick}
                disabled={isSaving}
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </>
          ) : (
            <>
              {!isAdmin && (
                <button className="edit-btn" onClick={() => setIsEditing(true)}>
                  Редактировать
                </button>
              )}
              <button className="logout-btn" onClick={onLogout}>
                Выйти
              </button>
            </>
          )}
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          Информация
        </button>

        {isAdmin ? (
          <>
            <button
              className={`tab-btn ${
                activeTab === "admin-stats" ? "active" : ""
              }`}
              onClick={() => setActiveTab("admin-stats")}
            >
              <FiBarChart2 /> Статистика
            </button>
            <button
              className={`tab-btn ${
                activeTab === "admin-jobs" ? "active" : ""
              }`}
              onClick={() => setActiveTab("admin-jobs")}
            >
              <FiFileText /> Вакансии
            </button>
            <button
              className={`tab-btn ${
                activeTab === "admin-users" ? "active" : ""
              }`}
              onClick={() => setActiveTab("admin-users")}
            >
              <FiUser /> Пользователи
            </button>
            <button
              className={`tab-btn ${
                activeTab === "admin-disputes" ? "active" : ""
              }`}
              onClick={() => setActiveTab("admin-disputes")}
            >
              <FiShield /> Диспуты
            </button>
            <button
              className={`tab-btn ${
                activeTab === "admin-docs" ? "active" : ""
              }`}
              onClick={() => setActiveTab("admin-docs")}
            >
              <FiFile /> Документы
            </button>
            <button
              className={`tab-btn ${
                activeTab === "admin-withdrawals" ? "active" : ""
              }`}
              onClick={() => setActiveTab("admin-withdrawals")}
            >
              <FiDollarSign /> Заявки на вывод
            </button>
          </>
        ) : (
          <>
            {currentProfile.role === "worker" && (
              <button
                className={`tab-btn ${
                  activeTab === "availability" ? "active" : ""
                }`}
                onClick={() => setActiveTab("availability")}
              >
                Доступность
              </button>
            )}
            {currentProfile.role === "employer" && (
              <button
                className={`tab-btn ${
                  activeTab === "vacancies" ? "active" : ""
                }`}
                onClick={() => setActiveTab("vacancies")}
              >
                Мои вакансии
              </button>
            )}
          </>
        )}

        {/* Вкладка "Мои выводы" только для обычных пользователей */}
        {!isAdmin && (
          <button
            className={`tab-btn ${activeTab === "withdrawals" ? "active" : ""}`}
            onClick={() => setActiveTab("withdrawals")}
          >
            <FiDollarSign /> Мои выводы
          </button>
        )}

        <button
          className={`tab-btn ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          <FiStar /> Отзывы
        </button>
      </div>

      <div className="profile-content">
        {/* Управление заявками для администратора */}
        {isAdmin && activeTab === "admin-withdrawals" && (
          <AdminWithdrawalsManagement />
        )}
        {isAdmin && (
          <>
            <button
              className={`tab-btn ${
                activeTab === "admin-finance" ? "active" : ""
              }`}
              onClick={() => setActiveTab("admin-finance")}
            >
              <FiDollarSign /> Финансы
            </button>
          </>
        )}

        {/* Просмотр заявок пользователя */}
        {!isAdmin && activeTab === "withdrawals" && (
          <div className="section" title="Мои заявки на вывод">
            {isLoadingWithdrawals ? (
              <div className="loading">
                <div className="loader"></div>
                <p>Загрузка истории выводов...</p>
              </div>
            ) : withdrawalRequests.length > 0 ? (
              <div className="withdrawal-requests">
                <table>
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Сумма</th>
                      <th>Способ</th>
                      <th>Статус</th>
                      <th>Комментарий</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{new Date(request.created_at).toLocaleString()}</td>
                        <td>{request.amount} ₽</td>
                        <td>
                          {request.payment_method === "bank_card" &&
                            "Банковская карта"}
                          {request.payment_method === "sbp" && "СБП"}
                          {request.payment_method === "yoomoney" && "ЮMoney"}
                          {request.payment_method === "qiwi" && "QIWI"}
                          {request.payment_method === "crypto" &&
                            "Криптовалюта"}
                        </td>
                        <td className={`status-${request.status}`}>
                          {request.status === "pending" && "⏳ На рассмотрении"}
                          {request.status === "paid" && "✅ Оплачено"}
                          {request.status === "rejected" && "❌ Отклонено"}
                        </td>
                        <td>{request.admin_comment || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-withdrawals">
                <FiDollarSign className="icon" />
                <p>У вас пока нет заявок на вывод средств</p>
                <button
                  className="create-withdrawal-btn"
                  onClick={() => setIsWithdrawModalOpen(true)}
                >
                  Создать заявку на вывод
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "info" && (
          <>
            <div className="section" title="Основная информация">
              <div className="info-grid">
                <div className="info-item">
                  <label>Имя</label>
                  {isEditing && !isAdmin ? (
                    <div>
                      <input
                        type="text"
                        value={editingProfile.first_name || ""}
                        onChange={(e) =>
                          setEditingProfile({
                            ...editingProfile,
                            first_name: e.target.value,
                          })
                        }
                        className={errors.first_name ? "error-input" : ""}
                      />
                      {errors.first_name && (
                        <div className="error-message">{errors.first_name}</div>
                      )}
                    </div>
                  ) : (
                    <p>{currentProfile.first_name || "Не указано"}</p>
                  )}
                </div>

                <div className="info-item">
                  <label>Фамилия</label>
                  {isEditing && !isAdmin ? (
                    <div>
                      <input
                        type="text"
                        value={editingProfile.last_name || ""}
                        onChange={(e) =>
                          setEditingProfile({
                            ...editingProfile,
                            last_name: e.target.value,
                          })
                        }
                        className={errors.last_name ? "error-input" : ""}
                      />
                      {errors.last_name && (
                        <div className="error-message">{errors.last_name}</div>
                      )}
                    </div>
                  ) : (
                    <p>{currentProfile.last_name || "Не указано"}</p>
                  )}
                </div>

                <div className="info-item">
                  <label>Телефон</label>
                  <p>{currentProfile.phone || "Не указан"}</p>
                </div>

                <div className="info-item">
                  <label>Email</label>
                  {isEditing && !isAdmin ? (
                    <div>
                      <input
                        type="email"
                        value={editingProfile.email || ""}
                        onChange={(e) =>
                          setEditingProfile({
                            ...editingProfile,
                            email: e.target.value,
                          })
                        }
                        className={errors.email ? "error-input" : ""}
                      />
                      {errors.email && (
                        <div className="error-message">{errors.email}</div>
                      )}
                    </div>
                  ) : (
                    <p>{currentProfile.email || "Не указан"}</p>
                  )}
                </div>

                <div className="info-item">
                  <label>Дата рождения</label>
                  {isEditing && !isAdmin ? (
                    <div>
                      <input
                        type="date"
                        value={editingProfile.birth_date || ""}
                        onChange={(e) =>
                          setEditingProfile({
                            ...editingProfile,
                            birth_date: e.target.value,
                          })
                        }
                        max={new Date().toISOString().split("T")[0]}
                        className={errors.birth_date ? "error-input" : ""}
                      />
                      {errors.birth_date && (
                        <div className="error-message">{errors.birth_date}</div>
                      )}
                    </div>
                  ) : (
                    <p>
                      {currentProfile.birth_date
                        ? new Date(
                            currentProfile.birth_date
                          ).toLocaleDateString("ru-RU")
                        : "Не указана"}
                    </p>
                  )}
                </div>

                {!isAdmin && currentProfile.role === "worker" && (
                  <>
                    <div className="info-item">
                      <label>Ставка за смену</label>
                      {isEditing ? (
                        <div>
                          <input
                            type="text"
                            value={editingProfile.rate_per_shift || ""}
                            onChange={(e) =>
                              handleNumericChange(
                                "rate_per_shift",
                                e.target.value
                              )
                            }
                            className={
                              errors.rate_per_shift ? "error-input" : ""
                            }
                          />
                          {errors.rate_per_shift && (
                            <div className="error-message">
                              {errors.rate_per_shift}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p>
                          {safeFormatNumber(currentProfile.rate_per_shift)} ₽
                        </p>
                      )}
                    </div>

                    <div className="info-item">
                      <label>Опыт работы (месяцев)</label>
                      {isEditing ? (
                        <div>
                          <input
                            type="text"
                            value={editingProfile.experience_months || ""}
                            onChange={(e) =>
                              handleNumericChange(
                                "experience_months",
                                e.target.value
                              )
                            }
                            className={
                              errors.experience_months ? "error-input" : ""
                            }
                          />
                          {errors.experience_months && (
                            <div className="error-message">
                              {errors.experience_months}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p>
                          {currentProfile.experience_months
                            ? `${Math.floor(
                                currentProfile.experience_months / 12
                              )} лет ${
                                currentProfile.experience_months % 12
                              } месяцев`
                            : "Без опыта"}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {!isAdmin && currentProfile.role === "employer" && (
                  <div className="info-item full-width">
                    <label>Название компании</label>
                    {isEditing ? (
                      <div>
                        <input
                          type="text"
                          value={editingProfile.company_name || ""}
                          onChange={(e) =>
                            setEditingProfile({
                              ...editingProfile,
                              company_name: e.target.value,
                            })
                          }
                          className={errors.company_name ? "error-input" : ""}
                        />
                        {errors.company_name && (
                          <div className="error-message">
                            {errors.company_name}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p>{currentProfile.company_name || "Не указано"}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!isAdmin && (
              <>
                <div
                  className="section"
                  title={
                    currentProfile.role === "worker" ? "Навыки" : "Документы"
                  }
                >
                  {currentProfile.role === "worker" ? (
                    <SkillsList
                      skills={
                        isEditing
                          ? editingProfile.skills
                          : currentProfile.skills
                      }
                      isEditing={isEditing}
                      onSkillsChange={(newSkills) =>
                        setEditingProfile({
                          ...editingProfile,
                          skills: newSkills,
                        })
                      }
                      allSkills={allSkills}
                      onCreateSkill={createNewSkill}
                    />
                  ) : (
                    <DocumentsList
                      documents={
                        isEditing
                          ? editingProfile.documents
                          : currentProfile.documents
                      }
                      isEditing={isEditing}
                      onDocumentsChange={(newDocs) =>
                        setEditingProfile({
                          ...editingProfile,
                          documents: newDocs,
                        })
                      }
                      onAddDocument={() => setIsDocumentModalOpen(true)}
                    />
                  )}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "availability" &&
          currentProfile.role === "worker" &&
          !isAdmin && (
            <div className="section" title="Мой график доступности">
              <AvailabilityCalendar
                availability={editingProfile?.availability || {}}
                onDayClick={handleAvailabilityToggle}
                isEditing={true}
                user={user}
              />
            </div>
          )}

        {activeTab === "vacancies" && !isAdmin && (
          <div
            className="section"
            title={
              currentProfile.role === "worker"
                ? "Активные вакансии"
                : "Мои вакансии"
            }
          >
            {isLoading ? (
              <div className="loading-vacancies">
                <p>Загрузка данных...</p>
              </div>
            ) : currentProfile.role === "employer" ? (
              employerJobs.length > 0 ? (
                <div className="vacancies-list">
                  {employerJobs.map((job) => (
                    <div
                      key={job.id}
                      className="vacancy-container"
                      onClick={() => handleVacancyClick(job.id)}
                    >
                      <VacancyCards
                        vacancy={{
                          ...job,
                          rate: job.rate || 0,
                          startTime: job.start_time,
                          endTime: job.end_time,
                          company_name: job.company_name,
                          remaining_slots: job.remaining_slots || 0,
                        }}
                        role={currentProfile.role}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-vacancies">
                  <p>Вы еще не создали ни одной вакансии</p>
                  <button
                    className="create-vacancy-btn"
                    onClick={() => navigate("/create-vacancy")}
                  >
                    Создать вакансию
                  </button>
                </div>
              )
            ) : workerBookings.length > 0 ? (
              <div className="vacancies-list">
                {workerBookings.map((booking) => (
                  <div
                    key={booking.job.id}
                    className="vacancy-container"
                    onClick={() => handleVacancyClick(booking.job.id)}
                  >
                    <VacancyCards
                      vacancy={{
                        ...booking.job,
                        rate: booking.job.rate || 0,
                        startTime: booking.job.start_time,
                        endTime: booking.job.end_time,
                        company_name: booking.job.company_name,
                        remaining_slots: booking.job.remaining_slots || 0,
                      }}
                      role={currentProfile.role}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-vacancies">
                <p>У вас пока нет активных вакансий</p>
                <button
                  className="create-vacancy-btn"
                  onClick={() => navigate("/feed")}
                >
                  Найти вакансии
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="section" title="Отзывы">
            <div className="reviews-summary">
              <div className="rating-value">{reviews.rating.toFixed(1)}</div>
              <div className="stars">
                {"★".repeat(Math.floor(reviews.rating))}
                {"☆".repeat(5 - Math.floor(reviews.rating))}
              </div>
              <div className="reviews-count">
                {reviews.reviews_count} отзывов
              </div>
            </div>

            {isLoadingReviews ? (
              <div className="loading-reviews">
                <div className="loader"></div>
                <p>Загрузка отзывов...</p>
              </div>
            ) : reviews.reviews.length > 0 ? (
              <div className="reviews-list">
                {reviews.reviews.map((review) => (
                  <div key={review.id} className="review-card">
                    <div className="review-header">
                      <div className="review-author">{review.author}</div>
                      <div className="review-rating">
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </div>
                      <div className="review-date">
                        {new Date(review.created_at).toLocaleDateString(
                          "ru-RU"
                        )}
                      </div>
                    </div>
                    {review.comment && (
                      <div className="review-comment">{review.comment}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-reviews">
                <FiStar className="no-reviews-icon" />
                <p>Пока нет отзывов</p>
              </div>
            )}
          </div>
        )}

        {isAdmin && activeTab === "admin-stats" && <PlatformStatistics />}

        {isAdmin && activeTab === "admin-jobs" && <AdminJobsModeration />}

        {isAdmin && activeTab === "admin-disputes" && (
          <AdminDisputesManagement />
        )}
        {isAdmin && activeTab === "admin-finance" && <FinanceHistory />}

        {isAdmin && activeTab === "admin-users" && <AdminUsersManagement />}

        {isAdmin && activeTab === "admin-docs" && <AdminDocumentsModeration />}
      </div>

      <DocumentUploadModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        onUpload={handleUploadDocument}
      />

      {isWithdrawModalOpen && (
        <WithdrawModal
          user={user}
          onClose={() => setIsWithdrawModalOpen(false)}
          onWithdrawSuccess={loadWithdrawalRequests}
        />
      )}

      {isDepositModalOpen && (
        <BalanceDepositModal
          user={user}
          updateUser={onSave}
          onClose={() => setIsDepositModalOpen(false)}
          onDepositSuccess={() => {
            toast.success("Баланс успешно пополнен!");
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;