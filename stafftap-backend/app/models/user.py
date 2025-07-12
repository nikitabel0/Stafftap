from sqlalchemy import Column, Integer, String, Date, Enum, Boolean, BigInteger, DateTime, Numeric
from sqlalchemy.sql import func
from app.database import Base
import enum
from sqlalchemy.orm import relationship

class UserRole(str, enum.Enum):
    employer = "employer"
    worker = "worker"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=False, unique=True)
    birth_date = Column(Date, nullable=False)
    avatar_url = Column(String, nullable=True, default=None)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    company_name = Column(String, nullable=True)
    experience_months = Column(Integer, nullable=True)
    rate_per_shift = Column(Numeric(10, 2), nullable=True)
    is_verified = Column(Boolean, default=False)
    is_blocked = Column(Boolean, default=False)
    favorite_jobs = relationship("FavoriteJob", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
