from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, time
from app.database import get_db
from app.models import Job, Skill, Booking, User, Review  
from app.schemas.job import JobDetail, JobOut, JobCreate
from fastapi import status
from app.dependencies import get_current_user, get_current_user_optional 
from sqlalchemy import func
from app.models.favorite_job import FavoriteJob

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.get("/", response_model=List[JobOut])
def get_jobs(
    skill: Optional[str] = Query(None, alias="skill"),
    date: Optional[date] = Query(None, alias="date"),
    min_rate: Optional[float] = Query(None, alias="min_rate"),
    db: Session = Depends(get_db)
):
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
    
    if not jobs:
        return []
    
    # Собираем ID работодателей
    employer_ids = list(set(job.employer_id for job in jobs))
    
    # Получаем информацию о работодателях
    employers = db.query(User).filter(User.id.in_(employer_ids)).all()
    employer_map = {e.id: e for e in employers}
    
    # Получаем рейтинги работодателей
    ratings = db.query(
        Review.target_id,
        func.avg(Review.rating).label('avg_rating')
    ).filter(Review.target_id.in_(employer_ids)).group_by(Review.target_id).all()
    rating_map = {r.target_id: float(r.avg_rating) for r in ratings}
    
    # Получаем количество завершенных работ для работодателей
    completed_jobs = db.query(
        Job.employer_id,
        func.count(Job.id).label('completed_count')
    ).filter(
        Job.employer_id.in_(employer_ids),
        Job.status == 'completed'
    ).group_by(Job.employer_id).all()
    completed_map = {c.employer_id: c.completed_count for c in completed_jobs}
    
    # Получаем количество подтвержденных бронирований для вакансий
    job_ids = [job.id for job in jobs]
    confirmed_counts = db.query(
        Booking.job_id,
        func.count(Booking.id).label('confirmed_count')
    ).filter(
        Booking.job_id.in_(job_ids),
        Booking.status == "confirmed"
    ).group_by(Booking.job_id).all()
    confirmed_count_dict = {c.job_id: c.confirmed_count for c in confirmed_counts}
    
    result = []
    for job in jobs:
        employer = employer_map.get(job.employer_id)
        company_name = employer.company_name if employer else "Компания не указана"
        
        confirmed_count = confirmed_count_dict.get(job.id, 0)
        remaining = job.workers_needed - confirmed_count
        
        skill_name = job.required_skill.name if job.required_skill else "Не указано"
        
        # Добавляем недостающие поля
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
            created_at=job.created_at,
            employer_rating=rating_map.get(job.employer_id, 0.0),
            employer_verified=employer.is_verified if employer else False,
            completed_jobs=completed_map.get(job.employer_id, 0)
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

@router.get("/{job_id}", response_model=JobDetail)
def get_job_details(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)  # Исправлено здесь
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Вакансия не найдена")
    
    employer = db.query(User).filter(User.id == job.employer_id).first()
    if not employer:
        raise HTTPException(status_code=404, detail="Работодатель не найден")
    
    completed_jobs = db.query(func.count(Job.id)).filter(
        Job.employer_id == employer.id,
        Job.status == 'completed'
    ).scalar()
    
    avg_rating = db.query(func.avg(Review.rating)).filter(
        Review.target_id == employer.id
    ).scalar() or 0.0
    
    is_favorite = False
    if current_user:
        favorite = db.query(FavoriteJob).filter(
            FavoriteJob.user_id == current_user.id,
            FavoriteJob.job_id == job_id
        ).first()
        is_favorite = favorite is not None

    confirmed_count = db.query(Booking).filter(
        Booking.job_id == job_id,
        Booking.status == "confirmed"
    ).count()
    remaining_slots = job.workers_needed - confirmed_count

    return JobDetail(
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
        employer_name=employer.company_name,
        employer_rating=float(avg_rating),
        completed_jobs=completed_jobs,
        employer_verified=employer.is_verified,
        is_favorite=is_favorite
    )

@router.post("/{job_id}/favorite")
def toggle_job_favorite(
    job_id: int,
    is_favorite: bool = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    
    job = db.query(Job).get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Вакансия не найдена")
    
    favorite = db.query(FavoriteJob).filter(
        FavoriteJob.user_id == current_user.id,
        FavoriteJob.job_id == job_id
    ).first()
    
    if is_favorite and not favorite:
        new_fav = FavoriteJob(user_id=current_user.id, job_id=job_id)
        db.add(new_fav)
        db.commit()
        return {"status": "added"}
    
    if not is_favorite and favorite:
        db.delete(favorite)
        db.commit()
        return {"status": "removed"}
    
    return {"status": "no_change"}

@router.get("/favorites/", response_model=List[JobOut])
def get_favorite_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Получаем избранные вакансии пользователя
    favorites = db.query(FavoriteJob).filter(
        FavoriteJob.user_id == current_user.id
    ).all()
    
    if not favorites:
        return []
    
    job_ids = [fav.job_id for fav in favorites]
    
    # Загружаем вакансии с необходимыми связанными данными
    jobs = db.query(Job).options(
        joinedload(Job.required_skill)
    ).filter(Job.id.in_(job_ids)).all()
    
    # Получаем ID работодателей
    employer_ids = [job.employer_id for job in jobs]
    
    # Запрос для получения рейтингов работодателей
    employer_ratings_subquery = db.query(
        Review.target_id,
        func.avg(Review.rating).label('avg_rating')
    ).filter(
        Review.target_id.in_(employer_ids)
    ).group_by(Review.target_id).subquery()
    
    # Запрос для получения количества завершенных работ
    completed_jobs_subquery = db.query(
        Job.employer_id,
        func.count(Job.id).label('completed_jobs')
    ).filter(
        Job.status == 'completed'
    ).group_by(Job.employer_id).subquery()
    
    # Получаем данные о работодателях
    employers_data = db.query(
        User.id,
        User.company_name,
        User.is_verified,
        func.coalesce(employer_ratings_subquery.c.avg_rating, 0).label('rating'),
        func.coalesce(completed_jobs_subquery.c.completed_jobs, 0).label('completed_jobs')
    ).outerjoin(employer_ratings_subquery, User.id == employer_ratings_subquery.c.target_id
    ).outerjoin(completed_jobs_subquery, User.id == completed_jobs_subquery.c.employer_id
    ).filter(User.id.in_(employer_ids)).all()
    
    # Создаем словарь с данными работодателей
    employer_data_map = {e.id: {
        "company_name": e.company_name,
        "is_verified": e.is_verified,
        "rating": float(e.rating) if e.rating else 0.0,
        "completed_jobs": e.completed_jobs
    } for e in employers_data}
    
    # Подсчет подтвержденных бронирований для каждой вакансии
    confirmed_counts = db.query(
        Booking.job_id,
        func.count(Booking.id).label('confirmed_count')
    ).filter(
        Booking.job_id.in_(job_ids),
        Booking.status == "confirmed"
    ).group_by(Booking.job_id).all()
    
    confirmed_count_dict = {job_id: count for job_id, count in confirmed_counts}
    
    result = []
    for job in jobs:
        employer_data = employer_data_map.get(job.employer_id, {})
        company_name = employer_data.get("company_name", "Компания не указана")
        
        confirmed_count = confirmed_count_dict.get(job.id, 0)
        remaining = job.workers_needed - confirmed_count
        
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
            created_at=job.created_at,
            # Добавляем новые поля
            employer_rating=employer_data.get("rating", 0.0),
            employer_verified=employer_data.get("is_verified", False),
            completed_jobs=employer_data.get("completed_jobs", 0)
        ))
    
    return result