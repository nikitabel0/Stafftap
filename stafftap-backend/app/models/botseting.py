from sqlalchemy import Column, Integer,  Enum , ForeignKey, String, Boolean, DateTime,Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class BotSetting(Base):
    __tablename__ = "bot_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text, nullable=False)
