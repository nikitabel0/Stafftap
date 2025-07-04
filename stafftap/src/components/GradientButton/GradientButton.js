import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Компонент градиентной кнопки
function GradientButton  ({ disabled, children, ...props }) {
  const buttonStyle = {
    width: "100%",
    height: "56px",
    borderRadius: "12px",
    color: "white",
    fontWeight: "600",
    fontSize: "16px",
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    outline: "none",
    background: disabled 
      ? "#8D8D8D" 
      : "linear-gradient(to right, #2C8161, #56BD66)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "0",
    transition: "background 0.3s ease",
  };

  return (
    <button 
      style={buttonStyle} 
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
export default GradientButton