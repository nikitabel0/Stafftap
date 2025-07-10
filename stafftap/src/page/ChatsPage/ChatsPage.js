import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiMessageSquare, FiSearch } from 'react-icons/fi';
import './ChatsPage.css';

const ChatsPage = ({ user }) => {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const headerRef = useRef(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:8000/api/chats', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setChats(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        setIsLoading(false);
      }
    };

    fetchChats();
  }, []);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    }
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const filteredChats = chats.filter(chat => 
    chat.interlocutor_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chats-page">
      <div className="chats-header" ref={headerRef}>
        <div className="header-content">
          <h1>Чаты</h1>
          <div className="search-container">
            <div className="search-bar">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Поиск собеседников..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="chats-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loader"></div>
            <p>Загрузка чатов...</p>
          </div>
        ) : (
          <div className="chats-list">
            {filteredChats.length > 0 ? (
              filteredChats.map(chat => (
                <div 
                  key={chat.id} 
                  className="chat-item"
                  onClick={() => navigate(`/chats/${chat.id}`)}
                >
                  <div className="avatar-container">
                    <div className="avatar-placeholder">
                      {chat.interlocutor_name.split(' ').map(n => n[0]).join('')}
                    </div>
                  </div>
                  
                  <div className="message-info">
                    <div className="sender-row">
                      <div className="sender-name">{chat.interlocutor_name}</div>
                      <div className="message-time">
                        {formatDate(chat.last_message_time)} • {formatTime(chat.last_message_time)}
                      </div>
                    </div>
                    
                    <div className="preview-row">
                      <div className="message-preview">
                        {chat.last_message || 'Нет сообщений'}
                      </div>
                      {chat.unread_count > 0 && (
                        <div className="unread-count">{chat.unread_count}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-chats">
                <div className="no-chats-icon">
                  <FiMessageSquare size={48} />
                </div>
                <h3>Нет чатов</h3>
                <p>Начните общение, откликнувшись на вакансию</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatsPage;