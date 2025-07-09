import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ChatsPage.css';

const ChatsPage = ({ user }) => {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

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
        console.error('Error loading chats:', error);
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
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  return (
    <div className="chats-page">
      <div className="chats-header">
        <h1>Chats</h1>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading chats...</p>
        </div>
      ) : (
        <div className="chats-list">
          {chats.length > 0 ? (
            chats.map(chat => (
              <div 
                key={chat.id} 
                className="chat-item"
                onClick={() => navigate(`/chats/${chat.id}`)}
              >
                <div className="chat-avatar">
                  <div className="avatar-placeholder">
                    {chat.interlocutor_name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                
                <div className="chat-info">
                  <div className="chat-header">
                    <div className="chat-name">{chat.interlocutor_name}</div>
                    <div className="chat-time">
                      {formatDate(chat.last_message_time)} {formatTime(chat.last_message_time)}
                    </div>
                  </div>
                  
                  <div className="chat-preview">
                    {chat.last_message}
                    {chat.unread_count > 0 && (
                      <div className="unread-badge">{chat.unread_count}</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-chats">
              <h3>No chats yet</h3>
              <p>Start a conversation by applying to a job</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatsPage;