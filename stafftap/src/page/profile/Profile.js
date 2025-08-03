import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiPlus,
  FiStar,
  FiBriefcase,
  FiShield,
  FiUsers,
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
  FiFile,
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
import styles from "./ProfilePage.module.css";
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
import DocumentsList from "../../components/DocumentsSection/DocumentsList";
import DocumentUploadModal from "../../components/DocumentsSection/DocumentUploadModal";

const safeFormatNumber = (value, defaultValue = 0) => {
  const num = Number(value);
  return isNaN(num)
    ? defaultValue.toLocaleString("ru-RU")
    : num.toLocaleString("ru-RU");
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

const BalanceDepositModal = ({
  user,
  updateUser,
  onClose,
  onDepositSuccess,
}) => {
  const [amount, setAmount] = useState(100);
  const [commission, setCommission] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [testCardInfo, setTestCardInfo] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const location = useLocation();

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
              Authorization: `Bearer ${token}`,
            },
          }
        );

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

  const safeToFixed = (value, decimals = 2) => {
    const num = parseFloat(value);
    return isNaN(num) ? "0.00" : num.toFixed(decimals);
  };

  const handleDeposit = async () => {
    if (amount < 10) {
      setError("Минимальная сумма пополнения - 10 рублей");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    setTestCardInfo(false);
    const getAuthToken = () => {
      return localStorage.getItem("token");
    };
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_BASE_URL}/api/payments/deposit`,
        { amount },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPaymentUrl(response.data.confirmation_url);
      setTestCardInfo(true);

      const paymentWindow = window.open(
        response.data.confirmation_url,
        "_blank",
        "width=600,height=800"
      );

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
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const paymentData = statusResponse.data;

          if (paymentData.status === "succeeded") {
            clearInterval(checkInterval);
            paymentWindow.close();

            const safeAmount = paymentData.amount || 0;
            const safeCommission = paymentData.commission || 0;

            setSuccessMessage(
              `Платеж на сумму ${safeAmount.toFixed(
                2
              )} руб. (комиссия: ${safeCommission.toFixed(
                2
              )} руб.) успешно завершен!`
            );

            const userResponse = await axios.get(
              `${API_BASE_URL}/api/users/me`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
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

  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

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

    // Проверки для работника (только если не админ)
    if (editingProfile.role === "worker" && !isAdmin) {
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

    // Проверки для работодателя (только если не админ)
    if (editingProfile.role === "employer" && !isAdmin) {
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
        const response = await axios.get(`${API_BASE_URL}/api/skills/`);
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
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Недопустимый формат файла. Разрешены: JPG, PNG, WEBP');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимальный размер 5MB');
      return;
    }

    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
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

      // Для работника (не админа)
      if (editingProfile.role === "worker" && !isAdmin) {
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
      } 
      // Для работодателя (не админа)
      else if (editingProfile.role === "employer" && !isAdmin) {
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
        avatarFormData.append("file", avatarFile);

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
      <div className={styles.profileLoading}>
        <div className={styles.loader}></div>
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
    <div className={styles.profilePage}>
      <div className={styles.profileBanner}>
        <div className={styles.profileAvatar}>
          <div
            className={`${styles.avatarPlaceholder} ${
              isEditing ? styles.editable : ""
            }`}
            onClick={isEditing ? handleAvatarClick : undefined}
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Preview"
                className={styles.avatarImage}
              />
            ) : currentProfile.avatar_url ? (
              <img
                src={`${currentProfile.avatar_url}?t=${Date.now()}`}
                alt="Profile"
                className={styles.avatarImage}
              />
            ) : (
              <div className={styles.avatarInitials}>{getInitials()}</div>
            )}

            {isEditing && (
              <div className={styles.avatarOverlay}>
                <FiCamera className={styles.cameraIcon} />
                <span>Изменить фото</span>
              </div>
            )}
          </div>

          {isEditing && (
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          )}
        </div>

        <div className={styles.profileInfo}>
          <h1>
            {currentProfile.first_name || ""} {currentProfile.last_name || ""}
          </h1>
          <div className={styles.profileMeta}>
            <span
              className={`${styles.roleBadge} ${styles[currentProfile.role]}`}
            >
              {isAdmin
                ? "Администратор"
                : currentProfile.role === "worker"
                ? "Сотрудник"
                : "Работодатель"}
            </span>
            {currentProfile.is_verified && (
              <span className={styles.verifiedBadge}>Подтвержден</span>
            )}
            <span className={styles.memberSince}>
              {currentProfile.created_at
                ? `Дата регистрации: с ${new Date(
                    currentProfile.created_at
                  ).toLocaleDateString("ru-RU", {
                    month: "long",
                    year: "numeric",
                  })}`
                : "Дата регистрации неизвестна"}
            </span>
          </div>

          {!isAdmin && (
            <div className={styles.balanceInfo}>
              <span>Баланс: {formatBalance(currentProfile.balance)} ₽</span>
              <button
                className={styles.depositBtn}
                onClick={() => setIsDepositModalOpen(true)}
              >
                Пополнить
              </button>
              <button
                className={styles.withdrawBtn}
                onClick={() => setIsWithdrawModalOpen(true)}
              >
                Вывести средства
              </button>
            </div>
          )}
        </div>

        <div className={styles.profileActions}>
          {isEditing ? (
            <>
              <button
                className={styles.cancelBtn}
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSaveClick}
                disabled={isSaving}
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.editBtn}
                onClick={() => setIsEditing(true)}
              >
                Редактировать
              </button>

              <button className={styles.logoutBtn} onClick={onLogout}>
                Выйти
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.profileTabs}>
        <button
          className={`${styles.tabBtn} ${
            activeTab === "info" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("info")}
        >
          Информация
        </button>

        {isAdmin ? (
          <>
            <button
              className={`${styles.tabBtn} ${
                activeTab === "admin-stats" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("admin-stats")}
            >
              <FiBarChart2 /> Статистика
            </button>
            <button
              className={`${styles.tabBtn} ${
                activeTab === "admin-jobs" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("admin-jobs")}
            >
              <FiFileText /> Вакансии
            </button>
            <button
              className={`${styles.tabBtn} ${
                activeTab === "admin-users" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("admin-users")}
            >
              <FiUser /> Пользователи
            </button>
            <button
              className={`${styles.tabBtn} ${
                activeTab === "admin-disputes" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("admin-disputes")}
            >
              <FiShield /> Диспуты
            </button>
            <button
              className={`${styles.tabBtn} ${
                activeTab === "admin-docs" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("admin-docs")}
            >
              <FiFile /> Документы
            </button>
            <button
              className={`${styles.tabBtn} ${
                activeTab === "admin-withdrawals" ? styles.active : ""
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
                className={`${styles.tabBtn} ${
                  activeTab === "availability" ? styles.active : ""
                }`}
                onClick={() => setActiveTab("availability")}
              >
                Доступность
              </button>
            )}
            {currentProfile.role === "employer" && (
              <button
                className={`${styles.tabBtn} ${
                  activeTab === "vacancies" ? styles.active : ""
                }`}
                onClick={() => setActiveTab("vacancies")}
              >
                Мои вакансии
              </button>
            )}
          </>
        )}

        {!isAdmin && (
          <button
            className={`${styles.tabBtn} ${
              activeTab === "withdrawals" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("withdrawals")}
          >
            <FiDollarSign /> Мои выводы
          </button>
        )}

        <button
          className={`${styles.tabBtn} ${
            activeTab === "reviews" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("reviews")}
        >
          <FiStar /> Отзывы
        </button>
      </div>

      <div className={styles.profileContent}>
        {isAdmin && activeTab === "admin-withdrawals" && (
          <AdminWithdrawalsManagement />
        )}

        {!isAdmin && activeTab === "withdrawals" && (
          <div className={styles.section} title="Мои заявки на вывод">
            {isLoadingWithdrawals ? (
              <div className={styles.loading}>
                <div className={styles.loader}></div>
                <p>Загрузка истории выводов...</p>
              </div>
            ) : withdrawalRequests.length > 0 ? (
              <div className={styles.withdrawalRequests}>
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
                        <td
                          className={`${styles.status} ${
                            styles[`status-${request.status}`]
                          }`}
                        >
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
              <div className={styles.noWithdrawals}>
                <FiDollarSign className={styles.icon} />
                <p>У вас пока нет заявок на вывод средств</p>
                <button
                  className={styles.createWithdrawalBtn}
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
            <div className={styles.section} title="Основная информация">
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Имя</label>
                  {isEditing ? (
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
                        className={errors.first_name ? styles.errorInput : ""}
                      />
                      {errors.first_name && (
                        <div className={styles.errorMessage}>
                          {errors.first_name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>{currentProfile.first_name || "Не указано"}</p>
                  )}
                </div>

                <div className={styles.infoItem}>
                  <label>Фамилия</label>
                  {isEditing ? (
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
                        className={errors.last_name ? styles.errorInput : ""}
                      />
                      {errors.last_name && (
                        <div className={styles.errorMessage}>
                          {errors.last_name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>{currentProfile.last_name || "Не указано"}</p>
                  )}
                </div>

                <div className={styles.infoItem}>
                  <label>Телефон</label>
                  <p>{currentProfile.phone || "Не указан"}</p>
                </div>

                <div className={styles.infoItem}>
                  <label>Email</label>
                  {isEditing ? (
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
                        className={errors.email ? styles.errorInput : ""}
                      />
                      {errors.email && (
                        <div className={styles.errorMessage}>
                          {errors.email}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>{currentProfile.email || "Не указан"}</p>
                  )}
                </div>

                <div className={styles.infoItem}>
                  <label>Дата рождения</label>
                  {isEditing ? (
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
                        className={errors.birth_date ? styles.errorInput : ""}
                      />
                      {errors.birth_date && (
                        <div className={styles.errorMessage}>
                          {errors.birth_date}
                        </div>
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
                    <div className={styles.infoItem}>
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
                              errors.rate_per_shift ? styles.errorInput : ""
                            }
                          />
                          {errors.rate_per_shift && (
                            <div className={styles.errorMessage}>
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

                    <div className={styles.infoItem}>
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
                              errors.experience_months ? styles.errorInput : ""
                            }
                          />
                          {errors.experience_months && (
                            <div className={styles.errorMessage}>
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
                  <div className={`${styles.infoItem} ${styles.fullWidth}`}>
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
                          className={
                            errors.company_name ? styles.errorInput : ""
                          }
                        />
                        {errors.company_name && (
                          <div className={styles.errorMessage}>
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
                  className={styles.section}
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
                      onDeleteDocument={handleDeleteDocument}
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
            <div className={styles.section} title="Мой график доступности">
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
            className={styles.section}
            title={
              currentProfile.role === "worker"
                ? "Активные вакансии"
                : "Мои вакансии"
            }
          >
            {isLoading ? (
              <div className={styles.loadingVacancies}>
                <p>Загрузка данных...</p>
              </div>
            ) : currentProfile.role === "employer" ? (
              employerJobs.length > 0 ? (
                <div className={styles.vacanciesList}>
                  {employerJobs.map((job) => (
                    <div
                      key={job.id}
                      className={styles.vacancyContainer}
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
                <div className={styles.noVacancies}>
                  <p>Вы еще не создали ни одной вакансии</p>
                  <button
                    className={styles.createVacancyBtn}
                    onClick={() => navigate("/create-vacancy")}
                  >
                    Создать вакансию
                  </button>
                </div>
              )
            ) : workerBookings.length > 0 ? (
              <div className={styles.vacanciesList}>
                {workerBookings.map((booking) => (
                  <div
                    key={booking.job.id}
                    className={styles.vacancyContainer}
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
              <div className={styles.noVacancies}>
                <p>У вас пока нет активных вакансий</p>
                <button
                  className={styles.createVacancyBtn}
                  onClick={() => navigate("/feed")}
                >
                  Найти вакансии
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className={styles.section} title="Отзывы">
            <div className={styles.reviewsSummary}>
              <div className={styles.ratingValue}>
                {reviews.rating.toFixed(1)}
              </div>
              <div className={styles.stars}>
                {"★".repeat(Math.floor(reviews.rating))}
                {"☆".repeat(5 - Math.floor(reviews.rating))}
              </div>
              <div className={styles.reviewsCount}>
                {reviews.reviews_count} отзывов
              </div>
            </div>

            {isLoadingReviews ? (
              <div className={styles.loadingReviews}>
                <div className={styles.loader}></div>
                <p>Загрузка отзывов...</p>
              </div>
            ) : reviews.reviews.length > 0 ? (
              <div className={styles.reviewsList}>
                {reviews.reviews.map((review) => (
                  <div key={review.id} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewAuthor}>{review.author}</div>
                      <div className={styles.reviewRating}>
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </div>
                      <div className={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString(
                          "ru-RU"
                        )}
                      </div>
                    </div>
                    {review.comment && (
                      <div className={styles.reviewComment}>
                        {review.comment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noReviews}>
                <FiStar className={styles.noReviewsIcon} />
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