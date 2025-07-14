from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from enum import Enum
from typing import Optional, List,Dict

class UserRole(str, Enum):
    employer = "employer"
    worker = "worker"
    admin = "admin" 


class UserCreate(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=5)
    birth_date: date
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole

    company_name: Optional[str] = None
    experience_months: Optional[int] = None
    rate_per_shift: Optional[float] = None


class UserOut(BaseModel):
    id: int
    telegram_id: Optional[int]
    first_name: str
    last_name: str
    phone: str
    birth_date: date
    email: EmailStr
    role: UserRole
    balance: float
    company_name: Optional[str]
    experience_months: Optional[int]
    rate_per_shift: Optional[float]

    is_verified: bool
    is_blocked: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class SkillOut(BaseModel):
    id: int
    name: str


class AvailabilityOut(BaseModel):
    id: int
    date: date


class DocumentOut(BaseModel):
    id: int
    document_type: str
    file_url: str
    status: str
    uploaded_at: datetime


class VacancyOut(BaseModel):
    id: int
    title: str
    company: str
    date: date
    start_time: str
    end_time: str
    address: str
    salary: float
    status: str


class AvailabilityInput(BaseModel):
    date: date



class WithdrawalRequestIn(BaseModel):
    user_id: int
    amount: float
    payment_details: Dict[str, str]

class UserProfileResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    role: UserRole
    phone: str
    email: EmailStr
    birth_date: date

    company_name: Optional[str]
    experience_months: Optional[int]
    rate_per_shift: Optional[float]

    is_verified: bool
    created_at: datetime

    rating: float
    reviews_count: int

    skills: List[SkillOut]
    availability: List[AvailabilityOut]
    documents: List[DocumentOut]
    active_vacancies: List[VacancyOut]


    class Config:
        orm_mode = True
