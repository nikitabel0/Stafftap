import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiMessageSquare, FiSearch } from "react-icons/fi";
import styles from './ChatsPage.module.css';
import API_BASE_URL from '../../apiConfig';

const ChatsPage = ({ user }) => {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const headerRef = useRef(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/api/chats/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setChats(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error("Ошибка загрузки чатов:", error);
        setIsLoading(false);
      }
    };

    fetchChats();
  }, []);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return "Сегодня";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return "Вчера";
    }

    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  };

  const filteredChats = chats.filter((chat) =>
    chat.interlocutor_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader} ref={headerRef}>
        <h1>Чаты</h1>
        <div className={styles.searchContainer}>
          <div className={styles.searchBar}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Поиск собеседников..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
      </div>

      <div className={styles.chatsContent}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loader}></div>
            <p>Загрузка чатов...</p>
          </div>
        ) : (
          <div className={styles.chatsList}>
            {filteredChats.length > 0 ? (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={styles.chatItem}
                  onClick={() => navigate(`/chats/${chat.id}`)}
                >
                  <div className={styles.avatarContainer}>
                    <div className={styles.avatarPlaceholder}>
                      {chat.interlocutor_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                  </div>

                  <div className={styles.messageInfo}>
                    <div className={styles.senderRow}>
                      <div className={styles.senderName}>
                        {chat.interlocutor_name}
                      </div>
                      <div className={styles.messageTime}>
                        {formatDate(chat.last_message_time)} •{" "}
                        {formatTime(chat.last_message_time)}
                      </div>
                    </div>

                    <div className={styles.previewRow}>
                      <div className={styles.messagePreview}>
                        {chat.last_message || "Нет сообщений"}
                      </div>
                      {chat.unread_count > 0 && (
                        <div className={styles.unreadCount}>{chat.unread_count}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noChats}>
                <div className={styles.noChatsIcon}>
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