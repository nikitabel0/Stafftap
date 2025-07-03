import logging

from sqlalchemy.orm import Session
from app.schemas.user import UserCreate
from app.models.user import User
from passlib.hash import bcrypt
from sqlalchemy.exc import IntegrityError

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user: UserCreate):
    hashed_password = bcrypt.hash(user.password)
    db_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        birth_date=user.birth_date,
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        profession=user.profession if user.role == "worker" else None
    )
    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
        return db_user
    except IntegrityError as e:
        db.rollback()
        logging.error(f"Ошибка при создании пользователя: {e.orig}")  # Вывод подробностей из БД
        return None

def verify_password(plain_password: str, hashed_password: str):
    return bcrypt.verify(plain_password, hashed_password)
