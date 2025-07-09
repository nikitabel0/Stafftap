from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.booking import create_booking, get_booking, get_user_bookings, update_booking, delete_booking
from app.schemas.booking import BookingCreate, BookingOut, BookingUpdate
from app.dependencies import get_current_user
from app.models import User, Booking

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

@router.post("/", response_model=BookingOut)
def create_new_booking(
    booking: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "worker":
        raise HTTPException(status_code=403, detail="Только работники могут создавать бронирования")
    
    # Проверяем, не создал ли уже работник бронирование на эту вакансию
    existing_booking = db.query(Booking).filter(
        Booking.job_id == booking.job_id,
        Booking.worker_id == current_user.id
    ).first()
    
    if existing_booking:
        raise HTTPException(status_code=400, detail="Вы уже откликнулись на эту вакансию")
    
    return create_booking(db, BookingCreate(
        job_id=booking.job_id,
        worker_id=current_user.id
    ))

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking_by_id(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = get_booking(db, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    # Проверка доступа
    job = booking.job
    if current_user.id != job.employer_id and current_user.id != booking.worker_id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому бронированию")
    
    return booking

@router.get("/", response_model=list[BookingOut])
def get_current_user_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_user_bookings(db, current_user.id, current_user.role)

@router.put("/{booking_id}", response_model=BookingOut)
def update_booking_status(
    booking_id: int,
    update_data: BookingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = get_booking(db, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    # Проверка прав
    job = booking.job
    if current_user.role == "employer" and current_user.id != job.employer_id:
        raise HTTPException(status_code=403, detail="Вы не являетесь работодателем для этой вакансии")
    
    if current_user.role == "worker" and current_user.id != booking.worker_id:
        raise HTTPException(status_code=403, detail="Это не ваше бронирование")
    
    return update_booking(db, booking_id, update_data)

@router.delete("/{booking_id}")
def delete_booking_record(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = get_booking(db, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    # Проверка прав
    if current_user.id != booking.worker_id:
        raise HTTPException(status_code=403, detail="Вы не можете удалить это бронирование")
    
    delete_booking(db, booking_id)
    return {"message": "Бронирование удалено"}