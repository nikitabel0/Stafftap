from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List
from datetime import datetime, date, time
from pydantic import BaseModel
class UserRegistration(BaseModel):
    date: str
    count: int

class StatisticsResponse(BaseModel):
    total_users: int
    workers: int
    employers: int
    admins: int
    active_jobs: int
    completed_jobs: int
    pending_documents: int
    user_registrations: List[UserRegistration]

class DisputeDetail(BaseModel):
    id: int
    booking_id: int
    description: str
    created_at: datetime
    status: str
    worker_id: int
    worker_first_name: str
    worker_last_name: str
    worker_email: str
    worker_phone: str
    employer_company_name: str
    employer_email: str
    job_title: str
    job_date: date
    job_start_time: time
    job_end_time: time
    job_address: str
    frozen_amount: float

    class Config:
        orm_mode = True