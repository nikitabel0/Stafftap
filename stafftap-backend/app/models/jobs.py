from sqlalchemy import Column, Integer, String, Text, Date, Time, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy import JSON 

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True)
    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    required_skill_id = Column(Integer, ForeignKey("skills.id"))
    work_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    address = Column(String(200), nullable=False)
    rate = Column(Float, nullable=False)
    photo_urls = Column(JSON, nullable=True)  
    establishment_name = Column(String(100), nullable=True)  
    workers_needed = Column(Integer, nullable=False)
    status = Column(String(20), default="moderation")
    created_at = Column(DateTime, server_default=func.now())
    feedback_status = Column(String(20))  
    feedback_submitted_at = Column(DateTime)
    custom_skill = Column(String(100), nullable=True)
    employer = relationship("User")
    required_skill = relationship("Skill")
    bookings = relationship("Booking", back_populates="job", cascade="all, delete-orphan")