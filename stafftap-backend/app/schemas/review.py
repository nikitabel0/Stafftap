from pydantic import BaseModel, Field, conint

class ReviewCreate(BaseModel):
    rating: conint(ge=1, le=5) = Field(
        ...,
        description="Рейтинг от 1 до 5 звезд",
        example=5
    )
    booking_id: int
    comment: str = Field(
        None,
        description="Комментарий к отзыву (необязательно)",
        max_length=500,
        example="Отличный работодатель, все четко организовано"
    )