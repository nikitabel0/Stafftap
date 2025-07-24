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
    chat_id: Optional[int] = None
    booking_id: int
    has_review: bool = Field(
        False,
        description="Был ли оставлен отзыв для этого работника"
    ) 
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
    custom_skill: Optional[str] = None 
    address: str
    workers_needed: int
    photo_urls: Optional[List[str]] = Field(
        None, 
        description="Список URL фотографий заведения"
    )
    establishment_name: Optional[str] = Field(
        None, 
        max_length=100, 
        description="Название заведения"
    )


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
    custom_skill: Optional[str] = None
    employer_rating: float = Field(..., description="Рейтинг работодателя")
    employer_verified: bool = Field(..., description="Верифицирован ли работодатель")
    completed_jobs: int = Field(..., description="Количество завершенных работ")
    photo_urls: Optional[List[str]] = Field(
        None, 
        description="Список URL фотографий заведения"
    )
    establishment_name: Optional[str] = Field(
        None, 
        max_length=100, 
        description="Название заведения"
    )

    class Config:
        orm_mode = True

class JobDetail(JobOut):
    employer_name: str
    is_favorite: bool
    status: str
    confirmed_workers: List[ConfirmedWorker] = []