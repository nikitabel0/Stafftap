# app/core.py
from datetime import datetime, time
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Job, Notification, Booking, FrozenFunds, Dispute, User
from sqlalchemy import or_, and_

scheduler = None  # Будет инициализирован в main.py

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
        notification = Notification(
            user_id=job.employer_id,
            type="job_completed",
            title="Смена завершена",
            message=f"Смена '{job.title}' завершена. Пожалуйста, оставьте отзыв",
            related_id=job.id
        )
        db.add(notification)
    
    db.commit()