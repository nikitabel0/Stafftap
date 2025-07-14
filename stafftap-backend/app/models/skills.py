from sqlalchemy import Column, Integer, String
from app.database import Base
from sqlalchemy.orm import relationship

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)
    users = relationship("User", secondary="user_skills", back_populates="skills")
