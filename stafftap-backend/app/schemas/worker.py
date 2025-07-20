from datetime import date
from typing import Optional, List
from pydantic import BaseModel

class WorkerSkillOut(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

class WorkerAvailabilityOut(BaseModel):
    id: int  
    date: date  


    class Config:
        orm_mode = True
class WorkerOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str
    is_verified: bool
    is_blocked: bool

    birth_date: date  
    experience_months: Optional[int] = None
    rate_per_shift: Optional[float] = None
    
    is_verified: bool
    is_blocked: bool

    skills: List[WorkerSkillOut] = []
    availability: List[WorkerAvailabilityOut] = []

    class Config:
        orm_mode = True
