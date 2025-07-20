from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Review, Booking, Job, User
from app.schemas.review import ReviewCreate
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

@router.post("/", status_code=201)
def create_review(
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    booking = db.query(Booking).options(
        joinedload(Booking.job)
    ).filter(
        Booking.id == review_data.booking_id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    
    if current_user.id != booking.job.employer_id:
        raise HTTPException(
            status_code=403, 
            detail="Только работодатель может оставить отзыв"
        )
    
    
    if booking.job.status != "successfully_completed":
        raise HTTPException(
            status_code=400,
            detail="Отзыв можно оставить только после успешного завершения работы"
        )
    
    
    existing_review = db.query(Review).filter(
        Review.booking_id == review_data.booking_id
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=400,
            detail="Отзыв для этого бронирования уже существует"
        )
    
    
    new_review = Review(
        booking_id=review_data.booking_id,
        reviewer_id=current_user.id,
        target_id=booking.worker_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    db.add(new_review)
    db.commit()
    
    
    worker = db.query(User).get(booking.worker_id)
    if worker:
        
        worker_ratings = db.query(Review.rating).filter(
            Review.target_id == worker.id
        ).all()
        
        if worker_ratings:
            total_rating = sum([r.rating for r in worker_ratings])
            avg_rating = total_rating / len(worker_ratings)
            worker.rating = round(avg_rating, 1)
            db.commit()
    
    
    return {
        "status": "review_created",
        "review_id": new_review.id,
        "worker_id": worker.id,
        "new_rating": worker.rating
    }