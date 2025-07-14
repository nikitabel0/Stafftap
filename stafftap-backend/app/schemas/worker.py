from datetime import date
from typing import Optional, List
from pydantic import BaseModel

class WorkerSkillOut(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

class WorkerAvailabilityOut(BaseModel):
    id: int  # Добавляем обязательный ID
    date: date  # Переименовываем available_date -> date


    class Config:
        orm_mode = True
class WorkerOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str
    is_verified: bool
    is_blocked: bool

    # id: int
    # first_name: str
    # last_name: str
    # avatar_url: Optional[str] = None
    # phone: str
    # birth_date: date  # Разрешить NULL
    # experience_months: Optional[int] = None
    # rate_per_shift: Optional[float] = None
    # balance: float = 0.0  # Всегда значение по умолчанию
    # is_verified: bool
    # is_blocked: bool

    # skills: List[WorkerSkillOut] = []
    # availability: List[WorkerAvailabilityOut] = []

    class Config:
        orm_mode = True
