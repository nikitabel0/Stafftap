from sqlalchemy import Column, Integer, String, Date, Enum, Boolean, BigInteger, DateTime, Numeric, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import enum
from sqlalchemy.orm import relationship


class UserRole(str, enum.Enum):
    employer = "employer"
    worker = "worker"
    admin = "admin"
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True)
    telegram_username = Column(String, unique=True, nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True) 
    birth_date = Column(Date, nullable=True)
    avatar_url = Column(String, nullable=True, default=None)
    email = Column(String, nullable=True, unique=True)
    password_hash = Column(String, nullable=True)
    role = Column(Enum(UserRole), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_archived = Column(Boolean, default=False) 
    company_name = Column(String, nullable=True)
    experience_months = Column(Integer, nullable=True)
    rate_per_shift = Column(Numeric(10, 2), nullable=True)
    is_verified = Column(Boolean, default=False)
    balance = Column(Numeric(10, 2), default=0.00)
    is_blocked = Column(Boolean, default=False)
    payments = relationship("Payment", back_populates="user")
    documents = relationship(
        "EmployerDocument", 
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    favorite_jobs = relationship(
        "FavoriteJob", 
        back_populates="user", 
        cascade="all, delete-orphan"
    )

    frozen_balance = Column(Numeric(10, 2), default=0.0)
    withdrawal_requests = relationship("WithdrawalRequest", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    skills = relationship("Skill", secondary="user_skills", back_populates="users")
    availability = relationship("WorkerAvailability", back_populates="worker", cascade="all, delete-orphan")
    is_registration_complete = Column(Boolean, default=False, nullable=False)

