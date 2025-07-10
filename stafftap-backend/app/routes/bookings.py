from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from datetime import datetime
from typing import List, Optional

from app.database import get_db
from app.crud.booking import create_booking, get_booking, get_user_bookings, update_booking, delete_booking
from app.schemas.booking import BookingCreate, BookingOut, BookingUpdate
from app.dependencies import get_current_user
from app.models import User, Booking, Job, Notification, Review
from app.schemas.notification import NotificationCreate
import enum 

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELED = "canceled"
    PAYMENT_PENDING = "payment_pending"

@router.post("/", response_model=BookingOut)
def create_new_booking(
    booking: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "worker":
        raise HTTPException(
            status_code=403, 
            detail="Только работники могут создавать бронирования"
        )
    
    
    job = db.query(Job).get(booking.job_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail="Вакансия не найдена"
        )
    
    
    if job.status != "active":
        raise HTTPException(
            status_code=400,
            detail="Нельзя откликаться на неактивную вакансию"
        )
    
    
    existing_booking = db.query(Booking).filter(
        Booking.job_id == booking.job_id,
        Booking.worker_id == current_user.id
    ).first()
    
    if existing_booking:
        raise HTTPException(
            status_code=400, 
            detail="Вы уже откликнулись на эту вакансию"
        )
    
    
    MAX_APPLICATIONS = 10
    active_applications_count = db.query(func.count(Booking.id)).filter(
        Booking.worker_id == current_user.id,
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
    ).scalar()
    
    if active_applications_count >= MAX_APPLICATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Превышен лимит активных откликов ({MAX_APPLICATIONS})"
        )
    
    
    confirmed_count = db.query(func.count(Booking.id)).filter(
        Booking.job_id == booking.job_id,
        Booking.status == BookingStatus.CONFIRMED
    ).scalar()
    
    if confirmed_count >= job.workers_needed:
        raise HTTPException(
            status_code=400,
            detail="Все места на вакансию уже заняты"
        )
    
    
    new_booking = Booking(
        job_id=booking.job_id,
        worker_id=current_user.id,
        status=BookingStatus.PENDING
    )
    
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    
    
    notification = Notification(
        user_id=job.employer_id,
        type="booking_request",
        title="Новый отклик на вакансию",
        message=f"{current_user.first_name} {current_user.last_name} откликнулся на вакансию '{job.title}'",
        related_id=new_booking.id
    )
    db.add(notification)
    db.commit()
    
    
    booking_out = db.query(Booking).options(
        joinedload(Booking.job),
        joinedload(Booking.worker)
    ).filter(Booking.id == new_booking.id).first()
    
    return booking_out

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking_by_id(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).options(
        joinedload(Booking.job),
        joinedload(Booking.worker)
    ).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=404, 
            detail="Бронирование не найдено"
        )
    
    
    if current_user.id not in [booking.job.employer_id, booking.worker_id]:
        raise HTTPException(
            status_code=403, 
            detail="Нет доступа к этому бронированию"
        )
    
    return booking

@router.get("/", response_model=List[BookingOut])
def get_current_user_bookings(
    job_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Booking).options(
        joinedload(Booking.job),
        joinedload(Booking.worker)
    )
    
    
    if job_id:
        query = query.filter(Booking.job_id == job_id)
    
    
    if status:
        query = query.filter(Booking.status == status)
    
    
    if current_user.role == "worker":
        query = query.filter(Booking.worker_id == current_user.id)
    elif current_user.role == "employer":
        
        query = query.join(Job).filter(Job.employer_id == current_user.id)
    
    bookings = query.order_by(Booking.created_at.desc()).all()
    
    
    if current_user.role == "worker":
        for booking in bookings:
            
            rating = db.query(func.avg(Review.rating)).filter(
                Review.target_id == booking.job.employer_id
            ).scalar()
            booking.job.employer_rating = rating or 0.0
    
    return bookings

