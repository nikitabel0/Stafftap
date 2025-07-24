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
  FiBriefcase,
  FiFilter,
} from "react-icons/fi";
import FilterPanel from "../../components/FilterPanel/FilterPanel";
import VacancyCard from "../../components/VacancyCard/VacancyCard";
import styles from "./FeedPage.module.css";
import API_BASE_URL from "../../apiConfig";
import moment from "moment";

const FeedPage = ({ user }) => {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({
    profession: "",
    date: "",
    minRate: "",
    city: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [applications, setApplications] = useState([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [showJobSelectionModal, setShowJobSelectionModal] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [employerJobs, setEmployerJobs] = useState([]);
  const [isLoadingEmployerJobs, setIsLoadingEmployerJobs] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const role = user?.role || "worker";

  const hasActiveFilters = Object.values(filters).some((val) => val !== "");

  const openFilterPanel = () => {
    setIsFilterPanelOpen(true);
  };

  // Загрузка вакансий для работников
  const fetchVacancies = async (filters = {}, query = "") => {
    try {
      const token = localStorage.getItem("token");
      const params = {
        skill: filters.profession || undefined,
        date: filters.date || undefined,
        min_rate: filters.minRate || undefined,
        city: filters.city || undefined,
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
        profession: job.required_skill_name || job.custom_skill,
        date: job.work_date,
        establishment_name: job.establishment_name,
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
      setError("Ошибка при загрузке вакансий. Пожалуйста, попробуйте позже.");
      return [];
    }
  };

  // Загрузка работников для работодателей
  const fetchWorkers = async (filters = {}, query = "") => {
    try {
      const token = localStorage.getItem("token");
      const params = {
        skill: filters.profession || undefined,
        available_date: filters.date || undefined,
        min_rate: filters.minRate || undefined,
        city: filters.city || undefined,
        search: query || undefined,
      };

      const response = await axios.get(`${API_BASE_URL}/api/users/workers`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.map((worker) => ({
        id: worker.id,
        firstName: worker.first_name,
        lastName: worker.last_name,
        avatarUrl: worker.avatar_url,
        birthDate: worker.birth_date,
        experience: worker.experience_months,
        ratePerShift: worker.rate_per_shift,
        skills: worker.skills || [],
        availability:
          worker.availability.map((av) => ({
            id: av.id,
            date: av.date || av.available_date,
          })) || [],
        isVerified: worker.is_verified,
        rating: worker.rating,
        city: worker.city || "Город не указан",
      }));
    } catch (error) {
      console.error("Ошибка при загрузке работников:", error);

      if (error.response?.status === 403) {
        setError("У вас нет прав для просмотра списка работников");
      } else if (error.response?.status === 401) {
        setError("Требуется авторизация");
      } else {
        setError("Ошибка при загрузке данных работников");
      }

      return [];
    }
  };

  // Загрузка вакансий работодателя
  const fetchEmployerJobs = async () => {
    if (!user || user.role !== "employer") return;

    setIsLoadingEmployerJobs(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE_URL}/api/jobs/employer/${user.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setEmployerJobs(response.data);
    } catch (error) {
      console.error("Ошибка при загрузке вакансий работодателя:", error);
      setError("Не удалось загрузить ваши вакансии");
    } finally {
      setIsLoadingEmployerJobs(false);
    }
  };

  // Загрузка данных при изменении фильтров или поискового запроса
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
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
        setError("Ошибка при загрузке данных");
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
      setError("Не удалось обновить избранное");
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

  // Обработка клика по кнопке действия
  const handleActionButtonClick = () => {
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
    setError(null);
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
      setError("Не удалось загрузить ваши заявки");
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
    if (!availability || availability.length === 0)
      return ["Нет доступных дат"];

    const validDates = availability
      .map((av) => {
        const dateStr = av.date || av.available_date;
        if (!dateStr) return null;

        const formats = ["YYYY-MM-DD", "DD.MM.YYYY", "MM/DD/YYYY"];

        for (const format of formats) {
          const date = moment(dateStr, format, true);
          if (date.isValid()) return date.toDate();
        }

        return null;
      })
      .filter((date) => date && !isNaN(date) && date >= new Date())
      .sort((a, b) => a - b)
      .slice(0, 3)
      .map((date) =>
        date.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
        })
      );

    return validDates.length > 0 ? validDates : ["Нет доступных дат"];
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

  // Переключение видимости фильтров
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Обработка клика по карточке работника
  const handleWorkerClick = (workerId) => {
    if (role === "employer") return;
    navigate(`/worker/${workerId}`);
  };

  // Обработчик бронирования работника
  const handleBookWorker = (workerId) => {
    setSelectedWorkerId(workerId);
    fetchEmployerJobs();
    setShowJobSelectionModal(true);
  };

  // Подтверждение бронирования работника на вакансию
  const confirmWorkerBooking = async (jobId) => {
    if (!selectedWorkerId) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/api/bookings/employer/book-worker/`,
        {
          worker_id: selectedWorkerId,
          job_id: jobId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setError("Работник успешно забронирован на вакансию!");

      const workersData = await fetchWorkers(filters, searchQuery);
      setData(workersData);
    } catch (error) {
      console.error("Ошибка при бронировании работника:", error);
      setError(`Ошибка: ${error.response?.data?.detail || error.message}`);
    } finally {
      setShowJobSelectionModal(false);
      setSelectedWorkerId(null);
    }
  };

  return (
    <div className={styles.feedPage}>
      {/* Шапка страницы */}
      <div className={styles.feedHeader}>
        <div className={styles.headerTop}>
          <h1>
            {role === "worker" ? "Доступные вакансии" : "Доступные работники"}
          </h1>
          {user && (
            <div className={styles.balanceInfo}>
              <span>
                Баланс: {user.balance?.toLocaleString("ru-RU") || 0} ₽
              </span>
            </div>
          )}
        </div>

        {/* Баннер ошибок */}
        {error && (
          <div className={styles.errorBanner}>
            <span>{error}</span>
            <button
              className={styles.errorClose}
              onClick={() => setError(null)}
            >
              <FiX />
            </button>
          </div>
        )}

        <div className={styles.searchContainer}>
          <div className={styles.searchBar}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder={
                role === "worker" ? "Поиск вакансий..." : "Поиск работников..."
              }
              value={searchQuery}
              onChange={handleSearch}
              className={styles.searchInput}
            />
          </div>
        </div>
      </div>

      {/* Панель управления с кнопками */}
      <div className={styles.actionBar}>
        <div className={styles.filterSection}>
          <button
            className={`${styles.filterButton} ${
              isFilterPanelOpen ? styles.active : ""
            } ${hasActiveFilters ? styles.hasFilters : ""}`}
            onClick={openFilterPanel}
          >
            <FiFilter className={styles.filterIcon} />
            <span>Фильтры</span>
            {hasActiveFilters && <div className={styles.filterIndicator}></div>}
          </button>

          {(filters.profession ||
            filters.date ||
            filters.minRate ||
            filters.city) && (
            <button
              className={styles.clearFilters}
              onClick={() =>
                setFilters({ profession: "", date: "", minRate: "", city: "" })
              }
            >
              Сбросить
            </button>
          )}
        </div>

        <div className={styles.mainAction}>
          <button
            className={`${styles.actionButton} ${
              role === "employer" ? styles.employer : ""
            }`}
            onClick={handleActionButtonClick}
          >
            {role === "employer" ? (
              <>
                <FiPlus className={styles.buttonIcon} />
                <span>Создать вакансию</span>
              </>
            ) : (
              <>
                <FiList className={styles.buttonIcon} />
                <span>Мои заявки</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Панель фильтров */}
      <FilterPanel
        filters={filters}
        onFilterChange={setFilters}
        onClose={() => setIsFilterPanelOpen(false)}
        isOpen={isFilterPanelOpen}
      />
      {/* Информация о примененных фильтрах */}
      <div className={styles.filtersInfo}>
        {(filters.profession ||
          filters.date ||
          filters.minRate ||
          filters.city) && (
          <div className={styles.activeFilters}>
            <span>Примененные фильтры:</span>
            {filters.profession && (
              <div className={styles.filterTag}>
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
            {filters.city && (
              <div className={styles.filterTag}>
                Город: {filters.city}
                <button
                  onClick={() => handleFilterChange({ ...filters, city: "" })}
                >
                  &times;
                </button>
              </div>
            )}
            {filters.date && (
              <div className={styles.filterTag}>
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
              <div className={styles.filterTag}>
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
          <div className={styles.vacanciesCount}>
            {role === "worker"
              ? `Найдено вакансий: ${data.length}`
              : `Найдено работников: ${data.length}`}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loader}></div>
          <p>
            {role === "worker"
              ? "Загрузка вакансий..."
              : "Загрузка работников..."}
          </p>
        </div>
      ) : (
        <div
          className={
            role === "worker" ? styles.vacanciesList : styles.workersList
          }
        >
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
                  className={styles.workerCard}
                  onClick={() => handleWorkerClick(worker.id)}
                >
                  <div className={styles.workerHeader}>
                    {worker.avatarUrl ? (
                      <img
                        src={worker.avatarUrl}
                        alt={`${worker.firstName} ${worker.lastName}`}
                        className={styles.workerAvatar}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        <FiUser size={24} />
                      </div>
                    )}

                    <div className={styles.workerInfo}>
                      <h3>
                        {worker.firstName} {worker.lastName}
                      </h3>
                      <div className={styles.workerMeta}>
                        <span className={styles.workerAge}>
                          {worker.birthDate
                            ? calculateAge(worker.birthDate) + " лет"
                            : "Возраст не указан"}
                        </span>
                        <span className={styles.workerCity}>{worker.city}</span>
                      </div>
                    </div>

                    {worker.rating > 0 ? (
                      <div className={styles.workerRating}>
                        <FiStar size={18} fill="#FFD700" />
                        <span>{worker.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <div className={styles.workerRating}>
                        <span>Нет оценок</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.workerDetails}>
                    <div className={styles.detailRow}>
                      <div className={styles.detailItem}>
                        <FiDollarSign />
                        <span>
                          {worker.ratePerShift
                            ? `${worker.ratePerShift.toLocaleString(
                                "ru-RU"
                              )} ₽/смена`
                            : "Ставка не указана"}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span>Опыт: {formatExperience(worker.experience)}</span>
                      </div>
                    </div>

                    {worker.availability && worker.availability.length > 0 && (
                      <div className={styles.detailRow}>
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
                      <div className={styles.workerSkills}>
                        {worker.skills.map((skill) => (
                          <span key={skill.id} className={styles.skillTag}>
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Кнопка бронирования для работодателей */}
                  {role === "employer" && (
                    <button
                      className={styles.bookWorkerButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookWorker(worker.id);
                      }}
                    >
                      Забронировать
                    </button>
                  )}
                </div>
              ))
            )
          ) : (
            <div className={styles.noResults}>
              <div className={styles.noResultsIcon}>
                <FiSearch size={48} />
              </div>
              <h3>Ничего не найдено</h3>
              <p>Попробуйте изменить параметры поиска или фильтры</p>
              <button
                className={styles.resetFiltersButton}
                onClick={() => {
                  setFilters({
                    profession: "",
                    date: "",
                    minRate: "",
                    city: "",
                  });
                  setSearchQuery("");
                }}
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      )}

      {/* Модальное окно заявок (только для работников) */}
      {showApplicationsModal && role === "worker" && (
        <div className={styles.applicationsModal}>
          <div
            className={styles.modalOverlay}
            onClick={() => setShowApplicationsModal(false)}
          ></div>

          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Мои заявки</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowApplicationsModal(false)}
              >
                <FiX size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {isLoadingApplications ? (
                <div className={styles.loadingApplications}>
                  <div className={styles.loader}></div>
                  <p>Загрузка ваших заявок...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className={styles.noApplications}>
                  <div className={styles.emptyIcon}>
                    <FiList size={48} />
                  </div>
                  <h3>У вас пока нет заявок</h3>
                  <p>Найдите подходящую вакансию и отправьте заявку</p>
                </div>
              ) : (
                <div className={styles.applicationsList}>
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className={styles.applicationCard}
                      onClick={() => {
                        setShowApplicationsModal(false);
                        navigate(`/vacancy/${application.job.id}`);
                      }}
                    >
                      <div className={styles.applicationHeader}>
                        <h3>{application.job.title}</h3>
                        <div
                          className={`${styles.applicationStatus} ${
                            application.status === "pending"
                              ? styles.statusPending
                              : application.status === "confirmed"
                              ? styles.statusConfirmed
                              : application.status === "rejected"
                              ? styles.statusRejected
                              : ""
                          }`}
                        >
                          <span>{getStatusText(application.status)}</span>
                        </div>
                      </div>

                      <div className={styles.applicationDetails}>
                        <div className={styles.detailRow}>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>
                              Компания:
                            </span>
                            <span>{application.job.company_name}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Оплата:</span>
                            <span>
                              {application.job.rate.toLocaleString("ru-RU")} ₽
                            </span>
                          </div>
                        </div>

                        <div className={styles.detailRow}>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Дата:</span>
                            <span>
                              {formatDate(application.job.work_date)},{" "}
                              {application.job.start_time} -{" "}
                              {application.job.end_time}
                            </span>
                          </div>
                        </div>

                        <div className={styles.detailRow}>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Адрес:</span>
                            <span>{application.job.address}</span>
                          </div>
                        </div>

                        <div className={styles.detailRow}>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Подана:</span>
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

      {/* Модальное окно выбора вакансии для бронирования */}
      {showJobSelectionModal && role === "employer" && (
        <div className={styles.jobSelectionModal}>
          <div
            className={styles.modalOverlay}
            onClick={() => setShowJobSelectionModal(false)}
          ></div>

          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Выберите вакансию для бронирования</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowJobSelectionModal(false)}
              >
                <FiX size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {isLoadingEmployerJobs ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.loader}></div>
                  <p>Загрузка ваших вакансий...</p>
                </div>
              ) : employerJobs.length === 0 ? (
                <div className={styles.noJobs}>
                  <div className={styles.emptyIcon}>
                    <FiBriefcase size={48} />
                  </div>
                  <h3>У вас нет активных вакансий</h3>
                  <p>Создайте вакансию, чтобы забронировать работника</p>
                  <button
                    className={styles.createVacancyButton}
                    onClick={() => {
                      setShowJobSelectionModal(false);
                      navigate("/create-vacancy");
                    }}
                  >
                    Создать вакансию
                  </button>
                </div>
              ) : (
                <div className={styles.jobsList}>
                  {employerJobs.map((job) => (
                    <div
                      key={job.id}
                      className={styles.jobItem}
                      onClick={() => confirmWorkerBooking(job.id)}
                    >
                      <div className={styles.jobInfo}>
                        <h3>{job.title}</h3>
                        <p className={styles.jobDate}>
                          {formatDate(job.work_date)}
                        </p>
                        <p className={styles.jobCity}>
                          {job.address
                            .split(", ")
                            .find(
                              (part) =>
                                part.includes("город") ||
                                part.match(/[а-яА-ЯёЁ\s-]+(?:г\.|город)\s?/i)
                            ) || job.address}
                        </p>
                      </div>
                      <div className={styles.jobMeta}>
                        <p className={styles.jobRate}>
                          {job.rate.toLocaleString("ru-RU")} ₽
                        </p>
                        <div className={styles.jobSlots}>
                          <span>Осталось мест: {job.remaining_slots}</span>
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
