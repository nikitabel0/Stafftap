from sqlalchemy import Column, Integer, ForeignKey, Date, DateTime
from sqlalchemy.sql import func
from app.database import Base
from sqlalchemy.orm import relationship

class WorkerAvailability(Base):
    __tablename__ = "worker_availability"

    id = Column(Integer, primary_key=True)
    worker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    available_date = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    worker = relationship("User", back_populates="availability")
