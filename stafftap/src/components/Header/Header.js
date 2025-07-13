import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  FiHome, 
  FiHeart, 
  FiMessageSquare, 
  FiUser, 
  FiBell, 
  FiSearch, 
  FiX,
  FiSettings,
  FiLogOut
} from "react-icons/fi";
import './Header.css';
import API_BASE_URL from '../../apiConfig';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [notificationCount, setNotificationCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  
  const wsRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  const isHomePage = location.pathname === "/";
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setIsMenuOpen(false);
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
  }, [location]);

  const getCurrentUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      return payload.sub;
    } catch (e) {
      console.error('Failed to parse user ID', e);
      return null;
    }
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const userId = getCurrentUserId();
    if (!userId) return;
    
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/chats/ws?token=${token}`;
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected for chats');
    };
    
    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('WebSocket message:', message);
      
      if (message.type === 'chat_unread_update') {
        setChatUnreadCount(message.count);
      }
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting in 5 seconds...');
      setTimeout(connectWebSocket, 5000);
    };
  };

  const fetchCounts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Уведомления
        const notificationsResponse = await axios.get(
          `${API_BASE_URL}/api/notifications/unread-count`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotificationCount(notificationsResponse.data.count);
        
        // Непрочитанные сообщения
        const chatsResponse = await axios.get(
          `${API_BASE_URL}/api/chats/unread-total`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setChatUnreadCount(chatsResponse.data.total_unread);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    }
  };

  useEffect(() => {
    fetchCounts();
    connectWebSocket();
    
    // Периодическая проверка каждые 30 секунд
    const intervalId = setInterval(fetchCounts, 30000);
    
    return () => {
      clearInterval(intervalId);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const navigateTo = (path) => {
    navigate(path);
    setActiveTab(path.split("/")[1]);
    if (isMobile) setIsMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (wsRef.current) {
      wsRef.current.close();
    }
    navigate('/login');
  };

  return (
    <>
      <header className={`header ${isHomePage && !scrolled ? 'transparent' : ''} ${scrolled ? 'scrolled' : ''}`}>
        <div className="logo" onClick={() => navigate("/")}>
          StaffTap
        </div>

        {!isMobile && (
          <div className="search-container">
            <div className="search-bar">
              <FiSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Поиск вакансий, сотрудников..." 
                className="search-input"
              />
            </div>
          </div>
        )}

        {!isMobile && (
          <nav className="desktop-nav">
            <NavItem 
              icon={<FiHome />} 
              label="Лента" 
              active={activeTab === "feed"} 
              onClick={() => navigateTo("/feed")}
            />
            
            <NavItem 
              icon={<FiHeart />} 
              label="Избранное" 
              active={activeTab === "favorites"} 
              onClick={() => navigateTo("/favorites")}
            />
            
            <NavItem 
              icon={<FiMessageSquare />} 
              label="Чаты" 
              active={activeTab === "chats"} 
              onClick={() => navigateTo("/chats")}
              notification={chatUnreadCount}
            />
            
            <NavItem 
              icon={<FiUser />} 
              label="Профиль" 
              active={activeTab === "profile"} 
              onClick={() => navigateTo("/profile")}
            />
            
            <div 
              className={`notification-icon ${activeTab === "notifications" ? 'active' : ''}`}
              onClick={() => navigateTo("/notifications")}
            >
              <FiBell />
              {notificationCount > 0 && (
                <div className="notification-badge">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </div>
              )}
            </div>
          </nav>
        )}

        {isMobile && (
          <button 
            className="menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <FiX /> : "☰"}
          </button>
        )}
      </header>

      {isMobile && !isMenuOpen && (
        <div className="mobile-nav-bar">
          <NavItem 
            icon={<FiHome />} 
            label="Лента" 
            active={activeTab === "feed"} 
            onClick={() => navigateTo("/feed")}
            mobile
          />
          
          <NavItem 
            icon={<FiHeart />} 
            label="Избранное" 
            active={activeTab === "favorites"} 
            onClick={() => navigateTo("/favorites")}
            mobile
          />
          
          <NavItem 
            icon={<FiMessageSquare />} 
            label="Чаты" 
            active={activeTab === "chats"} 
            onClick={() => navigateTo("/chats")}
            mobile
            notification={chatUnreadCount}
          />
          
          <NavItem 
            icon={<FiUser />} 
            label="Профиль" 
            active={activeTab === "profile"} 
            onClick={() => navigateTo("/profile")}
            mobile
          />
        </div>
      )}

      {isMobile && isMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-header">
            <button 
              className="close-menu"
              onClick={() => setIsMenuOpen(false)}
            >
              <FiX />
            </button>
          </div>
          
          <div className="mobile-search">
            <div className="search-bar">
              <FiSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Поиск..." 
                className="search-input"
              />
            </div>
          </div>
          
          <div className="menu-items">
            <MenuItem 
              icon={<FiBell />} 
              label="Уведомления" 
              notification={notificationCount}
              onClick={() => navigateTo("/notifications")}
            />
            
            <MenuItem 
              icon={<FiMessageSquare />}
              label="Чаты" 
              notification={chatUnreadCount}
              onClick={() => navigateTo("/chats")}
            />
            
            <MenuItem 
              icon={<FiSettings />}
              label="Настройки" 
              onClick={() => navigateTo("/settings")}
            />
            
            <MenuItem 
              icon={<FiLogOut />}
              label="Выйти" 
              onClick={handleLogout}
            />
          </div>
        </div>
      )}
    </>
  );
};

const NavItem = ({ icon, label, active, notification, onClick, mobile }) => (
  <div 
    className={`nav-item ${active ? 'active' : ''} ${mobile ? 'mobile' : ''}`} 
    onClick={onClick}
  >
    <div className="nav-icon">
      {icon}
      {notification > 0 && (
        <div className="notification-badge">
          {notification > 9 ? '9+' : notification}
        </div>
      )}
    </div>
    <span className="nav-label">{label}</span>
  </div>
);

const MenuItem = ({ icon, label, notification, onClick }) => (
  <div className="menu-item" onClick={onClick}>
    <div className="menu-icon">
      {icon}
    </div>
    <span className="menu-label">{label}</span>
    {notification > 0 && (
      <div className="menu-notification">
        {notification > 9 ? '9+' : notification}
      </div>
    )}
  </div>
);

export default Header;