# app/core.py
from datetime import datetime, time
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Job, Notification, Booking, FrozenFunds, Dispute, User
from sqlalchemy import or_, and_

scheduler = None  # Будет инициализирован в main.py

# app/core.py
from datetime import datetime, time
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

def background_check_completed_jobs(db: Session):
    now = datetime.utcnow()
    current_date = now.date()
    current_time = now.time()
    
    # Находим смены, которые должны быть завершены
    jobs = db.query(Job).filter(
        Job.status == "active",
        or_(
            and_(
                Job.work_date == current_date,
                Job.end_time < current_time
            ),
            Job.work_date < current_date
        )
    ).all()
    
    for job in jobs:
        # Помечаем смену как завершенную и ожидающую фидбэк
        job.status = "completed"
        job.feedback_status = "pending"
        
        # Создаем уведомление для работодателя
        notification_employer = Notification(
            user_id=job.employer_id,
            type="job_completed",
            title="Смена завершена",
            message=f"Смена '{job.title}' завершена. Пожалуйста, оставьте отзыв",
            related_id=job.id
        )
        db.add(notification_employer)
        
        # Создаем уведомления для работников
        bookings = db.query(Booking).filter(
            Booking.job_id == job.id,
            Booking.status.in_(["confirmed", "employer_booked"])
        ).all()
        
        for booking in bookings:
            notification_worker = Notification(
                user_id=booking.worker_id,
                type="worker_job_completed",
                title="Смена завершена",
                message=f"Смена '{job.title}' завершена. Если работодатель не подтвердит вашу работу в течение 48 часов, вы можете создать диспут.",
                related_id=booking.id  # Сохраняем ID бронирования
            )
            db.add(notification_worker)
    
    db.commit()