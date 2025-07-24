import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../../apiConfig";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { FiUsers, FiBarChart2, FiCheckCircle, FiFileText, FiUser, FiBriefcase, FiShield } from "react-icons/fi";
import styles from "./PlatformStatistics.module.css";

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
      <div className={styles.platformStatistics}>
        <h2>Статистика платформы</h2>
        <div className={styles.statsLoading}>
          <div className={styles.loaderSpinner}></div>
          <p>Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.platformStatistics}>
        <h2>Статистика платформы</h2>
        <div className={styles.statsError}>
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
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          <p className={styles.tooltipValue}>
            <span
              className={styles.colorIndicator}
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
    <div className={styles.platformStatistics}>
      <h2>Статистика платформы</h2>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FiUsers />
          </div>
          <div className={styles.statValue}>{stats.total_users}</div>
          <div className={styles.statLabel}>Всего пользователей</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FiBarChart2 />
          </div>
          <div className={styles.statValue}>{stats.active_jobs}</div>
          <div className={styles.statLabel}>Активных вакансий</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FiCheckCircle />
          </div>
          <div className={styles.statValue}>{stats.completed_jobs}</div>
          <div className={styles.statLabel}>Завершенных смен</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FiFileText />
          </div>
          <div className={styles.statValue}>{stats.pending_documents}</div>
          <div className={styles.statLabel}>Документов на проверке</div>
        </div>
      </div>

      <div className={styles.statsCharts}>
        <div className={styles.chartContainer}>
          <h3>Регистрации пользователей (последние 7 дней)</h3>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
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

        <div className={`${styles.chartContainer} ${styles.pieChart}`}>
          <h3>Распределение пользователей по ролям</h3>
          <div className={styles.chartWrapper}>
            <div className={styles.roleDistribution}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
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
                      <span className={styles.legendItem}>
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

export default PlatformStatistics;