import React, { useState, useEffect } from "react";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./page/login/Login";
import Register from "./page/registr/Register";
import Profile from "./page/profile/Profile";

function App() {
  const [user, setUser] = useState(null);

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get("http://localhost:8000/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser(res.data);
    } catch (err) {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };
    const appStyle = {
    minHeight: '100vh',
    background: '#f7efed url("/back.svg") no-repeat right bottom fixed',
    backgroundSize: '400px' 
  };

  return (
        <div style={appStyle}>
      <Router>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/profile" /> : <Login onLogin={fetchProfile} />} />
          <Route path="/register" element={user ? <Navigate to="/profile" /> : <Register onRegister={fetchProfile} />} />
          <Route path="/profile" element={user ? <Profile user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to={user ? "/profile" : "/login"} />} />
        </Routes>
      </Router>
      </div>
  );
}

export default App;
