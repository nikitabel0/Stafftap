from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from enum import Enum


class UserRole(str, Enum):
    employer = "employer"
    worker = "worker"


class BaseProfile(BaseModel):
    id: int
    telegram_id: Optional[int]
    role: UserRole
    phone: str
    email: EmailStr
    first_name: str
    last_name: str
    is_verified: bool
    is_blocked: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class WorkerProfile(BaseProfile):
    experience_months: Optional[int]
    rate_per_shift: Optional[float]


class EmployerProfile(BaseProfile):
    company_name: Optional[str]
