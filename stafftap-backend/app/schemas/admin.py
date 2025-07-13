from pydantic import BaseModel

class StatisticsResponse(BaseModel):
    total_users: int
    workers: int
    employers: int
    active_jobs: int
    completed_jobs: int
    pending_documents: int