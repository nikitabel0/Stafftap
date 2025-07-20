from datetime import datetime, time
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Job, Notification,Booking
from sqlalchemy import or_, and_

def background_check_completed_jobs():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        current_date = now.date()
        current_time = now.time()
        
        print(f"[Background Task] Checking completed jobs at {now}")
        
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
        
        print(f"Found {len(jobs)} jobs to complete")
        
        for job in jobs:
            print(f"Processing job #{job.id}: {job.title}")           
       
            job.status = "completed"
            job.feedback_status = "pending"
            
            notification_employer = Notification(
                user_id=job.employer_id,
                type="job_completed",
                title="Смена завершена",
                message=(
                    f"Смена '{job.title}' завершена. "
                    "Пожалуйста, оставьте отзыв о работе сотрудников"
                ),
                related_id=job.id
            )
            db.add(notification_employer)
            
            bookings = db.query(Booking).filter(
                Booking.job_id == job.id,
                Booking.status.in_(["confirmed", "employer_booked"])
            ).all()
            
            for booking in bookings:
                notification_worker = Notification(
                    user_id=booking.worker_id,
                    type="worker_job_completed",
                    title="Смена завершена",
                    message=(
                        f"Смена '{job.title}' завершена. "
                        "Если работодатель не подтвердит вашу работу в течение 48 часов, "
                        "вы можете создать диспут."
                    ),
                    related_id=booking.id
                )
                db.add(notification_worker)
        
        db.commit()
        print("Completed jobs processed successfully")
        
    except Exception as e:
        db.rollback()
        print(f"Error in background_check_completed_jobs: {str(e)}")
        import traceback
        traceback.print_exc() 
    finally:
        db.close()