from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, or_
from datetime import datetime, date
from typing import List, Optional
from app.schemas.job import JobOut
from app.schemas.worker import WorkerOut
from app.schemas.booking import (
    BookingCreate, 
    BookingOut, 
    BookingUpdate,
    BookingWithJobOut,
    EmployerBookRequest
)
from datetime import datetime, timedelta 
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Booking, Job, Notification, Review, Chat, Skill, WorkerAvailability, FrozenFunds
import enum 

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELED = "canceled"
    PAYMENT_PENDING = "payment_pending"
    EMPLOYER_BOOKED = "employer_booked"  

class BookingType(str, enum.Enum):
    WORKER_INITIATED = "worker_initiated"
    EMPLOYER_INITIATED = "employer_initiated"

def release_funds(db: Session, booking_id: int):
    frozen_funds = db.query(FrozenFunds).filter(
        FrozenFunds.booking_id == booking_id
    ).first()
    
    if frozen_funds:
        booking = db.query(Booking).get(booking_id)
        employer = booking.job.employer
            
        employer.balance += frozen_funds.amount
               
        db.delete(frozen_funds)

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
        status=BookingStatus.PENDING,
        booking_type=BookingType.WORKER_INITIATED
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



@router.post("/{booking_id}/worker-reject", response_model=BookingOut)
def worker_reject_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        booking = db.query(Booking).options(joinedload(Booking.job)).get(booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Бронирование не найдено")
        
        if current_user.id != booking.worker_id:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        if booking.status != BookingStatus.EMPLOYER_BOOKED:
            raise HTTPException(
                status_code=400,
                detail="Невозможно отказаться от бронирования в текущем статусе"
            )
        
        frozen_funds = db.query(FrozenFunds).filter(
            FrozenFunds.booking_id == booking_id
        ).first()
        
        if frozen_funds:
            employer = db.query(User).get(booking.job.employer_id)
            if employer:
                employer.balance += frozen_funds.amount
                db.delete(frozen_funds)
        
        booking.status = BookingStatus.REJECTED
        booking.updated_at = datetime.utcnow()
        
        
        worker_notification = db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.related_id == booking_id,
            Notification.type == "employer_booking"
        ).first()
        
        if worker_notification:
            db.delete(worker_notification)
        
        
        notification = Notification(
            user_id=booking.job.employer_id,
            type="worker_rejected_booking",
            title="Работник отказался от бронирования",
            message=(
                f"{current_user.first_name} {current_user.last_name} "
                f"отказался от бронирования на вакансию '{booking.job.title}'"
            ),
            related_id=booking_id,
            job_id=booking.job_id
        )
        db.add(notification)
        
        db.commit()
        return booking
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/employer/book-worker/", response_model=BookingOut)
def employer_book_worker(
    request: EmployerBookRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Только работодатели могут бронировать работников")
    
    worker = db.query(User).get(request.worker_id)
    job = db.query(Job).get(request.job_id)
    
    if not worker or worker.role != "worker":
        raise HTTPException(status_code=404, detail="Работник не найден")
    
    if not job or job.employer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Вакансия не найдена или не принадлежит вам")
    
    if job.status != "active":
        raise HTTPException(status_code=400, detail="Вакансия не активна")
    amount = worker.rate_per_shift
    if current_user.balance < amount:
        raise HTTPException(
            status_code=400, 
            detail="Недостаточно средств для бронирования"
        )
    
    
    existing_booking = db.query(Booking).join(Job).filter(
        Booking.worker_id == worker.id,
        Job.work_date == job.work_date,
        Booking.status.in_(["confirmed", "employer_booked"])
    ).first()
    
    if existing_booking:
        raise HTTPException(status_code=400, detail="Работник уже забронирован на эту дату")

    
    amount = worker.rate_per_shift
    if current_user.balance < amount:
        raise HTTPException(status_code=400, detail="Недостаточно средств на балансе")

    
    occupied_count = db.query(func.count(Booking.id)).filter(
        Booking.job_id == job.id,
        Booking.status.in_(["confirmed", "employer_booked"])
    ).scalar()
    
    if occupied_count >= job.workers_needed:
        raise HTTPException(status_code=400, detail="Нет свободных мест на вакансии")

    
    new_booking = Booking(
        job_id=job.id,
        worker_id=worker.id,
        status=BookingStatus.EMPLOYER_BOOKED,
        booking_type=BookingType.EMPLOYER_INITIATED,
        employer_confirmed=True,
        worker_confirmed=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_booking)
    db.flush()  

    
    current_user.balance -= amount
    frozen_funds = FrozenFunds(
        booking_id=new_booking.id,
        amount=amount
    )
    db.add(frozen_funds)
    
    
    new_chat = Chat(
        booking_id=new_booking.id,
        employer_id=current_user.id,
        worker_id=request.worker_id
    )
    db.add(new_chat)
    
    
    notification = Notification(
        user_id=worker.id,
        type="employer_booking",
        title="Вас забронировали!",
        message=f"{current_user.company_name} забронировал вас на вакансию '{job.title}'",
        related_id=new_booking.id,
        job_id=job.id  
    )
    db.add(notification)
    
    db.commit()
    
    
    booking = db.query(Booking).options(
        joinedload(Booking.job),
        joinedload(Booking.worker)
    ).filter(Booking.id == new_booking.id).first()
    
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
    try:
        booking = db.query(Booking).options(joinedload(Booking.job)).get(booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if current_user.role != "employer" or current_user.id != booking.job.employer_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if booking.status != BookingStatus.PENDING:
            raise HTTPException(status_code=400, detail="Cannot confirm booking in current status")
        
        # Проверяем баланс работодателя
        if current_user.balance < booking.job.rate:
            raise HTTPException(
                status_code=400,
                detail="Недостаточно средств для подтверждения бронирования"
            )
        
        # Замораживаем средства
        current_user.balance -= booking.job.rate
        frozen_funds = FrozenFunds(
            booking_id=booking.id,
            amount=booking.job.rate
        )
        db.add(frozen_funds)
        
        # Обновляем статус бронирования
        booking.status = BookingStatus.CONFIRMED
        booking.updated_at = datetime.utcnow()
        
        # Удаляем уведомление о запросе
        db.query(Notification).filter(
            Notification.related_id == booking_id,
            Notification.type == "booking_request"
        ).delete()
        
        # Создаем чат (если не существует)
        existing_chat = db.query(Chat).filter(Chat.booking_id == booking_id).first()
        if not existing_chat:
            new_chat = Chat(
                booking_id=booking_id,
                employer_id=booking.job.employer_id,
                worker_id=booking.worker_id
            )
            db.add(new_chat)
        
        # Уведомление работнику
        notification = Notification(
            user_id=booking.worker_id,
            type="booking_confirmed",
            title="Бронирование подтверждено",
            message=f"Ваше бронирование на вакансию '{booking.job.title}' подтверждено",
            related_id=booking_id
        )
        db.add(notification)
        
        db.commit()
        return booking
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{booking_id}/reject", response_model=BookingOut)
def reject_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        booking = db.query(Booking).options(joinedload(Booking.job)).get(booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if current_user.role != "employer" or current_user.id != booking.job.employer_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if booking.status != BookingStatus.PENDING:
            raise HTTPException(status_code=400, detail="Cannot reject booking in current status")
        
        
        booking.status = BookingStatus.REJECTED
        booking.updated_at = datetime.utcnow()
        
        
        db.query(Notification).filter(
            Notification.related_id == booking_id,
            Notification.type == "booking_request"
        ).delete()
        
        
        notification = Notification(
            user_id=booking.worker_id,
            type="booking_rejected",
            title="Booking rejected",
            message=f"Your booking for job '{booking.job.title}' has been rejected",
            related_id=booking_id
        )
        db.add(notification)
        
        db.commit()
        return booking
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
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
    
    db.delete(booking)
    db.commit()
    
    return {"message": "Бронирование удалено"}

@router.get("/my-applications/", response_model=List[BookingWithJobOut])
def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "worker":
        raise HTTPException(
            status_code=403, 
            detail="Доступно только работникам"
        )
    
    
    bookings = db.query(Booking).options(
        joinedload(Booking.job).joinedload(Job.required_skill),
        joinedload(Booking.job).joinedload(Job.employer)
    ).filter(
        Booking.worker_id == current_user.id
    ).order_by(Booking.created_at.desc()).all()
    
    if not bookings:
        return []
    
    
    employer_ids = list(set(booking.job.employer_id for booking in bookings))
    
    
    ratings = db.query(
        Review.target_id,
        func.avg(Review.rating).label('avg_rating')
    ).filter(Review.target_id.in_(employer_ids)).group_by(Review.target_id).all()
    rating_map = {r.target_id: float(r.avg_rating) for r in ratings}
    
    
    completed_jobs = db.query(
        Job.employer_id,
        func.count(Job.id).label('completed_count')
    ).filter(
        Job.employer_id.in_(employer_ids),
        Job.status == 'completed'
    ).group_by(Job.employer_id).all()
    completed_map = {c.employer_id: c.completed_count for c in completed_jobs}
    
    result = []
    for booking in bookings:
        job = booking.job
        employer = job.employer
        
        
        confirmed_count = db.query(func.count(Booking.id)).filter(
            Booking.job_id == job.id,
            Booking.status == "confirmed"
        ).scalar()
        remaining_slots = job.workers_needed - confirmed_count
        
        job_out = JobOut(
            id=job.id,
            title=job.title,
            description=job.description,
            required_skill_id=job.required_skill_id,
            required_skill_name=job.required_skill.name if job.required_skill else "Не указано",
            work_date=job.work_date,
            start_time=job.start_time,
            end_time=job.end_time,
            rate=float(job.rate),
            address=job.address,
            workers_needed=job.workers_needed,
            remaining_slots=remaining_slots,
            company_name=employer.company_name,
            employer_id=job.employer_id,
            created_at=job.created_at,
            employer_rating=rating_map.get(job.employer_id, 0.0),
            employer_verified=employer.is_verified,
            completed_jobs=completed_map.get(job.employer_id, 0)
        )
        
        result.append(BookingWithJobOut(
            id=booking.id,
            status=booking.status,
            created_at=booking.created_at,
            job=job_out
        ))
    
    return result

@router.delete("/remove_worker/{job_id}/{worker_id}", status_code=200)
def remove_worker_from_job(
    job_id: int,
    worker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    if current_user.role != "employer":
        raise HTTPException(
            status_code=403, 
            detail="Только работодатели могут удалять работников"
        )
    
    
    job = db.query(Job).get(job_id)
    if not job or job.employer_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Вакансия не найдена или не принадлежит вам"
        )
    
    
    job_date = datetime.combine(job.work_date, datetime.min.time())
    time_remaining = job_date - datetime.utcnow()
    
    if time_remaining <= timedelta(hours=24):
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить работника менее чем за 24 часа до начала смены"
        )
    
    
    booking = db.query(Booking).filter(
        Booking.job_id == job_id,
        Booking.worker_id == worker_id,
        Booking.status.in_(["confirmed", "employer_booked"])
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Работник не найден на этой вакансии"
        )
    
    try:
        
        frozen_funds = db.query(FrozenFunds).filter(
            FrozenFunds.booking_id == booking.id
        ).first()
        
        if frozen_funds:
            current_user.balance += frozen_funds.amount
            db.delete(frozen_funds)
        
        
        booking.status = "canceled"
        booking.updated_at = datetime.utcnow()
        
        
        notification = Notification(
            user_id=worker_id,
            type="worker_removed",
            title="Вас удалили с вакансии",
            message=f"Вас удалили с вакансии '{job.title}' в компании {current_user.company_name}",
            related_id=booking.id,
            job_id=job_id
        )
        db.add(notification)
        
        
        employer_notification = Notification(
            user_id=current_user.id,
            type="worker_removed_employer",
            title="Работник удален",
            message=f"Вы удалили {booking.worker.first_name} {booking.worker.last_name} с вакансии '{job.title}'",
            related_id=booking.id,
            job_id=job_id
        )
        db.add(employer_notification)
        
        db.commit()
        
        return {"message": "Работник успешно удален"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Ошибка при удалении работника: {str(e)}"
        )