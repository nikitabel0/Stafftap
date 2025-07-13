from sqlalchemy.orm import Session
from app.models import Booking
from app.schemas.booking import BookingCreate, BookingOut, BookingUpdate

def create_booking(db: Session, booking: BookingCreate):
    db_booking = Booking(
        job_id=booking.job_id,
        worker_id=booking.worker_id,
        status="pending"
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

def get_booking(db: Session, booking_id: int):
    return db.query(Booking).filter(Booking.id == booking_id).first()

def get_user_bookings(db: Session, user_id: int, role: str):
    query = db.query(Booking)
    
    if role == "employer":
        # Работодатель видит бронирования на свои вакансии
        query = query.join(Job, Job.id == Booking.job_id)\
                    .filter(Job.employer_id == user_id)
    else:
        # Работник видит свои бронирования
        query = query.filter(Booking.worker_id == user_id)
    
    return query.all()

def update_booking(db: Session, booking_id: int, update_data: BookingUpdate):
    db_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not db_booking:
        return None
    
    for key, value in update_data.dict().items():
        if value is not None:
            setattr(db_booking, key, value)
    
    db.commit()
    db.refresh(db_booking)
    return db_booking

def delete_booking(db: Session, booking_id: int):
    db_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not db_booking:
        return None
    
    db.delete(db_booking)
    db.commit()
    return db_booking