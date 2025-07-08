# app/schemas/jobs.py
from datetime import date, time, datetime
from pydantic import BaseModel

class JobOut(BaseModel):
    id: int
    title: str
    description: str
    required_skill_id: int | None
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

    class Config:
        orm_mode = True


class JobCreate(BaseModel):
    title: str
    description: str
    required_skill_id: int | None = None
    work_date: date
    start_time: str  # в формате "HH:MM:SS"
    end_time: str    # в формате "HH:MM:SS"
    address: str
    rate: float
    workers_needed: int