import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import {
  FiSearch,
  FiRefreshCw,
  FiCheck,
  FiLock,
  FiUnlock,
  FiX,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiSend,
} from "react-icons/fi";
import styles from "./AdminUsersManagement.module.css";

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
  const [showFilters, setShowFilters] = useState(false);

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
    setShowFilters(false);
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
    <div className={styles.adminUsersManagement}>
      <div className={styles.adminSectionHeader}>
        <h2>Управление пользователями</h2>
        <div className={styles.adminFiltersSummary}>
          {filters.role !== "all" && (
            <span className={styles.filterTag}>
              Роль:{" "}
              {filters.role === "worker"
                ? "Сотрудники"
                : filters.role === "employer"
                ? "Работодатели"
                : "Администраторы"}
            </span>
          )}
          {filters.verified !== "all" && (
            <span className={styles.filterTag}>
              Верификация:{" "}
              {filters.verified === "verified"
                ? "Подтвержденные"
                : "Неподтвержденные"}
            </span>
          )}
          {filters.status !== "all" && (
            <span className={styles.filterTag}>
              Статус:{" "}
              {filters.status === "active" ? "Активные" : "Заблокированные"}
            </span>
          )}
          {(filters.role !== "all" ||
            filters.verified !== "all" ||
            filters.status !== "all") && (
            <button className={styles.resetFiltersBtn} onClick={resetFilters}>
              <FiRefreshCw /> Сбросить
            </button>
          )}
        </div>
      </div>

      <div className={styles.adminControls}>
        <div className={styles.adminSearch}>
          <FiSearch className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Поиск по email, имени или компании..."
            value={searchTerm}
            onChange={handleSearch}
          />
          {searchTerm && (
            <button
              className={styles.clearSearchBtn}
              onClick={() => setSearchTerm("")}
            >
              ×
            </button>
          )}
        </div>

        <button
          className={styles.mobileFilterToggle}
          onClick={() => setShowFilters(!showFilters)}
        >
          <FiFilter /> Фильтры
        </button>

        <div
          className={`${styles.filterControls} ${
            showFilters ? styles.showFilters : ""
          }`}
        >
          <div className={styles.filterGroup}>
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

          <div className={styles.filterGroup}>
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

          <div className={styles.filterGroup}>
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

          <div className={styles.filterGroup}>
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
        <div className={styles.loaderOverlay}>
          <div className={styles.loaderSpinner}></div>
        </div>
      )}

      <div className={styles.usersList}>
        {users.map((user) => (
          <div
            key={user.id}
            className={`${styles.userCard} ${
              user.is_blocked ? styles.blocked : ""
            }`}
          >
            <div className={styles.cardHeader}>
              <div className={styles.userAvatar}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" />
                ) : (
                  <div className={styles.avatarInitials}>
                    {user.first_name?.[0]}
                    {user.last_name?.[0]}
                  </div>
                )}
              </div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {user.first_name} {user.last_name}
                </div>
                <div className={styles.userDetails}>
                  <div className={styles.userEmail}>{user.email}</div>
                  <div className={styles.userCompany}>
                    {user.company_name || "Без компании"}
                  </div>
                  {user.telegram_username && (
                    <div className={styles.userTelegram}>
                      <FiSend className={styles.telegramIcon} />@
                      {user.telegram_username}{" "}
                      {/* Просто текст вместо ссылки */}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.userId}>ID: {user.id}</div>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.userRole}>
                <label>Роль:</label>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  className={`${styles.roleSelect} ${styles[user.role]}`}
                >
                  <option value="worker">Сотрудник</option>
                  <option value="employer">Работодатель</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>

              <div className={styles.statusIndicators}>
                <span
                  className={`${styles.statusBadge} ${
                    user.is_verified ? styles.verified : styles.notVerified
                  }`}
                >
                  {user.is_verified ? (
                    <>
                      <FiCheck className={styles.verifiedIcon} /> Подтвержден
                    </>
                  ) : (
                    "Неподтвержден"
                  )}
                </span>
                <span
                  className={`${styles.statusBadge} ${
                    user.is_blocked ? styles.blocked : styles.active
                  }`}
                >
                  {user.is_blocked ? (
                    <>
                      <FiLock className={styles.blockedIcon} /> Заблокирован
                    </>
                  ) : (
                    <>
                      <FiUnlock className={styles.activeIcon} /> Активен
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className={styles.cardActions}>
              <button
                className={`${styles.actionBtn} ${
                  user.is_verified ? styles.unverify : styles.verify
                }`}
                onClick={() => handleVerifyToggle(user.id, user.is_verified)}
              >
                {user.is_verified ? <FiX /> : <FiCheck />}
                {user.is_verified ? " Снять верификацию" : " Верифицировать"}
              </button>
              <button
                className={`${styles.actionBtn} ${
                  user.is_blocked ? styles.unblock : styles.block
                }`}
                onClick={() => handleBlockToggle(user.id, user.is_blocked)}
              >
                {user.is_blocked ? <FiUnlock /> : <FiLock />}
                {user.is_blocked ? " Разблокировать" : " Заблокировать"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && !loading && (
        <div className={styles.noResults}>
          <FiSearch className={styles.noResultsIcon} />
          <p>Пользователи не найдены</p>
          <button className={styles.resetFiltersBtn} onClick={resetFilters}>
            Сбросить фильтры
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={`${styles.pageBtn} ${styles.prevNext}`}
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <FiChevronLeft />
          </button>

          <div className={styles.pageInfo}>
            Страница {currentPage} из {totalPages}
          </div>

          <button
            className={`${styles.pageBtn} ${styles.prevNext}`}
            onClick={() =>
              handlePageChange(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
          >
            <FiChevronRight />
          </button>
        </div>
      )}

      {error && (
        <div className={styles.adminErrorMessage}>
          {error}
          <button onClick={fetchUsers}>Повторить попытку</button>
        </div>
      )}
    </div>
  );
};

export default AdminUsersManagement;
