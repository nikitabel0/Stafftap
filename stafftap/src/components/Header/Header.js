// Header.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  FiHome, FiHeart, FiMessageSquare, FiUser, 
  FiBell, FiSearch, FiX, FiSettings, FiLogOut 
} from "react-icons/fi";
import styles from './Header.module.css';
import API_BASE_URL from '../../apiConfig';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Переносим все хуки в начало
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [notificationCount, setNotificationCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  
  const wsRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // Проверка пути для скрытия хедера
  const shouldHideHeader = location.pathname.startsWith('/chats/');
  
  const isHomePage = location.pathname === "/";
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setIsMenuOpen(false);
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/feed")) setActiveTab("feed");
    else if (path.includes("/favorites")) setActiveTab("favorites");
    else if (path.includes("/chats")) setActiveTab("chats");
    else if (path.includes("/profile")) setActiveTab("profile");
    else if (path.includes("/notifications")) setActiveTab("notifications");
    else if (path.includes("/settings")) setActiveTab("settings");
  }, [location]);

  const getCurrentUserId = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const text = window.atob(base64);
      const payload = JSON.parse(decodeURIComponent(escape(text)));
      return payload.sub;
    } catch (e) {
      console.error('Failed to parse user ID', e);
      return null;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const userId = getCurrentUserId();
    if (!userId) return;
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/chats/ws?token=${token}`;
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected for chats');
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'chat_unread_update' && isMountedRef.current) {
          setChatUnreadCount(message.count);
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current.onclose = () => {
      if (!isMountedRef.current) return;
      console.log('WebSocket disconnected. Reconnecting...');
      setTimeout(connectWebSocket, 5000);
    };
  }, [getCurrentUserId]);

  const fetchCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const [notifications, chats] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/api/chats/unread-total`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (isMountedRef.current) {
        setNotificationCount(notifications.data.count);
        setChatUnreadCount(chats.data.total_unread);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Не выполняем запросы, если хедер скрыт
    if (shouldHideHeader) return;
    
    fetchCounts();
    connectWebSocket();
    
    const intervalId = setInterval(fetchCounts, 30000);
    
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchCounts, connectWebSocket, shouldHideHeader]);

  const navigateTo = useCallback((path) => {
    navigate(path);
    setActiveTab(path.split("/")[1] || "");
    if (isMobile) setIsMenuOpen(false);
  }, [navigate, isMobile]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setNotificationCount(0);
    setChatUnreadCount(0);
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    navigate('/login');
  }, [navigate]);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Возвращаем null после всех хуков
  if (shouldHideHeader) {
    return null;
  }
  return (
    <>
      <header className={`${styles.header} ${isHomePage && !scrolled ? styles.transparent : ''} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.logo} onClick={() => navigate("/")}>
          StaffTap
        </div>

        <nav className={styles.desktopNav}>
          <div 
            className={`${styles.navItem} ${activeTab === "feed" ? styles.active : ''}`} 
            onClick={() => navigateTo("/feed")}
          >
            <div className={styles.navIcon}>
              <FiHome />
            </div>
            <span className={styles.navLabel}>Лента</span>
          </div>
          
          <div 
            className={`${styles.navItem} ${activeTab === "favorites" ? styles.active : ''}`} 
            onClick={() => navigateTo("/favorites")}
          >
            <div className={styles.navIcon}>
              <FiHeart />
            </div>
            <span className={styles.navLabel}>Избранное</span>
          </div>
          
          <div 
            className={`${styles.navItem} ${activeTab === "chats" ? styles.active : ''}`} 
            onClick={() => navigateTo("/chats")}
          >
            <div className={styles.navIcon}>
              <FiMessageSquare />
              {chatUnreadCount > 0 && (
                <div className={styles.notificationBadge}>
                  {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                </div>
              )}
            </div>
            <span className={styles.navLabel}>Чаты</span>
          </div>
          
          <div 
            className={`${styles.navItem} ${activeTab === "profile" ? styles.active : ''}`} 
            onClick={() => navigateTo("/profile")}
          >
            <div className={styles.navIcon}>
              <FiUser />
            </div>
            <span className={styles.navLabel}>Профиль</span>
          </div>
          
          <div 
            className={`${styles.notificationIcon} ${activeTab === "notifications" ? styles.active : ''}`}
            onClick={() => navigateTo("/notifications")}
          >
            <FiBell />
            {notificationCount > 0 && (
              <div className={styles.notificationBadge}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </div>
            )}
          </div>
        </nav>

        {isMobile ? (
          <button 
            className={styles.menuToggle}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <FiX /> : "☰"}
          </button>
        ) : (
          <div className={styles.userActions}>
            <button 
              className={`${styles.settingsBtn} ${activeTab === "settings" ? styles.active : ''}`} 
              onClick={() => navigateTo("/settings")}
            >
              <FiSettings />
            </button>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <FiLogOut />
            </button>
          </div>
        )}
      </header>

      {isMobile && !isMenuOpen && (
        <div className={styles.mobileNavBar}>
          <div 
            className={`${styles.navItem} ${activeTab === "feed" ? styles.active : ''}`} 
            onClick={() => navigateTo("/feed")}
          >
            <div className={styles.navIcon}>
              <FiHome />
            </div>
            <span className={styles.navLabel}>Лента</span>
          </div>
          
          <div 
            className={`${styles.navItem} ${activeTab === "favorites" ? styles.active : ''}`} 
            onClick={() => navigateTo("/favorites")}
          >
            <div className={styles.navIcon}>
              <FiHeart />
            </div>
            <span className={styles.navLabel}>Избранное</span>
          </div>
          
          <div 
            className={`${styles.navItem} ${activeTab === "chats" ? styles.active : ''}`} 
            onClick={() => navigateTo("/chats")}
          >
            <div className={styles.navIcon}>
              <FiMessageSquare />
              {chatUnreadCount > 0 && (
                <div className={styles.notificationBadge}>
                  {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                </div>
              )}
            </div>
            <span className={styles.navLabel}>Чаты</span>
          </div>
          
          <div 
            className={`${styles.navItem} ${activeTab === "profile" ? styles.active : ''}`} 
            onClick={() => navigateTo("/profile")}
          >
            <div className={styles.navIcon}>
              <FiUser />
            </div>
            <span className={styles.navLabel}>Профиль</span>
          </div>
        </div>
      )}

      {isMobile && isMenuOpen && (
        <div className={`${styles.mobileMenu} ${isMenuOpen ? styles.open : ''}`}>
          <div className={styles.mobileMenuHeader}>
            <button 
              className={styles.closeMenu}
              onClick={closeMenu}
            >
              <FiX />
            </button>
          </div>
          
          <div className={styles.menuItems}>
            <div 
              className={`${styles.menuItem} ${activeTab === "notifications" ? styles.active : ''}`}
              onClick={() => navigateTo("/notifications")}
            >
              <div className={styles.menuIcon}>
                <FiBell />
              </div>
              <span className={styles.menuLabel}>Уведомления</span>
              {notificationCount > 0 && (
                <div className={styles.menuNotification}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </div>
              )}
            </div>
            
            <div 
              className={`${styles.menuItem} ${activeTab === "chats" ? styles.active : ''}`}
              onClick={() => navigateTo("/chats")}
            >
              <div className={styles.menuIcon}>
                <FiMessageSquare />
              </div>
              <span className={styles.menuLabel}>Чаты</span>
              {chatUnreadCount > 0 && (
                <div className={styles.menuNotification}>
                  {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                </div>
              )}
            </div>
            
            <div 
              className={`${styles.menuItem} ${activeTab === "settings" ? styles.active : ''}`}
              onClick={() => navigateTo("/settings")}
            >
              <div className={styles.menuIcon}>
                <FiSettings />
              </div>
              <span className={styles.menuLabel}>Настройки</span>
            </div>
            
            <div 
              className={styles.menuItem}
              onClick={handleLogout}
            >
              <div className={styles.menuIcon}>
                <FiLogOut />
              </div>
              <span className={styles.menuLabel}>Выйти</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;