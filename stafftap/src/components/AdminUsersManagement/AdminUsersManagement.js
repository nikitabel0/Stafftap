import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import { FiSearch, FiRefreshCw, FiCheck, FiLock, FiUnlock, FiX } from "react-icons/fi";
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
              <FiRefreshCw /> Сбросить фильтры
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

        <div className={styles.filterControls}>
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

      <div className={styles.usersTableContainer}>
        <table className={styles.usersTable}>
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
              <tr key={user.id} className={user.is_blocked ? styles.blocked : ""}>
                <td>{user.id}</td>
                <td>
                  <div className={styles.userInfoCell}>
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
                    <div className={styles.userDetails}>
                      <div className={styles.userName}>
                        {user.first_name} {user.last_name}
                      </div>
                      <div className={styles.userCompany}>
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
                    className={`${styles.roleSelect} ${styles[user.role]}`}
                  >
                    <option value="worker">Сотрудник</option>
                    <option value="employer">Работодатель</option>
                    <option value="admin">Администратор</option>
                  </select>
                </td>
                <td>
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
                </td>
                <td className={styles.actions}>
                  <button
                    className={`${styles.actionBtn} ${
                      user.is_verified ? styles.unverify : styles.verify
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
                    className={`${styles.actionBtn} ${
                      user.is_blocked ? styles.unblock : styles.block
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
                className={`${styles.pageBtn} ${
                  currentPage === page ? styles.active : ""
                }`}
                onClick={() => handlePageChange(page)}
                disabled={currentPage === page}
              >
                {page}
              </button>
            );
          })}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <span className={styles.pageDots}>...</span>
          )}

          {totalPages > 5 && currentPage < totalPages - 1 && (
            <button
              className={`${styles.pageBtn} ${
                currentPage === totalPages ? styles.active : ""
              }`}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              {totalPages}
            </button>
          )}

          <button
            className={`${styles.pageBtn} ${styles.prevNext}`}
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
        <div className={styles.adminErrorMessage}>
          {error}
          <button onClick={fetchUsers}>Повторить попытку</button>
        </div>
      )}
    </div>
  );
};

export default AdminUsersManagement;