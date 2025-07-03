
from sqlalchemy import Column, Integer, String, Date, Enum
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    employer = "employer"
    worker = "worker"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=False, unique=True)
    birth_date = Column(Date, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    profession = Column(String, nullable=True)
