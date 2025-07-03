import React from "react";

function Profile({ user, onLogout }) {
    return (
        <div style={{ maxWidth: 400, margin: "auto", paddingTop: 50 }}>
            <h2>Профиль</h2>
            <p><b>Имя:</b> {user.first_name}</p>
            <p><b>Фамилия:</b> {user.last_name}</p>
            <p><b>Телефон:</b> {user.phone}</p>
            <p><b>Дата рождения:</b> {user.birth_date}</p>
            <p><b>Email:</b> {user.email}</p>
            <p><b>Роль:</b> {user.role}</p>
            {user.role === "worker" && <p><b>Профессия:</b> {user.profession}</p>}

            <button onClick={onLogout} style={{ marginTop: 20 }}>Выйти</button>
        </div>
    );
}

export default Profile;
