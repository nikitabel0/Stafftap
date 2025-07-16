from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List
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