# models/commission.py
from sqlalchemy import Column, Integer, Numeric, String, Boolean
from app.database import Base

class CommissionSetting(Base):
    __tablename__ = "commission_settings"
    
    id = Column(Integer, primary_key=True)
    is_active = Column(Boolean, default=True)
    commission_type = Column(String(20), default="percentage")  # 'percentage' или 'fixed'
    value = Column(Numeric(5, 2), default=0.0)  # Значение в % или рублях
    min_amount = Column(Numeric(10, 2), default=0.0)  # Минимальная сумма комиссии
    description = Column(String(255), nullable=True)