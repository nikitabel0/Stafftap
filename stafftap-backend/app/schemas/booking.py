from pydantic import BaseModel
from datetime import datetime

class BookingBase(BaseModel):
    job_id: int

class BookingCreate(BookingBase):
    job_id: int

class BookingOut(BookingBase):
    id: int
    status: str
    employer_confirmed: bool
    worker_confirmed: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class BookingUpdate(BaseModel):
    status: str | None = None
    employer_confirmed: bool | None = None
    worker_confirmed: bool | None = None