from datetime import date, time, datetime
from pydantic import BaseModel, Field
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
    start_time: time
    end_time: time
    rate: float
    address: str
    workers_needed: int

class JobCreate(JobBase):
    start_time: str  # в формате "HH:MM:SS"
    end_time: str    # в формате "HH:MM:SS"

class JobOut(BaseModel):
    id: int
    title: str
    description: str
    required_skill_id: Optional[int]
    required_skill_name: str
    work_date: date
    start_time: time
    end_time: time
    rate: float
    address: str
    workers_needed: int
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