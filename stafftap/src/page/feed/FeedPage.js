import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiSearch,
  FiPlus,
  FiList,
  FiX,
  FiUser,
  FiCalendar,
  FiDollarSign,
  FiStar,
} from "react-icons/fi";
import FilterPanel from "../../components/FilterPanel/FilterPanel";
import VacancyCard from "../../components/VacancyCard/VacancyCard";
import "./FeedPage.css";
import API_BASE_URL from "../../apiConfig";

const FeedPage = ({ user }) => {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({
    profession: "",
    date: "",
    minRate: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [applications, setApplications] = useState([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const navigate = useNavigate();

  const role = user?.role || "worker";

  // Загрузка вакансий для работников
  const fetchVacancies = async (filters = {}, query = "") => {
    try {
      const token = localStorage.getItem("token");
      const params = {
        skill: filters.profession || undefined,
        date: filters.date || undefined,
        min_rate: filters.minRate || undefined,
        search: query || undefined,
      };

      const response = await axios.get(`${API_BASE_URL}/api/jobs`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company_name,
        description: job.description,
        profession: job.required_skill_name,
        date: job.work_date,
        startTime: job.start_time,
        endTime: job.end_time,
        address: job.address,
        salary: job.rate,
        workersNeeded: job.workers_needed,
        remainingSlots: job.remaining_slots,
        postedDate: new Date(job.created_at).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
        }),
        isFavorite: job.is_favorite || false,
        employerRating: job.employer_rating || 4.5,
        employerVerified: job.employer_verified || false,
      }));
    } catch (error) {
      console.error("Ошибка при загрузке вакансий:", error);
      return [];
    }
  };

  // Загрузка работников для работодателей
  const fetchWorkers = async (filters = {}, query = '') => {
  try {
    const token = localStorage.getItem('token');
    const params = {
      skill: filters.profession || undefined,
      available_date: filters.date || undefined,
      min_rate: filters.minRate || undefined,
      search: query || undefined
    };

    console.log("Fetching workers with params:", params);
    
    const response = await axios.get(`${API_BASE_URL}/api/users/workers`, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Workers response:", response.data);
    
    return response.data.map(worker => ({
      id: worker.id,
      firstName: worker.first_name,
      lastName: worker.last_name,
      avatarUrl: worker.avatar_url,
      birthDate: worker.birth_date,
      experience: worker.experience_months,
      ratePerShift: worker.rate_per_shift,
      skills: worker.skills || [],
      availability: worker.availability.map(av => ({
        id: av.id, 
        date: av.date  // Убедимся, что используем правильное поле
      })) || [],
      isVerified: worker.is_verified,
      rating: worker.rating || 4.5
    }));
  } catch (error) {
    console.error('Ошибка при загрузке работников:', {
      message: error.message,
      response: error.response,
      config: error.config
    });
    return [];
  }
};

  // Загрузка данных при изменении фильтров или поискового запроса
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (role === "worker") {
          const vacanciesData = await fetchVacancies(filters, searchQuery);
          setData(vacanciesData);
        } else {
          const workersData = await fetchWorkers(filters, searchQuery);
          setData(workersData);
        }
      } catch (error) {
        console.error("Ошибка загрузки данных:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      loadData();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, searchQuery, role]);

  // Обработка изменения фильтров
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Обработка поискового запроса
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  // Переключение избранного для вакансий
  const handleToggleFavorite = async (id) => {
    try {
      const token = localStorage.getItem("token");

      // Только для работников
      if (role !== "worker") return;

      const vacancy = data.find((v) => v.id === id);
      const newFavoriteStatus = !vacancy.isFavorite;

      setData((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, isFavorite: newFavoriteStatus } : v
        )
      );

      await axios.post(
        `${API_BASE_URL}/api/jobs/${id}/favorite`,
        { is_favorite: newFavoriteStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error("Ошибка при обновлении избранного:", error);
      const vacancy = data.find((v) => v.id === id);
      if (vacancy) {
        setData((prev) =>
          prev.map((v) =>
            v.id === id ? { ...v, isFavorite: vacancy.isFavorite } : v
          )
        );
      }
    }
  };

  // Обработка клика по плавающей кнопке
  const handleFloatingButtonClick = () => {
    if (role === "employer") {
      navigate("/create-vacancy");
    } else {
      fetchUserApplications();
      setShowApplicationsModal(true);
    }
  };

  // Загрузка заявок пользователя
  const fetchUserApplications = async () => {
    if (!user) return;

    setIsLoadingApplications(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE_URL}/api/bookings/my-applications/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setApplications(response.data);
    } catch (error) {
      console.error("Ошибка при загрузке заявок:", error);
    } finally {
      setIsLoadingApplications(false);
    }
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = { day: "numeric", month: "long" };
    return new Date(dateString).toLocaleDateString("ru-RU", options);
  };

  // Форматирование даты и времени
  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const options = {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleString("ru-RU", options);
  };

  // Рассчет возраста по дате рождения
  const calculateAge = (birthDate) => {
    if (!birthDate) return "N/A";

    try {
      const birthDateObj = new Date(birthDate);
      const diff = Date.now() - birthDateObj.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    } catch (e) {
      console.error("Invalid birthDate format:", birthDate);
      return "N/A";
    }
  };
  // Форматирование опыта работы
  const formatExperience = (months) => {
    if (!months) return "Опыт не указан";
    const years = Math.floor(months / 12);
    return years > 0
      ? `${years} ${years === 1 ? "год" : years < 5 ? "года" : "лет"}`
      : `${months} ${
          months === 1 ? "месяц" : months < 5 ? "месяца" : "месяцев"
        }`;
  };

  // Получение ближайших доступных дат
  const getNearestAvailability = (availability) => {
    if (!availability || availability.length === 0) return [];

    return availability
      .map((a) => (a.date ? new Date(a.date) : null)) // Изменено здесь!
      .filter((date) => date && !isNaN(date))
      .sort((a, b) => a - b)
      .filter((date) => date >= new Date())
      .slice(0, 3)
      .map((date) => date.toLocaleDateString("ru-RU"));
  };

  // Обработка статуса заявки
  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "На рассмотрении";
      case "confirmed":
        return "Подтверждена";
      case "rejected":
        return "Отклонена";
      case "completed":
        return "Завершена";
      case "canceled":
        return "Отменена";
      default:
        return status;
    }
  };

  // Получение класса для статуса
  const getStatusClass = (status) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "confirmed":
        return "status-confirmed";
      case "rejected":
        return "status-rejected";
      case "completed":
        return "status-completed";
      case "canceled":
        return "status-canceled";
      default:
        return "";
    }
  };

  // Переключение видимости фильтров
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Обработка клика по карточке работника
  const handleWorkerClick = (workerId) => {
    navigate(`/worker/${workerId}`);
  };

  return (
    <div className="feed-page">
      {/* Шапка страницы */}
      <div className="feed-header">
        <div className="header-top">
          <h1>
            {role === "worker" ? "Доступные вакансии" : "Доступные работники"}
          </h1>
          {user && (
            <div className="balance-info">
              <span>
                Баланс: {user.balance?.toLocaleString("ru-RU") || 0} ₽
              </span>
            </div>
          )}
        </div>

        <div className="search-container">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder={
                role === "worker" ? "Поиск вакансий..." : "Поиск работников..."
              }
              value={searchQuery}
              onChange={handleSearch}
              className="search-input"
            />
            <button className="filter-toggle" onClick={toggleFilters}>
              Фильтры
            </button>
          </div>
        </div>
      </div>

      {/* Панель фильтров */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          role={role}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Информация о примененных фильтрах */}
      <div className="filters-info">
        {(filters.profession || filters.date || filters.minRate) && (
          <div className="active-filters">
            <span>Примененные фильтры:</span>
            {filters.profession && (
              <div className="filter-tag">
                {role === "worker" ? "Профессия: " : "Навык: "}
                {filters.profession}
                <button
                  onClick={() =>
                    handleFilterChange({ ...filters, profession: "" })
                  }
                >
                  &times;
                </button>
              </div>
            )}
            {filters.date && (
              <div className="filter-tag">
                {role === "worker" ? "Дата: " : "Доступность: "}
                {formatDate(filters.date)}
                <button
                  onClick={() => handleFilterChange({ ...filters, date: "" })}
                >
                  &times;
                </button>
              </div>
            )}
            {filters.minRate && (
              <div className="filter-tag">
                {role === "worker" ? "Мин. оплата: " : "Мин. ставка: "}
                {filters.minRate} ₽
                <button
                  onClick={() =>
                    handleFilterChange({ ...filters, minRate: "" })
                  }
                >
                  &times;
                </button>
              </div>
            )}
          </div>
        )}

        {!isLoading && data.length > 0 && (
          <div className="vacancies-count">
            {role === "worker"
              ? `Найдено вакансий: ${data.length}`
              : `Найдено работников: ${data.length}`}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p>
            {role === "worker"
              ? "Загрузка вакансий..."
              : "Загрузка работников..."}
          </p>
        </div>
      ) : (
        <div className={role === "worker" ? "vacancies-list" : "workers-list"}>
          {data.length > 0 ? (
            role === "worker" ? (
              // Отображение вакансий для работников
              data.map((vacancy) => (
                <VacancyCard
                  key={vacancy.id}
                  vacancy={vacancy}
                  onToggleFavorite={handleToggleFavorite}
                  role={role}
                  user={user}
                />
              ))
            ) : (
              // Отображение работников для работодателей
              data.map((worker) => (
                <div
                  key={worker.id}
                  className="worker-card"
                  onClick={() => handleWorkerClick(worker.id)}
                >
                  <div className="worker-header">
                    {worker.avatarUrl ? (
                      <img
                        src={worker.avatarUrl}
                        alt={`${worker.firstName} ${worker.lastName}`}
                        className="worker-avatar"
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        <FiUser size={24} />
                      </div>
                    )}

                    <div className="worker-info">
                      <h3>
                        {worker.firstName} {worker.lastName}
                      </h3>
                      <div className="worker-meta">
                        <span className="worker-age">
                          {calculateAge(worker.birthDate)} лет
                        </span>
                        {worker.isVerified && (
                          <span className="verified-badge">Проверен</span>
                        )}
                      </div>
                    </div>

                    <div className="worker-rating">
                      <FiStar size={18} fill="#FFD700" />
                      <span>{worker.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="worker-details">
                    <div className="detail-row">
                      <div className="detail-item">
                        <FiDollarSign />
                        <span>
                          {worker.ratePerShift
                            ? `${worker.ratePerShift.toLocaleString(
                                "ru-RU"
                              )} ₽/смена`
                            : "Ставка не указана"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span>Опыт: {formatExperience(worker.experience)}</span>
                      </div>
                    </div>

                    {worker.availability && worker.availability.length > 0 && (
                      <div className="detail-row">
                        <FiCalendar />
                        <span>
                          Ближайшие даты:{" "}
                          {getNearestAvailability(worker.availability).join(
                            ", "
                          )}
                        </span>
                      </div>
                    )}

                    {worker.skills && worker.skills.length > 0 && (
                      <div className="worker-skills">
                        {worker.skills.map((skill) => (
                          <span key={skill.id} className="skill-tag">
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="no-results">
              <div className="no-results-icon">
                <FiSearch size={48} />
              </div>
              <h3>Ничего не найдено</h3>
              <p>Попробуйте изменить параметры поиска или фильтры</p>
              <button
                className="reset-filters"
                onClick={() => {
                  setFilters({ profession: "", date: "", minRate: "" });
                  setSearchQuery("");
                }}
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      )}

      {/* Плавающая кнопка действий */}
      <div
        className={`floating-button ${role}`}
        onClick={handleFloatingButtonClick}
      >
        {role === "employer" ? (
          <>
            <FiPlus className="button-icon" />
            <span className="button-text">Создать</span>
          </>
        ) : (
          <>
            <FiList className="button-icon" />
            <span className="button-text">Заявки</span>
          </>
        )}
      </div>

      {/* Модальное окно заявок (только для работников) */}
      {showApplicationsModal && role === "worker" && (
        <div className="applications-modal">
          <div
            className="modal-overlay"
            onClick={() => setShowApplicationsModal(false)}
          ></div>

          <div className="modal-content">
            <div className="modal-header">
              <h2>Мои заявки</h2>
              <button
                className="close-button"
                onClick={() => setShowApplicationsModal(false)}
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="modal-body">
              {isLoadingApplications ? (
                <div className="loading-applications">
                  <div className="loader"></div>
                  <p>Загрузка ваших заявок...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="no-applications">
                  <div className="empty-icon">
                    <FiList size={48} />
                  </div>
                  <h3>У вас пока нет заявок</h3>
                  <p>Найдите подходящую вакансию и отправьте заявку</p>
                </div>
              ) : (
                <div className="applications-list">
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className="application-card"
                      onClick={() => {
                        setShowApplicationsModal(false);
                        navigate(`/vacancy/${application.job.id}`);
                      }}
                    >
                      <div className="application-header">
                        <h3>{application.job.title}</h3>
                        <div
                          className={`application-status ${getStatusClass(
                            application.status
                          )}`}
                        >
                          <span>{getStatusText(application.status)}</span>
                        </div>
                      </div>

                      <div className="application-details">
                        <div className="detail-row">
                          <div className="detail-item">
                            <span className="detail-label">Компания:</span>
                            <span>{application.job.company_name}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Оплата:</span>
                            <span>
                              {application.job.rate.toLocaleString("ru-RU")} ₽
                            </span>
                          </div>
                        </div>

                        <div className="detail-row">
                          <div className="detail-item">
                            <span className="detail-label">Дата:</span>
                            <span>
                              {formatDate(application.job.work_date)},{" "}
                              {application.job.start_time} -{" "}
                              {application.job.end_time}
                            </span>
                          </div>
                        </div>

                        <div className="detail-row">
                          <div className="detail-item">
                            <span className="detail-label">Адрес:</span>
                            <span>{application.job.address}</span>
                          </div>
                        </div>

                        <div className="detail-row">
                          <div className="detail-item">
                            <span className="detail-label">Подана:</span>
                            <span>
                              {formatDateTime(application.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedPage;
