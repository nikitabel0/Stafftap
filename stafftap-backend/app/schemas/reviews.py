from pydantic import BaseModel
from datetime import datetime

class ReviewOut(BaseModel):
    id: int
    author: str
    rating: int
    comment: str
    created_at: datetime

class ReviewResponse(BaseModel):
    rating: float
    reviews_count: int
    reviews: list[ReviewOut]
