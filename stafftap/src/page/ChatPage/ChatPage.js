import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiSend, FiChevronLeft, FiMoreVertical } from "react-icons/fi";
import "./ChatPage.css";
import API_BASE_URL from "../../apiConfig";

const ChatPage = ({ user }) => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [interlocutor, setInterlocutor] = useState({
    id: "",
    name: "Загрузка...",
    avatar: null,
    status: "offline",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const ws = useRef(null);

  // Функция для генерации красивой аватарки по имени
  const generateAvatar = useCallback((name) => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#2C8161",
      "#56BD66",
    ];
    const char = name.charAt(0).toUpperCase();
    const colorIndex =
      [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      colors.length;
    return (
      <div
        className="avatar-placeholder"
        style={{ backgroundColor: colors[colorIndex] }}
      >
        {char}
      </div>
    );
  }, []);

  useEffect(() => {
    const fetchChatData = async () => {
      try {
        const token = localStorage.getItem("token");

        // Загрузка информации о чате и собеседнике
        const chatRes = await axios.get(
          ` ${API_BASE_URL}/api/chats/${chatId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const chatData = chatRes.data;
        setInterlocutor({
          id: chatData.interlocutor_id,
          name: chatData.interlocutor_name,
          avatar: chatData.avatar,
          status: chatData.status || "offline",
        });

        // Загрузка сообщений
        const messagesRes = await axios.get(
          ` ${API_BASE_URL}/api/chats/${chatId}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMessages(messagesRes.data);

        setIsLoading(false);
        scrollToBottom();

        // Подключение к WebSocket
        const connectWebSocket = () => {
          ws.current = new WebSocket(
            `ws://${API_BASE_URL}/api/chats/ws/${user.id}`
          );

          ws.current.onopen = () => {
            console.log("WebSocket connected");
          };

          ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.chat_id === parseInt(chatId)) {
              setMessages((prev) => [...prev, message]);
              scrollToBottom();
            }
          };

          ws.current.onerror = (error) => {
            console.error("WebSocket error:", error);
            // Переподключение через 5 секунд
            setTimeout(() => connectWebSocket(), 5000);
          };

          ws.current.onclose = () => {
            console.log("WebSocket disconnected");
          };
        };

        connectWebSocket();
      } catch (error) {
        console.error("Ошибка при загрузке чата:", error);
        setIsLoading(false);
        alert("Не удалось загрузить чат. Попробуйте позже.");
      }
    };

    fetchChatData();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [chatId, user.id, generateAvatar]);

  // Автоматическая прокрутка к последнему сообщению
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    let tempMessage;

    try {
      setIsSending(true);
      const token = localStorage.getItem("token");

      // Создаем временное сообщение
      tempMessage = {
        id: `temp-${Date.now()}`,
        chat_id: parseInt(chatId),
        sender_id: user.id,
        content: newMessage,
        is_read: false,
        sent_at: new Date().toISOString(),
        is_temp: true,
      };

      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");
      scrollToBottom();

      // Отправка сообщения через API
      const response = await axios.post(
        ` ${API_BASE_URL}/api/chats/${chatId}/messages`,
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Заменяем временное сообщение на постоянное
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id ? { ...response.data, is_temp: false } : msg
        )
      );
    } catch (error) {
      console.error("Ошибка при отправке сообщения:", error);
      if (tempMessage) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempMessage.id ? { ...msg, error: true } : msg
          )
        );
      }
      alert("Не удалось отправить сообщение. Проверьте соединение.");
    } finally {
      setIsSending(false);
    }
  };

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

    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
  };

  // Группировка сообщений по дням
  const groupMessagesByDate = () => {
    return messages.reduce((groups, message) => {
      const date = new Date(message.sent_at).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
      return groups;
    }, {});
  };

  const groupedMessages = groupMessagesByDate();

  return (
    <div className="chat-page">
      {/* Шапка чата */}
      <div className="chat-header">
        <button className="back-button" onClick={() => navigate("/chats")}>
          <FiChevronLeft size={24} />
        </button>

        {interlocutor.avatar ? (
          <img
            src={interlocutor.avatar}
            alt={interlocutor.name}
            className="interlocutor-avatar"
          />
        ) : (
          generateAvatar(interlocutor.name)
        )}

        <div className="interlocutor-info">
          <h2>{interlocutor.name}</h2>
          <p className="status">
            <span className={`status-dot ${interlocutor.status}`}></span>
            {interlocutor.status === "online" ? "В сети" : "Не в сети"}
          </p>
        </div>

        <button className="menu-button">
          <FiMoreVertical size={20} />
        </button>
      </div>

      {/* Область сообщений */}
      <div className="messages-container">
        {isLoading ? (
          <div className="loading-messages">
            <div className="loader"></div>
            <p>Загрузка сообщений...</p>
          </div>
        ) : Object.keys(groupedMessages).length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">
              <div className="icon-wrapper">
                <FiSend size={48} />
              </div>
            </div>
            <h3>Начните общение</h3>
            <p>Отправьте первое сообщение {interlocutor.name}</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, messages]) => (
            <div key={date} className="message-group">
              <div className="date-divider">
                <span>{formatDate(date)}</span>
              </div>

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${
                    message.sender_id === user.id ? "sent" : "received"
                  }`}
                >
                  <div className="message-content">
                    <div className="message-text">
                      {message.content}
                      {message.error && (
                        <span className="error-icon" title="Не отправлено">
                          ⚠️
                        </span>
                      )}
                    </div>
                    <div className="message-meta">
                      <span className="message-time">
                        {formatTime(message.sent_at)}
                      </span>
                      {message.sender_id === user.id && message.is_read && (
                        <span className="read-status">✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="message-input-container">
        <div className="input-wrapper">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Напишите сообщение..."
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isSending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className="send-button"
          >
            <FiSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
