from sqlalchemy import Column, Integer, ForeignKey, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class EmployerDocument(Base):
    __tablename__ = "employer_documents"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String(50), nullable=False)
    file_url = Column(String(255), nullable=False)
    status = Column(String(20), default="pending")
    uploaded_at = Column(DateTime, server_default=func.now())
