from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey,Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Numeric(10, 2), nullable=False)
    commission = Column(Numeric(10, 2), default=0.0)  # Новое поле для комиссии
    status = Column(String(20), default="pending")
    payment_id = Column(String(50)) 
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_processed = Column(Boolean, default=False)
    user = relationship("User", back_populates="payments")