@router.put("/{booking_id}", response_model=BookingOut)
def update_booking_status(
    booking_id: int,
    update_data: BookingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).get(booking_id)
    if not booking:
        raise HTTPException(
            status_code=404, 
            detail="Бронирование не найдено"
        )
    
    
    if current_user.role == "employer":
        if current_user.id != booking.job.employer_id:
            raise HTTPException(
                status_code=403, 
                detail="Вы не являетесь работодателем для этой вакансии"
            )
    elif current_user.role == "worker":
        if current_user.id != booking.worker_id:
            raise HTTPException(
                status_code=403, 
                detail="Это не ваше бронирование"
            )
    
    
    booking.status = update_data.status
    booking.updated_at = datetime.utcnow()
    
    
    if update_data.status == BookingStatus.CONFIRMED:
        
        notification = Notification(
            user_id=booking.worker_id,
            type="booking_confirmed",
            title="Ваша заявка подтверждена",
            message=f"Ваша заявка на вакансию '{booking.job.title}' подтверждена",
            related_id=booking_id
        )
        db.add(notification)
    elif update_data.status == BookingStatus.REJECTED:
        
        notification = Notification(
            user_id=booking.worker_id,
            type="booking_rejected",
            title="Ваша заявка отклонена",
            message=f"Ваша заявка на вакансию '{booking.job.title}' отклонена",
            related_id=booking_id
        )
        db.add(notification)
    
    db.commit()
    
    
    return db.query(Booking).options(
        joinedload(Booking.job),
        joinedload(Booking.worker)
    ).filter(Booking.id == booking_id).first()

@router.post("/{booking_id}/confirm", response_model=BookingOut)
def confirm_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).get(booking_id)
    if not booking:
        raise HTTPException(
            status_code=404, 
            detail="Бронирование не найдено"
        )
    
    
    if current_user.role != "employer" or current_user.id != booking.job.employer_id:
        raise HTTPException(
            status_code=403, 
            detail="Недостаточно прав для подтверждения"
        )
    
    
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=400, 
            detail="Невозможно подтвердить бронирование в текущем статусе"
        )
    
    
    confirmed_count = db.query(func.count(Booking.id)).filter(
        Booking.job_id == booking.job_id,
        Booking.status == BookingStatus.CONFIRMED
    ).scalar()
    
    if confirmed_count >= booking.job.workers_needed:
        raise HTTPException(
            status_code=400,
            detail="Все места на вакансию уже заняты"
        )
    
    
    booking.status = BookingStatus.CONFIRMED
    booking.updated_at = datetime.utcnow()
    
    
    notification = Notification(
        user_id=booking.worker_id,
        type="booking_confirmed",
        title="Ваша заявка подтверждена",
        message=f"Ваша заявка на вакансию '{booking.job.title}' подтверждена",
        related_id=booking_id
    )
    db.add(notification)
    
    db.commit()
    
    return booking

@router.post("/{booking_id}/reject", response_model=BookingOut)
def reject_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).get(booking_id)
    if not booking:
        raise HTTPException(
            status_code=404, 
            detail="Бронирование не найдено"
        )
    
    
    if current_user.role != "employer" or current_user.id != booking.job.employer_id:
        raise HTTPException(
            status_code=403, 
            detail="Недостаточно прав для отклонения"
        )
    
    
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=400, 
            detail="Невозможно отклонить бронирование в текущем статусе"
        )
    
    
    booking.status = BookingStatus.REJECTED
    booking.updated_at = datetime.utcnow()
    
    
    notification = Notification(
        user_id=booking.worker_id,
        type="booking_rejected",
        title="Ваша заявка отклонена",
        message=f"Ваша заявка на вакансию '{booking.job.title}' отклонена",
        related_id=booking_id
    )
    db.add(notification)
    
    db.commit()
    
    return booking

@router.delete("/{booking_id}")
def delete_booking_record(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).get(booking_id)
    if not booking:
        raise HTTPException(
            status_code=404, 
            detail="Бронирование не найдено"
        )
    
    
    if current_user.id != booking.worker_id:
        raise HTTPException(
            status_code=403, 
            detail="Вы не можете удалить это бронирование"
        )
    
    
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail="Можно удалять только бронирования в статусе 'pending'"
        )
    
    delete_booking(db, booking_id)
    
    return {"message": "Бронирование удалено"}