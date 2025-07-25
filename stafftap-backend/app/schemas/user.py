from pydantic import BaseModel, EmailStr, Field, validator
from datetime import date, datetime
from enum import Enum
from typing import Optional, List,Dict
from app.schemas.skill import SkillOut

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

class AvailabilityOut(BaseModel):
    id: int
    available_date: date 
    class Config:
        orm_mode = True


class UserOut(BaseModel):
    id: int
    telegram_id: Optional[int]
    first_name: str
    skills: List[SkillOut]
    last_name: str
    phone: Optional[str] = None 
    birth_date: Optional[date] = None 
    email: Optional[str] = None
    role: Optional[str] = None 
    balance: float
    company_name: Optional[str]
    experience_months: Optional[int]
    rate_per_shift: Optional[float]
    availability: List[AvailabilityOut]
    avatar_url: Optional[str] = None
    is_verified: bool
    is_blocked: bool
    created_at: datetime
    updated_at: datetime
    is_registration_complete: bool = False

    class Config:
        orm_mode = True


class SkillOut(BaseModel):
    id: int
    name: str


class UserCompleteRegistration(BaseModel):
    role: str  # "worker" или "employer"
    birth_date: date
    company_name: str = None  # Только для работодателя

class TelegramUserComplete(BaseModel):
    role: UserRole
    birth_date: date
    company_name: Optional[str] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1)
    last_name: Optional[str] = Field(None, min_length=1)
    phone: Optional[str] = Field(None, min_length=5)
    birth_date: Optional[date] = None
    email: Optional[EmailStr] = None
    company_name: Optional[str] = None
    experience_months: Optional[int] = Field(None, ge=0)
    rate_per_shift: Optional[float] = Field(None, ge=0)
    skills: Optional[List[int]] = None
    availability: Optional[List[date]] = None

    @validator('availability', pre=True, each_item=True)
    def parse_availability_dates(cls, value):
        if isinstance(value, str):
            return date.fromisoformat(value)
        return value
    

class WithdrawalRequestCreate(BaseModel):
    amount: float
    payment_method: str
    wallet_address: str

class BasicUserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    avatar_url: Optional[str] = None

    class Config:
        orm_mode = True

class WithdrawalRequestOut(BaseModel):
    id: int
    user_id: int
    amount: float
    status: str
    created_at: datetime
    updated_at: datetime
    admin_comment: Optional[str] = None
    payment_method: str
    wallet_address: str
    user: BasicUserOut  # Добавлено поле пользователя

    class Config:
        orm_mode = True

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
