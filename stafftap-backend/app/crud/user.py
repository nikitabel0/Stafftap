import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.hash import bcrypt

from app.models.user import User
from app.schemas.user import UserCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, user: UserCreate) -> User | None:
    hashed_password = bcrypt.hash(user.password)

    db_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        birth_date=user.birth_date,
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        telegram_id=None,

        
        experience_months=user.experience_months,
        rate_per_shift=user.rate_per_shift,

        
        company_name=user.company_name,
    )

    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
        return db_user
    except IntegrityError as e:
        db.rollback()
        logging.error(f"Ошибка при создании пользователя: {e.orig}")
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.verify(plain_password, hashed_password)


def get_user_by_telegram_id(db: Session, telegram_id: int):
    return db.query(User).filter(User.telegram_id == telegram_id).first()

def create_user_via_telegram(db: Session, telegram_id: int, user_data: dict):
    user = User(
        telegram_id=telegram_id,
        first_name=user_data.get('first_name', ''),
        last_name=user_data.get('last_name', ''),
        phone="",  
        birth_date=None,
        email=None,
        password_hash="",  
        role=None,
        avatar_url=user_data.get('photo_url', ''),
        is_verified=False,
        balance=0.00,
        is_blocked=False,
        frozen_balance=0.0,
        company_name=None,
        experience_months=None,
        rate_per_shift=None,
        is_registration_complete=False  
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
