from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base
from datetime import date, datetime, time
from sqlalchemy.orm import relationship

class Dispute(Base):
    __tablename__ = "disputes"
    
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)  # Убедитесь, что этот столбец есть
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=False)
    initiator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="open")
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime)
    
    # Relationships
    booking = relationship("Booking", back_populates="disputes")
    job = relationship("Job")
    worker = relationship("User", foreign_keys=[worker_id])
