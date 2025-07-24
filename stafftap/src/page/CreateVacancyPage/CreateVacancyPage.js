import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./CreateVacancyPage.module.css";
import API_BASE_URL from "../../apiConfig";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Фикс для иконок маркера
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Компонент для изменения центра карты
const ChangeMapView = ({ center }) => {
  const map = useMap();
  map.setView(center);
  return null;
};

// Компонент для обработки кликов на карте
const MapClickHandler = ({ onClick }) => {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng);
    }
  });
  return null;
};

const CreateVacancyPage = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    required_skill_id: "",
    custom_skill: "",
    work_date: "",
    start_time: "09:00",
    end_time: "18:00",
    address: "",
    rate: "",
    workers_needed: 1,
    latitude: null,
    longitude: null,
    establishment_name: "",
    photo_urls: [],
  });

  const MAX_PHOTOS = 5;

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (formData.photo_urls.length + files.length > MAX_PHOTOS) {
      alert(`Максимальное количество фотографий: ${MAX_PHOTOS}`);
      return;
    }

    const uploadedUrls = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        alert(`Файл ${file.name} не является изображением`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(`Файл ${file.name} слишком большой (макс. 5MB)`);
        continue;
      }

      const formData = new FormData();
      formData.append("photo", file);

      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/jobs/upload`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        uploadedUrls.push(response.data.url);
      } catch (error) {
        console.error("Ошибка загрузки фото:", error);
        alert(`Не удалось загрузить фото: ${file.name}`);
      }
    }

    setFormData((prev) => ({
      ...prev,
      photo_urls: [...prev.photo_urls, ...uploadedUrls],
    }));
  };

  const handleRemovePhoto = (index) => {
    setFormData((prev) => {
      const newPhotos = [...prev.photo_urls];
      newPhotos.splice(index, 1);
      return {
        ...prev,
        photo_urls: newPhotos,
      };
    });
  };

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [verificationError, setVerificationError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const mapRef = useRef(null);
  const suggestTimerRef = useRef(null);
  const [mapCenter, setMapCenter] = useState([55.751244, 37.618423]); // Центр Москвы по умолчанию

  // Fetch user and skills
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

  // Reverse geocoding using OpenStreetMap Nominatim
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      
      if (response.data && response.data.display_name) {
        setFormData(prev => ({
          ...prev,
          address: response.data.display_name
        }));
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
  }, []);

  // Forward geocoding for address search
  const forwardGeocode = async (address) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      
      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        // Update form data
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          address: response.data[0].display_name
        }));
        
        // Center the map on new location
        setMapCenter([latitude, longitude]);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Geocoding error:", error);
      return false;
    }
  };

  // Fetch address suggestions
  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );

      if (response.data) {
        setSuggestions(
          response.data.map(item => item.display_name)
        );
      }
    } catch (error) {
      console.error("Ошибка получения подсказок:", error);
    }
  };

  const handleAddressSearch = async () => {
    if (!formData.address.trim()) {
      setErrors((prev) => ({
        ...prev,
        address: "Введите адрес для поиска",
      }));
      return;
    }

    const found = await forwardGeocode(formData.address);
    if (!found) {
      setErrors((prev) => ({
        ...prev,
        address: "Адрес не найден",
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        address: null,
      }));
    }
  };

  const handleMapClick = useCallback((latlng) => {
    const { lat, lng } = latlng;
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "address") {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        latitude: null,
        longitude: null
      }));
    } else {
      setFormData(prev => ({...prev, [name]: value}));
    }

    if (name === "address") {
      setShowSuggestions(true);
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
    setFormData((prev) => ({
      ...prev,
      address: suggestion,
      latitude: null,
      longitude: null
    }));
    setShowSuggestions(false);
    
    // Automatically search when suggestion is selected
    setTimeout(() => handleAddressSearch(), 10);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = "Введите название";
    if (!formData.description.trim())
      newErrors.description = "Введите описание";
    if (!formData.work_date) newErrors.work_date = "Укажите дату";
    if (!formData.address.trim()) newErrors.address = "Укажите адрес";
    
    if (formData.latitude === null || formData.longitude === null) {
      newErrors.address = "Адрес должен быть реальным. Выберите из подсказок или укажите на карте.";
    }

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

    if (formData.latitude === null || formData.longitude === null) {
      setErrors(prev => ({
        ...prev,
        address: "Необходимо подтвердить реальный адрес на карте"
      }));
      return;
    }

    if (!validate()) return;

    if (formData.photo_urls.length > MAX_PHOTOS) {
      alert(`Максимальное количество фотографий: ${MAX_PHOTOS}`);
      return;
    }

    if (formData.required_skill_id && formData.custom_skill) {
      alert(
        "Укажите либо навык из списка, либо свой собственный, но не оба сразу"
      );
      return;
    }

    const payload = {
      ...formData,
      required_skill_id: formData.required_skill_id || null,
      custom_skill: formData.custom_skill || null,
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
          <label>Название заведения</label>
          <input
            type="text"
            name="establishment_name"
            value={formData.establishment_name}
            onChange={handleChange}
            className={styles.formInput}
            placeholder="Введите название заведения"
          />
        </div>

        <div className={styles.formGroup}>
          <div className={styles.fileInputWrapper}>
            <button type="button" className={styles.fileInputButton}>
              Выбрать фотографии
            </button>
            <input
              type="file"
              className={styles.fileInput}
              onChange={handlePhotoUpload}
              accept="image/*"
              multiple
            />
          </div>
          <p className={styles.photoHint}>
            Максимум {MAX_PHOTOS} фото. Разрешены JPG, PNG. Макс. размер 5MB.
          </p>
          <div className={styles.photosPreview}>
            {formData.photo_urls.map((url, index) => (
              <div key={index} className={styles.photoItem}>
                <img src={url} alt={`Preview ${index}`} />
                <button
                  type="button"
                  className={styles.removePhotoButton}
                  onClick={() => handleRemovePhoto(index)}
                  aria-label="Удалить фото"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
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
            <div className={styles.skillSelection}>
              <div className={styles.selectContainer}>
                <select
                  name="required_skill_id"
                  value={formData.required_skill_id}
                  onChange={(e) => {
                    handleChange(e);
                    setFormData((prev) => ({ ...prev, custom_skill: "" }));
                  }}
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
              <div className={styles.skillDivider}>или</div>
              <input
                type="text"
                name="custom_skill"
                value={formData.custom_skill}
                onChange={(e) => {
                  handleChange(e);
                  setFormData((prev) => ({ ...prev, required_skill_id: "" }));
                }}
                className={styles.formInput}
                placeholder="Введите свой вариант навыка"
                maxLength={100}
              />
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
          <label>Адрес <span>*</span></label>
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
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              <span className={styles.inputIcon}>📍</span>

              {showSuggestions && suggestions.length > 0 && (
                <div className={styles.suggestionsContainer}>
                  <ul className={styles.suggestionsList}>
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        className={styles.suggestionItem}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSuggestionClick(suggestion);
                        }}
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

        <div className={styles.mapContainer}>
          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            className={styles.map}
            whenCreated={mapInstance => mapRef.current = mapInstance}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {formData.latitude && formData.longitude && (
              <Marker position={[formData.latitude, formData.longitude]} />
            )}
            <ChangeMapView center={mapCenter} />
            <MapClickHandler onClick={handleMapClick} />
          </MapContainer>
          
          <div className={styles.mapHint}>
            {formData.latitude ? (
              <p className={styles.mapSuccess}>
                ✓ Адрес подтвержден: {formData.address}
              </p>
            ) : (
              <p>Нажмите на карту, чтобы выбрать адрес или воспользуйтесь поиском</p>
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