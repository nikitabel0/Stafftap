import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiPlus,
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

const PlatformStatistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/admin/statistics`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setStats(response.data);
      } catch (err) {
        setError("Ошибка загрузки статистики");
        console.error("Ошибка загрузки статистики:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="platform-statistics">
        <h2>Статистика платформы</h2>
        <div className="stats-loading">
          <div className="loader-spinner"></div>
          <p>Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="platform-statistics">
        <h2>Статистика платформы</h2>
        <div className="stats-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Повторить</button>
        </div>
      </div>
    );
  }

  
  const COLORS = ["#2C8161", "#3DA05E", "#56BD66", "#76D192"];
  const ROLE_COLORS = ["#2C8161", "#3498DB", "#9B59B6"];

  
  const roleData = [
    { name: "Админы", value: stats.admins, icon: <FiUser /> },
    { name: "Работодатели", value: stats.employers, icon: <FiBriefcase /> },
    { name: "Сотрудники", value: stats.workers, icon: <FiShield /> },
  ];

  
  const formatRegistrationData = () => {
    return stats.user_registrations.map((item) => ({
      ...item,
      
      formattedDate: new Date(item.date).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      }),
    }));
  };

  const registrationData = formatRegistrationData();

  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          <p className="tooltip-value">
            <span
              className="color-indicator"
              style={{ backgroundColor: payload[0].color }}
            ></span>
            {payload[0].name}: <strong>{payload[0].value}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="platform-statistics">
      <h2>Статистика платформы</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FiUsers />
          </div>
          <div className="stat-value">{stats.total_users}</div>
          <div className="stat-label">Всего пользователей</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FiBarChart2 />
          </div>
          <div className="stat-value">{stats.active_jobs}</div>
          <div className="stat-label">Активных вакансий</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FiCheckCircle />
          </div>
          <div className="stat-value">{stats.completed_jobs}</div>
          <div className="stat-label">Завершенных смен</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FiFileText />
          </div>
          <div className="stat-value">{stats.pending_documents}</div>
          <div className="stat-label">Документов на проверке</div>
        </div>
      </div>

      <div className="stats-charts">
        <div className="chart-container">
          <h3>Регистрации пользователей (последние 7 дней)</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={registrationData}
                margin={{ top: 20, right: 30, left: 20, bottom: 15 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="formattedDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#666", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#666", fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(44, 129, 97, 0.1)" }}
                />
                <Bar
                  dataKey="count"
                  name="Регистраций"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                >
                  {registrationData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-container">
          <h3>Распределение пользователей по ролям</h3>
          <div className="chart-wrapper">
            <div className="role-distribution">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    label={renderCustomizedLabel}
                    labelLine={false}
                  >
                    {roleData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ROLE_COLORS[index % ROLE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [value, "пользователей"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #eee",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={12}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{
                      paddingLeft: "20px",
                      fontSize: "14px",
                    }}
                    formatter={(value, entry, index) => (
                      <span className="legend-item">
                        {roleData[index].icon}
                        {value}: {roleData[index].value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const AdminJobsModeration = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/admin/jobs/moderation`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setJobs(response.data);
      } catch (err) {
        setError("Ошибка загрузки вакансий");
        console.error("Ошибка загрузки вакансий:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleStatusChange = async (jobId, status) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/api/admin/jobs/${jobId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setJobs(jobs.filter((job) => job.id !== jobId));
    } catch (err) {
      console.error("Ошибка изменения статуса:", err);
      setError("Не удалось изменить статус");
    }
  };

  if (loading) {
    return <div className="admin-loading">Загрузка вакансий...</div>;
  }

  if (error) {
    return <div className="admin-error">{error}</div>;
  }

  return (
    <div className="admin-jobs-moderation">
      <h2>Вакансии на модерации</h2>

      {jobs.length === 0 ? (
        <div className="no-jobs">
          <p>Нет вакансий для модерации</p>
        </div>
      ) : (
        <div className="jobs-list">
          {jobs.map((job) => (
            <div key={job.id} className="moderation-job-card">
              <div className="job-header">
                <h3>{job.title}</h3>
                <span className="company">{job.company_name}</span>
              </div>

              <div className="job-details">
                <div className="detail">
                  <strong>Описание:</strong>
                  <p>{job.description}</p>
                </div>

                <div className="detail-row">
                  <div className="detail">
                    <strong>Дата:</strong>
                    <span>
                      {new Date(job.work_date).toLocaleDateString("ru-RU")}
                    </span>
                  </div>

                  <div className="detail">
                    <strong>Время:</strong>
                    <span>
                      {job.start_time} - {job.end_time}
                    </span>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail">
                    <strong>Ставка:</strong>
                    <span>{job.rate} ₽</span>
                  </div>

                  <div className="detail">
                    <strong>Требуемый навык:</strong>
                    <span>{job.required_skill_name}</span>
                  </div>
                </div>

                <div className="detail">
                  <strong>Адрес:</strong>
                  <span>{job.address}</span>
                </div>
              </div>

              <div className="job-actions">
                <button
                  className="approve-btn"
                  onClick={() => handleStatusChange(job.id, "active")}
                >
                  <FiCheckCircle /> Одобрить
                </button>
                <button
                  className="reject-btn"
                  onClick={() => handleStatusChange(job.id, "rejected")}
                >
                  <FiXCircle /> Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const AdminUsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    role: "all",
    verified: "all",
    status: "all",
    sort: "newest",
  });

  const pageSize = 10;
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const shouldRestoreFocusRef = useRef(false);

  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      
      const params = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { search: searchTerm }),
        ...(filters.role !== "all" && { role: filters.role }),
        ...(filters.verified !== "all" && {
          is_verified: filters.verified === "verified",
        }),
        ...(filters.status !== "all" && {
          is_blocked: filters.status === "blocked",
        }),
        sort: filters.sort,
      };

      const response = await axios.get(`${API_BASE_URL}/api/admin/users`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsers(response.data.users || []);
      setTotalPages(response.data.total_pages || 1);
      setError(null);
    } catch (err) {
      setError("Ошибка загрузки пользователей");
      console.error("Ошибка загрузки пользователей:", err);
    } finally {
      setLoading(false);

      
      if (shouldRestoreFocusRef.current && searchInputRef.current) {
        searchInputRef.current.focus();
        shouldRestoreFocusRef.current = false;
      }
    }
  };

  
  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters]);

  
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    shouldRestoreFocusRef.current = true;

    
    searchTimeoutRef.current = setTimeout(() => {
      if (searchTerm.length === 0 || searchTerm.length > 2) {
        setCurrentPage(1);
        fetchUsers();
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      role: "all",
      verified: "all",
      status: "all",
      sort: "newest",
    });
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleBlockToggle = async (userId, isBlocked) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/api/admin/users/${userId}/block`,
        { is_blocked: !isBlocked },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchUsers();
    } catch (err) {
      console.error("Ошибка изменения статуса блокировки:", err);
      setError("Не удалось изменить статус блокировки");
    }
  };

  const handleVerifyToggle = async (userId, isVerified) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/api/admin/users/${userId}/verify`,
        { is_verified: !isVerified },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchUsers();
    } catch (err) {
      console.error("Ошибка изменения статуса верификации:", err);
      setError("Не удалось изменить статус верификации");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE_URL}/api/admin/users/${userId}/role`,
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchUsers();
    } catch (err) {
      console.error("Ошибка изменения роли:", err);
      setError("Не удалось изменить роль пользователя");
    }
  };

  
  return (
    <div className="admin-users-management">
      <div className="admin-section-header">
        <h2>Управление пользователями</h2>
        <div className="admin-filters-summary">
          {filters.role !== "all" && (
            <span className="filter-tag">
              Роль:{" "}
              {filters.role === "worker"
                ? "Сотрудники"
                : filters.role === "employer"
                ? "Работодатели"
                : "Администраторы"}
            </span>
          )}
          {filters.verified !== "all" && (
            <span className="filter-tag">
              Верификация:{" "}
              {filters.verified === "verified"
                ? "Подтвержденные"
                : "Неподтвержденные"}
            </span>
          )}
          {filters.status !== "all" && (
            <span className="filter-tag">
              Статус:{" "}
              {filters.status === "active" ? "Активные" : "Заблокированные"}
            </span>
          )}
          {(filters.role !== "all" ||
            filters.verified !== "all" ||
            filters.status !== "all") && (
            <button className="reset-filters-btn" onClick={resetFilters}>
              <FiRefreshCw /> Сбросить фильтры
            </button>
          )}
        </div>
      </div>

      <div className="admin-controls">
        <div className="admin-search">
          <FiSearch className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Поиск по email, имени или компании..."
            value={searchTerm}
            onChange={handleSearch}
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
            >
              &times;
            </button>
          )}
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Роль:</label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange("role", e.target.value)}
            >
              <option value="all">Все роли</option>
              <option value="worker">Сотрудники</option>
              <option value="employer">Работодатели</option>
              <option value="admin">Администраторы</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Верификация:</label>
            <select
              value={filters.verified}
              onChange={(e) => handleFilterChange("verified", e.target.value)}
            >
              <option value="all">Все</option>
              <option value="verified">Подтвержденные</option>
              <option value="unverified">Неподтвержденные</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Статус:</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="all">Все</option>
              <option value="active">Активные</option>
              <option value="blocked">Заблокированные</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Сортировка:</label>
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange("sort", e.target.value)}
            >
              <option value="newest">Сначала новые</option>
              <option value="oldest">Сначала старые</option>
              <option value="name_asc">По имени (А-Я)</option>
              <option value="name_desc">По имени (Я-А)</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loader-overlay">
          <div className="loader-spinner"></div>
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Пользователь</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={user.is_blocked ? "blocked" : ""}>
                <td>{user.id}</td>
                <td>
                  <div className="user-info-cell">
                    <div className="user-avatar">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="Avatar" />
                      ) : (
                        <div className="avatar-initials">
                          {user.first_name?.[0]}
                          {user.last_name?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="user-details">
                      <div className="user-name">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="user-company">
                        {user.company_name || "Без компании"}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className={`role-select ${user.role}`}
                  >
                    <option value="worker">Сотрудник</option>
                    <option value="employer">Работодатель</option>
                    <option value="admin">Администратор</option>
                  </select>
                </td>
                <td>
                  <div className="status-indicators">
                    <span
                      className={`status-badge ${
                        user.is_verified ? "verified" : "not-verified"
                      }`}
                    >
                      {user.is_verified ? (
                        <>
                          <FiCheck className="verified-icon" /> Подтвержден
                        </>
                      ) : (
                        "Неподтвержден"
                      )}
                    </span>
                    <span
                      className={`status-badge ${
                        user.is_blocked ? "blocked" : "active"
                      }`}
                    >
                      {user.is_blocked ? (
                        <>
                          <FiLock className="blocked-icon" /> Заблокирован
                        </>
                      ) : (
                        <>
                          <FiUnlock className="active-icon" /> Активен
                        </>
                      )}
                    </span>
                  </div>
                </td>
                <td className="actions">
                  <button
                    className={`action-btn ${
                      user.is_verified ? "unverify" : "verify"
                    }`}
                    onClick={() =>
                      handleVerifyToggle(user.id, user.is_verified)
                    }
                  >
                    {user.is_verified ? <FiX /> : <FiCheck />}
                    {user.is_verified
                      ? " Снять верификацию"
                      : " Верифицировать"}
                  </button>
                  <button
                    className={`action-btn ${
                      user.is_blocked ? "unblock" : "block"
                    }`}
                    onClick={() => handleBlockToggle(user.id, user.is_blocked)}
                  >
                    {user.is_blocked ? <FiUnlock /> : <FiLock />}
                    {user.is_blocked ? " Разблокировать" : " Заблокировать"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && !loading && (
        <div className="no-results">
          <FiSearch className="no-results-icon" />
          <p>Пользователи не найдены</p>
          <button className="reset-filters-btn" onClick={resetFilters}>
            Сбросить фильтры
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn prev-next"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Назад
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let page;
            if (totalPages <= 5) {
              page = i + 1;
            } else if (currentPage <= 3) {
              page = i + 1;
            } else if (currentPage >= totalPages - 2) {
              page = totalPages - 4 + i;
            } else {
              page = currentPage - 2 + i;
            }

            return (
              <button
                key={page}
                className={`page-btn ${currentPage === page ? "active" : ""}`}
                onClick={() => handlePageChange(page)}
                disabled={currentPage === page}
              >
                {page}
              </button>
            );
          })}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <span className="page-dots">...</span>
          )}

          {totalPages > 5 && currentPage < totalPages - 1 && (
            <button
              className={`page-btn ${
                currentPage === totalPages ? "active" : ""
              }`}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              {totalPages}
            </button>
          )}

          <button
            className="page-btn prev-next"
            onClick={() =>
              handlePageChange(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
          >
            Вперед
          </button>
        </div>
      )}

      {error && (
        <div className="admin-error-message">
          {error}
          <button onClick={fetchUsers}>Повторить попытку</button>
        </div>
      )}
    </div>
  );
};


const AdminDocumentsModeration = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [currentDocumentId, setCurrentDocumentId] = useState(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/admin/documents/pending`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setDocuments(response.data);
      } catch (err) {
        setError("Ошибка загрузки документов");
        console.error("Ошибка загрузки документов:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleStatusChange = async (docId, status, comment = "") => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/admin/documents/${docId}/review`,
        { status, comment },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setDocuments(documents.filter((doc) => doc.id !== docId));
      setCurrentDocumentId(null);
      setReviewComment("");
      toast.success(
        `Документ ${status === "approved" ? "одобрен" : "отклонен"}`
      );
    } catch (err) {
      console.error("Ошибка изменения статуса документа:", err);
      setError("Не удалось изменить статус");
      toast.error("Ошибка при обновлении статуса документа");
    }
  };

  const openReviewModal = (docId) => {
    setCurrentDocumentId(docId);
  };

  const closeReviewModal = () => {
    setCurrentDocumentId(null);
    setReviewComment("");
  };

  if (loading) {
    return <div className="admin-loading">Загрузка документов...</div>;
  }

  if (error) {
    return <div className="admin-error">{error}</div>;
  }

  return (
    <div className="admin-documents-moderation">
      <h2>Документы на проверке</h2>

      {documents.length === 0 ? (
        <div className="no-documents">
          <p>Нет документов для проверки</p>
        </div>
      ) : (
        <div className="documents-list">
          {documents.map((doc) => (
            <div key={doc.id} className="moderation-doc-card">
              <div className="doc-header">
                <h3>{doc.document_type}</h3>
                <span className="user">
                  От: {doc.user_email} ({doc.company_name})
                </span>
              </div>

              <div className="doc-details">
                <div className="detail">
                  <strong>Загружено:</strong>
                  <span>
                    {new Date(doc.uploaded_at).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div className="doc-preview">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="preview-link"
                >
                  <FiFile className="file-icon" />
                  <span>Просмотреть документ</span>
                </a>
              </div>

              <div className="doc-actions">
                <button
                  className="approve-btn"
                  onClick={() => handleStatusChange(doc.id, "approved")}
                >
                  <FiCheck /> Одобрить
                </button>
                <button
                  className="reject-btn"
                  onClick={() => openReviewModal(doc.id)}
                >
                  <FiX /> Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно для отклонения документа */}
      {currentDocumentId && (
        <div className="modal-overlay">
          <div className="modal-content document-review-modal">
            <h2>Отклонение документа</h2>
            <p>Укажите причину отклонения документа:</p>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Причина отклонения..."
              rows={4}
            />

            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeReviewModal}>
                Отмена
              </button>
              <button
                className="reject-confirm-btn"
                onClick={() =>
                  handleStatusChange(
                    currentDocumentId,
                    "rejected",
                    reviewComment
                  )
                }
                disabled={!reviewComment.trim()}
              >
                Подтвердить отклонение
              </button>
            </div>
          </div>
        </div>
      )}
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

  const [employerJobs, setEmployerJobs] = useState([]);
  const [workerBookings, setWorkerBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
        }
        
        else if (error.response.status === 401) {
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
              <button className="withdraw-btn">Вывести средства</button>
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
            <button
              className={`tab-btn ${activeTab === "vacancies" ? "active" : ""}`}
              onClick={() => setActiveTab("vacancies")}
            >
              Мои вакансии
            </button>
          </>
        )}
      </div>

      <div className="profile-content">
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

                <div className="section" title="Рейтинг и отзывы">
                  <div className="rating-container">
                    <div className="rating-value">
                      {safeFormatNumber(currentProfile.rating)}
                    </div>
                    <div className="stars">
                      {"★".repeat(Math.floor(currentProfile.rating || 0))}
                      {"☆".repeat(5 - Math.floor(currentProfile.rating || 0))}
                    </div>
                    <div className="reviews-count">
                      {currentProfile.reviews_count || 0} отзывов
                    </div>
                  </div>
                  <button
                    className="view-reviews-btn"
                    onClick={() =>
                      navigate(`/profile/${currentProfile.id}/reviews`)
                    }
                  >
                    Посмотреть все отзывы
                  </button>
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

        {isAdmin && activeTab === "admin-stats" && <PlatformStatistics />}

        {isAdmin && activeTab === "admin-jobs" && <AdminJobsModeration />}
        
        {isAdmin && activeTab === "admin-disputes" && <AdminDisputesManagement />}

        {isAdmin && activeTab === "admin-users" && <AdminUsersManagement />}

        {isAdmin && activeTab === "admin-docs" && <AdminDocumentsModeration />}
      </div>

      {/* Модальное окно загрузки документа */}
      <DocumentUploadModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        onUpload={handleUploadDocument}
      />
    </div>
  );
};

export default ProfilePage;
