from sqlalchemy import Column, Integer,  Enum , ForeignKey, String, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum
class BookingType(str, enum.Enum):
    worker_initiated = "worker_initiated"
    employer_initiated = "employer_initiated"

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="pending")
    employer_confirmed = Column(Boolean, default=False)
    worker_confirmed = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    # Relationships
    disputes = relationship("Dispute", back_populates="booking")

    job = relationship("Job", back_populates="bookings")
    worker = relationship("User", foreign_keys=[worker_id])
    chat = relationship("Chat", uselist=False, back_populates="booking")
    booking_type = Column(Enum(BookingType), default=BookingType.worker_initiated)
    frozen_funds = relationship("FrozenFunds", backref="booking", uselist=False, cascade="all, delete-orphan")