
from sqlalchemy import Column, Integer, ForeignKey, Numeric, String, DateTime, Enum
from sqlalchemy.sql import func
from app.database import Base
from sqlalchemy.orm import relationship

class FrozenFunds(Base):
    __tablename__ = "frozen_funds"
    
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"))
    amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    released_at = Column(DateTime, nullable=True)