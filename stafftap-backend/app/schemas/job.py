# app/schemas/job.py
from datetime import date, time, datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

class ConfirmedWorker(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    rating: Optional[float] = None
    completed_shifts: Optional[int] = None

    class Config:
        orm_mode = True
class JobBase(BaseModel):
    title: str
    description: str
    required_skill_id: Optional[int] = None
    work_date: date
    start_time: str  # Изменено на str
    end_time: str    # Изменено на str
    rate: float
    address: str
    workers_needed: int

    @field_validator('start_time', 'end_time', mode='before')
    def parse_time(cls, value):
        if isinstance(value, time):
            return value.strftime("%H:%M:%S")
        return value

class JobCreate(JobBase):
    # Теперь использует строки напрямую
    pass
class JobOut(JobBase):
    id: int
    required_skill_name: str
    remaining_slots: int
    company_name: str
    employer_id: int
    created_at: datetime
    employer_rating: float = Field(..., description="Рейтинг работодателя")
    employer_verified: bool = Field(..., description="Верифицирован ли работодатель")
    completed_jobs: int = Field(..., description="Количество завершенных работ")

    class Config:
        orm_mode = True

class JobDetail(JobOut):
    employer_name: str
    is_favorite: bool
    confirmed_workers: List[ConfirmedWorker] = []