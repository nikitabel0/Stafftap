from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import date
from enum import Enum
from typing import Optional


class UserRole(str, Enum):
    employer = "employer"
    worker = "worker"


class UserCreate(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=5)  # можно уточнить формат
    birth_date: date
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole
    profession: Optional[str] = None

    @field_validator("profession")
    @classmethod
    def check_profession_required(cls, value, info):
        if info.data.get("role") == UserRole.worker and not value:
            raise ValueError("Поле 'profession' обязательно для роли 'worker'")
        return value


class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    birth_date: date
    role: UserRole
    profession: Optional[str] = None

    class Config:
        orm_mode = True
