from sqlalchemy import Column, Integer, ForeignKey, String, DateTime
from sqlalchemy.sql import func
from app.database import Base
from sqlalchemy.orm import relationship
class FavoriteJob(Base):
    __tablename__ = "favorite_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))  # Изменено
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE")) 
    created_at = Column(DateTime, server_default=func.now())
    
    # Используем строковые ссылки для отношений
    user = relationship("User", back_populates="favorite_jobs")
    job = relationship("Job")
