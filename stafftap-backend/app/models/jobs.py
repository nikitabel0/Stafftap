from sqlalchemy import Column, Integer, String, Text, ForeignKey, Date, Time, Numeric, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True)
    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    required_skill_id = Column(Integer, ForeignKey("skills.id"), nullable=True)
    work_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    address = Column(Text, nullable=False)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    rate = Column(Numeric(10, 2), nullable=False)
    workers_needed = Column(Integer, nullable=False, default=1)
    status = Column(String(20), default="moderation")
    created_at = Column(DateTime, server_default=func.now())
