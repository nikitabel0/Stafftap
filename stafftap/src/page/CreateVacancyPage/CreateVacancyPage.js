import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./CreateVacancyPage.module.css";
import API_BASE_URL from "../../apiConfig";

const CreateVacancyPage = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    required_skill_id: "",
    work_date: "",
    start_time: "09:00",
    end_time: "18:00",
    address: "",
    rate: "",
    workers_needed: 1,
    latitude: null,
    longitude: null,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [verificationError, setVerificationError] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const placemarkRef = useRef(null);
  const suggestTimerRef = useRef(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setVerificationError("Требуется авторизация");
          setIsLoadingUser(false);
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(response.data);

        if (response.data.role !== "employer") {
          setVerificationError("Только работодатели могут создавать вакансии");
        } else if (!response.data.is_verified) {
          setVerificationError(
            "Для создания вакансий необходимо пройти верификацию"
          );
        }
      } catch (error) {
        console.error("Ошибка загрузки данных пользователя:", error);
        setVerificationError("Не удалось проверить статус верификации");
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchCurrentUser();

    const fetchSkills = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/skills`);
        setSkills(response.data);
      } catch (error) {
        console.error("Ошибка при загрузке навыков:", error);
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchSkills();
  }, []);

  // Загрузка API Яндекс.Карт
  useEffect(() => {
    if (window.ymaps) {
      setMapLoaded(true);
      return;
    }

    if (!document.querySelector('script[src*="api-maps.yandex.ru"]')) {
      setMapLoading(true);
      const script = document.createElement("script");
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=c28906d1-bfbf-46d0-8cce-6b8c72076f62&lang=ru_RU`;
      script.async = true;
      
      script.onload = () => {
        setMapLoaded(true);
        setMapLoading(false);
      };
      
      script.onerror = () => {
        console.error("Failed to load Yandex Maps API");
        setMapLoaded(false);
        setMapLoading(false);
      };

      document.head.appendChild(script);
    }

    return () => {
      // Очистка карты при размонтировании
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Инициализация карты
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      initMap();
    }
  }, [mapLoaded]);

  const initMap = () => {
    window.ymaps.ready(() => {
      try {
        const map = new window.ymaps.Map(mapRef.current, {
          center: [55.751574, 37.573856],
          zoom: 9,
          controls: ["zoomControl", "typeSelector", "fullscreenControl"],
        });
        
        mapInstanceRef.current = map;

        // Добавляем геолокацию
        const geolocationControl = new window.ymaps.control.GeolocationControl({
          options: {
            float: "left",
            position: {
              top: "10px",
              left: "10px",
            },
          },
        });
        map.controls.add(geolocationControl);

        // Обработчик клика по карте
        map.events.add("click", (e) => {
          const coords = e.get("coords");
          setPlacemark(coords, map);
          geocode(coords);
        });

      } catch (error) {
        console.error("Map initialization error:", error);
      }
    });
  };

  const setPlacemark = (coords, map) => {
    // Удаляем предыдущую метку
    if (placemarkRef.current) {
      map.geoObjects.remove(placemarkRef.current);
    }

    // Создаем новую метку
    placemarkRef.current = new window.ymaps.Placemark(
      coords,
      {
        hintContent: "Выбранное местоположение",
      },
      {
        preset: "islands#blueDotIcon",
      }
    );

    map.geoObjects.add(placemarkRef.current);

    // Центрируем карту
    map.panTo(coords, {
      flying: true,
      duration: 1000,
    });

    // Обновляем координаты
    setFormData((prev) => ({
      ...prev,
      latitude: coords[0],
      longitude: coords[1],
    }));
  };

  const geocode = (coords) => {
    window.ymaps.geocode(coords).then((res) => {
      const firstGeoObject = res.geoObjects.get(0);
      if (firstGeoObject) {
        const address = firstGeoObject.getAddressLine();
        setFormData((prev) => ({
          ...prev,
          address: address,
        }));
      }
    });
  };

  // Получение подсказок для адреса
  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(
        `https://suggest-maps.yandex.ru/suggest-geo?apikey=c28906d1-bfbf-46d0-8cce-6b8c72076f62&v=5&lang=ru_RU&text=${query}`
      );
      
      if (response.data && response.data.results) {
        setSuggestions(
          response.data.results.map(item => item.title.displayName)
        );
      }
    } catch (error) {
      console.error("Ошибка получения подсказок:", error);
    }
  };

  // Обработчик ручного поиска адреса
  const handleAddressSearch = () => {
    if (!formData.address.trim()) {
      setErrors((prev) => ({
        ...prev,
        address: "Введите адрес для поиска",
      }));
      return;
    }

    if (!window.ymaps || !mapInstanceRef.current) {
      setErrors((prev) => ({
        ...prev,
        address: "Карта не готова. Попробуйте позже",
      }));
      return;
    }

    window.ymaps.geocode(formData.address).then((res) => {
      const firstGeoObject = res.geoObjects.get(0);

      if (firstGeoObject) {
        const coords = firstGeoObject.geometry.getCoordinates();
        setPlacemark(coords, mapInstanceRef.current);
        
        setErrors((prev) => ({
          ...prev,
          address: null,
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          address: "Адрес не найден",
        }));
      }
    }).catch(error => {
      console.error("Geocoding error:", error);
      setErrors((prev) => ({
        ...prev,
        address: "Ошибка поиска адреса",
      }));
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "address") {
      // Сбрасываем подсказки при изменении адреса
      setShowSuggestions(true);
      
      // Задержка для уменьшения количества запросов
      if (suggestTimerRef.current) {
        clearTimeout(suggestTimerRef.current);
      }
      
      suggestTimerRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    }

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      address: suggestion
    }));
    setShowSuggestions(false);
    handleAddressSearch();
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = "Введите название";
    if (!formData.description.trim())
      newErrors.description = "Введите описание";
    if (!formData.work_date) newErrors.work_date = "Укажите дату";
    if (!formData.address.trim()) newErrors.address = "Укажите адрес";

    const rateValue = parseFloat(formData.rate);
    if (isNaN(rateValue)) {
      newErrors.rate = "Введите числовое значение";
    } else if (rateValue <= 0) {
      newErrors.rate = "Ставка должна быть больше 0";
    }

    const workersValue = parseInt(formData.workers_needed);
    if (isNaN(workersValue)) {
      newErrors.workers_needed = "Введите числовое значение";
    } else if (workersValue < 1) {
      newErrors.workers_needed = "Нужен хотя бы 1 работник";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.is_verified || currentUser?.role !== "employer") {
      setVerificationError(
        "Для создания вакансий необходимо пройти верификацию"
      );
      return;
    }

    if (!validate()) return;

    const payload = {
      ...formData,
      required_skill_id: formData.required_skill_id || null,
      rate: parseFloat(formData.rate),
      workers_needed: parseInt(formData.workers_needed),
    };

    setIsSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/api/jobs`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      navigate("/employer-feed");
    } catch (error) {
      console.error("Ошибка создания вакансии:", error);

      let errorMessage = "Ошибка при создании вакансии";
      if (error.response) {
        if (error.response.data && error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.status === 401) {
          errorMessage = "Ошибка авторизации";
        } else if (error.response.status === 403) {
          errorMessage =
            "Только верифицированные работодатели могут создавать вакансии";
        } else if (error.response.status === 400) {
          errorMessage = "Некорректные данные вакансии";
        }
      }

      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.loader}></div>
          <p>Проверка статуса верификации...</p>
        </div>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.verificationRequired}>
          <div className={styles.verificationHeader}>
            <h2>Требуется верификация</h2>
            <div className={styles.verificationIcon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="#2C8161"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 8V12"
                  stroke="#2C8161"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 16H12.01"
                  stroke="#2C8161"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <p className={styles.verificationText}>{verificationError}</p>

          <div className={styles.verificationSteps}>
            <h3>Как пройти верификацию:</h3>
            <ol>
              <li>Перейдите в ваш профиль</li>
              <li>Загрузите документы, подтверждающие вашу компанию</li>
              <li>
                Дождитесь проверки администратора (обычно 1-2 рабочих дня)
              </li>
            </ol>
          </div>

          <div className={styles.verificationActions}>
            <button
              className={styles.primaryButton}
              onClick={() => navigate("/profile")}
            >
              Перейти в профиль для верификации
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => navigate(-1)}
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Создать вакансию</h1>
        <p>Заполните форму, чтобы опубликовать новую вакансию</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.vacancyForm}>
        <div className={styles.formGroup}>
          <label>
            Название вакансии <span>*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`${styles.formInput} ${styles.titleInput} ${
              errors.title ? styles.errorInput : ""
            }`}
            placeholder="Например: Официант на мероприятие"
          />
          {errors.title && (
            <span className={styles.errorMessage}>{errors.title}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>
            Описание <span>*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            className={`${styles.formTextarea} ${
              errors.description ? styles.errorInput : ""
            }`}
            placeholder="Опишите обязанности, требования и условия работы"
          />
          {errors.description && (
            <span className={styles.errorMessage}>{errors.description}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Требуемый навык</label>
          {loadingSkills ? (
            <div className={styles.skillsLoading}>
              <div className={styles.smallLoader}></div>
              <span>Загрузка навыков...</span>
            </div>
          ) : (
            <div className={styles.selectContainer}>
              <select
                name="required_skill_id"
                value={formData.required_skill_id}
                onChange={handleChange}
                className={styles.formSelect}
              >
                <option value="">Выберите навык (необязательно)</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>
              Дата работы <span>*</span>
            </label>
            <div className={styles.inputWithIcon}>
              <input
                type="date"
                name="work_date"
                value={formData.work_date}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
                className={`${styles.formInput} ${
                  errors.work_date ? styles.errorInput : ""
                }`}
              />
              <span className={styles.inputIcon}>📅</span>
            </div>
            {errors.work_date && (
              <span className={styles.errorMessage}>{errors.work_date}</span>
            )}
          </div>

          <div className={styles.timeContainer}>
            <div className={styles.formGroup}>
              <label>Время начала</label>
              <div className={styles.inputWithIcon}>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  className={styles.formInput}
                />
                <span className={styles.inputIcon}>⏰</span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Время окончания</label>
              <div className={styles.inputWithIcon}>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  className={styles.formInput}
                />
                <span className={styles.inputIcon}>⏰</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>
            Адрес <span>*</span>
          </label>
          <div className={styles.addressSearchContainer}>
            <div className={styles.inputWithIcon}>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={`${styles.formInput} ${
                  errors.address ? styles.errorInput : ""
                }`}
                placeholder="Где будет проходить работа"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddressSearch();
                  }
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              <span className={styles.inputIcon}>📍</span>
              
              {/* Подсказки адреса */}
              {showSuggestions && suggestions.length > 0 && (
                <div className={styles.suggestionsContainer}>
                  <ul className={styles.suggestionsList}>
                    {suggestions.map((suggestion, index) => (
                      <li 
                        key={index}
                        className={styles.suggestionItem}
                        onMouseDown={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              type="button"
              className={styles.searchButton}
              onClick={handleAddressSearch}
            >
              Найти
            </button>
          </div>
          {errors.address && (
            <span className={styles.errorMessage}>{errors.address}</span>
          )}
        </div>

        {/* Контейнер для карты */}
        <div className={styles.mapContainer}>
          <div ref={mapRef} className={styles.map}></div>
          <div className={styles.mapHint}>
            <p>
              Нажмите на карту, чтобы выбрать адрес или воспользуйтесь поиском
            </p>
            {mapLoading && (
              <div className={styles.mapLoader}>
                <div className={styles.smallLoader}></div>
                <span>Загрузка карты...</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>
              Ставка (₽) <span>*</span>
            </label>
            <div className={styles.inputWithIcon}>
              <input
                type="number"
                name="rate"
                value={formData.rate}
                onChange={handleChange}
                min="0"
                step="100"
                className={`${styles.formInput} ${
                  errors.rate ? styles.errorInput : ""
                }`}
                placeholder="1000"
              />
              <span className={styles.inputIcon}>💰</span>
            </div>
            {errors.rate && (
              <span className={styles.errorMessage}>{errors.rate}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>
              Количество работников <span>*</span>
            </label>
            <div className={styles.inputWithIcon}>
              <input
                type="number"
                name="workers_needed"
                value={formData.workers_needed}
                onChange={handleChange}
                min="1"
                className={`${styles.formInput} ${
                  errors.workers_needed ? styles.errorInput : ""
                }`}
              />
              <span className={styles.inputIcon}>👥</span>
            </div>
            {errors.workers_needed && (
              <span className={styles.errorMessage}>
                {errors.workers_needed}
              </span>
            )}
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => navigate(-1)}
          >
            Отмена
          </button>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className={styles.buttonSpinner}></span>
                Создание...
              </>
            ) : (
              "Создать вакансию"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateVacancyPage;