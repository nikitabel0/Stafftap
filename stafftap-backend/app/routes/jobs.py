# app/routers/jobs.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload  # <-- Добавлен joinedload
from typing import List, Optional
from datetime import date, time  # <-- Исправлен импорт time
from app.database import get_db
from app.models import Job, Skill, Booking, User
from app.schemas.job import JobOut, JobCreate  # <-- Исправлен импорт (jobs вместо job)
from fastapi import status
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.get("/", response_model=List[JobOut])
def get_jobs(
    skill: Optional[str] = Query(None, alias="skill"),
    date: Optional[date] = Query(None, alias="date"),
    min_rate: Optional[float] = Query(None, alias="min_rate"),
    db: Session = Depends(get_db)
):
    # Добавлена жадная загрузка связанного навыка
    query = db.query(Job).options(joinedload(Job.required_skill)).filter(Job.status == "active")
    
    if skill:
        skill_obj = db.query(Skill).filter(Skill.name.ilike(f"%{skill}%")).first()
        if skill_obj:
            query = query.filter(Job.required_skill_id == skill_obj.id)
    
    if date:
        query = query.filter(Job.work_date == date)
    
    if min_rate is not None:
        query = query.filter(Job.rate >= min_rate)
    
    jobs = query.all()
    
    result = []
    for job in jobs:
        employer = db.query(User).filter(User.id == job.employer_id).first()
        company_name = employer.company_name if employer else "Компания не указана"
        
        confirmed_count = db.query(Booking).filter(
            Booking.job_id == job.id,
            Booking.status == "confirmed"
        ).count()
        
        remaining = job.workers_needed - confirmed_count
        
        # Теперь доступ через отношение работает
        skill_name = job.required_skill.name if job.required_skill else "Не указано"
        
        result.append(JobOut(
            id=job.id,
            title=job.title,
            description=job.description,
            required_skill_id=job.required_skill_id,
            required_skill_name=skill_name,
            work_date=job.work_date,
            start_time=job.start_time,
            end_time=job.end_time,
            rate=float(job.rate),
            address=job.address,
            workers_needed=job.workers_needed,
            remaining_slots=remaining,
            company_name=company_name,
            employer_id=job.employer_id,
            created_at=job.created_at
        ))
    
    return result

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can create jobs"
        )
    
    if job_data.required_skill_id:
        skill = db.query(Skill).get(job_data.required_skill_id)
        if not skill:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid skill ID"
            )
    
    new_job = Job(
        employer_id=current_user.id,
        title=job_data.title,
        description=job_data.description,
        required_skill_id=job_data.required_skill_id,
        work_date=job_data.work_date,
        start_time=time.fromisoformat(job_data.start_time),
        end_time=time.fromisoformat(job_data.end_time),
        address=job_data.address,
        rate=job_data.rate,
        workers_needed=job_data.workers_needed,
        status="moderation"
    )
    
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    
    return {"id": new_job.id, "status": "created"}