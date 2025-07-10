from pydantic import BaseModel, conint
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


class ReviewCreate(BaseModel):
    booking_id: int
    target_id: int
    rating: conint(ge=1, le=5)
    comment: str | None = None