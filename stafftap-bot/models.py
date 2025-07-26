from sqlalchemy import Column, Integer, String, Enum, BigInteger, DateTime, Boolean, Numeric, Date, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum
from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey,Boolean
from sqlalchemy.orm import relationship
from datetime import datetime


Base = declarative_base()

class UserRole(str, enum.Enum):
    employer = "employer"
    worker = "worker"
    admin = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)
    avatar_url = Column(String, nullable=True)
    email = Column(String, nullable=True, unique=True)
    password_hash = Column(String, nullable=True)
    role = Column(Enum(UserRole), nullable=True)
    blocked_until = Column(DateTime, nullable=True)
    block_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    company_name = Column(String, nullable=True)
    experience_months = Column(Integer, nullable=True)
    rate_per_shift = Column(Numeric(10, 2), nullable=True)
    is_verified = Column(Boolean, default=False)
    balance = Column(Numeric(10, 2), default=0.00)
    is_blocked = Column(Boolean, default=False)
    frozen_balance = Column(Numeric(10, 2), default=0.0)
    is_registration_complete = Column(Boolean, default=False)
    payments = relationship("Payment", back_populates="user")

class BotSetting(Base):
    __tablename__ = "bot_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text, nullable=False)

class CommissionSetting(Base):
    __tablename__ = "commission_settings"
    
    id = Column(Integer, primary_key=True)
    is_active = Column(Boolean, default=True)
    commission_type = Column(String(20), default="percentage")  
    value = Column(Numeric(5, 2), default=0.0)  
    min_amount = Column(Numeric(10, 2), default=0.0)  
    description = Column(String(255), nullable=True)

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Numeric(10, 2), nullable=False)
    commission = Column(Numeric(10, 2), default=0.0)  
    status = Column(String(20), default="pending")
    payment_id = Column(String(50)) 
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_processed = Column(Boolean, default=False)
    user = relationship("User", back_populates="payments")