from sqlalchemy import Column, Integer, String, Date, Enum, Boolean, BigInteger, DateTime, Numeric, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import enum
from sqlalchemy.orm import relationship
from datetime import date, datetime, time


class WithdrawalRequest(Base):
    __tablename__ = "withdrawal_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default="pending")  
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    admin_comment = Column(String, nullable=True)
    payment_method = Column(String(50), nullable=False)  # Исправлено: payment_method
    wallet_address = Column(String(255), nullable=False)  
    user = relationship("User", back_populates="withdrawal_requests")