from sqlalchemy import Column, Integer, ForeignKey, Numeric, String, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base

class WithdrawalRequest(Base):
    __tablename__ = "withdrawal_requests"

    id = Column(Integer, primary_key=True)
    worker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_details = Column(JSON, nullable=False)
    status = Column(String(20), default="pending")
    fee = Column(Numeric(10, 2), default=0)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
