from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, datetime
from app.database import get_db
from app.models import Job, Skill, Booking, User, Review, FrozenFunds, Notification, FavoriteJob
from app.schemas.job import JobDetail, JobOut, JobCreate, ConfirmedWorker
from app.schemas.booking import BookingOut, EmployerBookRequest

from app.dependencies import get_current_user, get_current_user_optional 
from sqlalchemy import func, or_
import logging

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

logger = logging.getLogger("confirmed_workers")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

@router.get("/", response_model=List[JobOut])
def get_jobs(
    skill: Optional[str] = Query(None, alias="skill"),
    date_filter: Optional[date] = Query(None, alias="date"),
    min_rate: Optional[float] = Query(None, alias="min_rate"),
    db: Session = Depends(get_db)
):
    # Исправленный подзапрос: учитываем все бронирования, занимающие место
    occupied_subq = db.query(
        Booking.job_id,
        func.count(Booking.id).label('occupied_count')
    ).filter(
        Booking.status.in_(["confirmed", "employer_booked"])
    ).group_by(Booking.job_id).subquery()

    # Основной запрос с фильтрацией
    query = db.query(
        Job,
        func.coalesce(occupied_subq.c.occupied_count, 0).label('occupied_count')
    ).options(joinedload(Job.required_skill)) \
        .outerjoin(occupied_subq, Job.id == occupied_subq.c.job_id) \
        .filter(Job.status == "active") \
        .filter(Job.work_date >= date.today()) \
        .filter(Job.workers_needed > func.coalesce(occupied_subq.c.occupied_count, 0))

    if skill:
        skill_obj = db.query(Skill).filter(Skill.name.ilike(f"%{skill}%")).first()
        if skill_obj:
            query = query.filter(Job.required_skill_id == skill_obj.id)
    
    if date_filter:
        query = query.filter(Job.work_date == date_filter)
    
    if min_rate is not None:
        query = query.filter(Job.rate >= min_rate)
    
    results = query.all()
    
    if not results:
        return []
    
    # Собираем данные
    employer_ids = list(set(job.employer_id for job, _ in results))
    employers = db.query(User).filter(User.id.in_(employer_ids)).all()
    employer_map = {e.id: e for e in employers}
    
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
    for job, occupied_count in results:
        employer = employer_map.get(job.employer_id)
        company_name = employer.company_name if employer else "Компания не указана"
        
        remaining = job.workers_needed - occupied_count
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
            employer_rating=rating_map.get(job.employer_id, 0.0),
            employer_verified=employer.is_verified if employer else False,
            completed_jobs=completed_map.get(job.employer_id, 0)
        ))
    
    return result


@router.post("/", status_code=201)
def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "employer":
        raise HTTPException(
            status_code=403,
            detail="Только работодатели могут создавать вакансии"
        )
    if not current_user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Только верифицированные работодатели могут создавать вакансии"
        )
    
    if job_data.required_skill_id:
        skill = db.query(Skill).get(job_data.required_skill_id)
        if not skill:
            raise HTTPException(
                status_code=400,
                detail="Указан несуществующий навык"
            )
    
    new_job = Job(
        employer_id=current_user.id,
        title=job_data.title,
        description=job_data.description,
        required_skill_id=job_data.required_skill_id,
        work_date=job_data.work_date,
        start_time=job_data.start_time,
        end_time=job_data.end_time,
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
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Вакансия не найдена")
    
    # Получаем всех работников, забронированных на эту вакансию
    booked_workers = db.query(Booking).options(
        joinedload(Booking.worker)
    ).filter(
        Booking.job_id == job_id,
        Booking.status.in_(["confirmed", "employer_booked"])
    ).all()
    
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

    # Исправленный подсчет занятых мест
    occupied_count = db.query(func.count(Booking.id)).filter(
        Booking.job_id == job_id,
        Booking.status.in_(["confirmed", "employer_booked"])
    ).scalar()
    remaining_slots = job.workers_needed - occupied_count

    # Формируем список работников
    workers_list = []
    worker_ids = [bw.worker_id for bw in booked_workers]
    
    if worker_ids:
        # Получаем рейтинги работников
        ratings = db.query(
            Review.target_id,
            func.avg(Review.rating).label('avg_rating')
        ).filter(Review.target_id.in_(worker_ids)).group_by(Review.target_id).all()
        rating_map = {r.target_id: float(r.avg_rating) for r in ratings}
        
        # Получаем количество завершенных смен
        completed_shifts = db.query(
            Booking.worker_id,
            func.count(Booking.id).label('completed_count')
        ).filter(
            Booking.worker_id.in_(worker_ids),
            Booking.status == 'completed'
        ).group_by(Booking.worker_id).all()
        completed_map = {c.worker_id: c.completed_count for c in completed_shifts}
    
    for worker_booking in booked_workers:
        worker = worker_booking.worker
        workers_list.append(ConfirmedWorker(
            id=worker.id,
            first_name=worker.first_name,
            last_name=worker.last_name,
            phone=worker.phone,
            avatar_url=worker.avatar_url,
            rating=rating_map.get(worker.id, 0.0),
            completed_shifts=completed_map.get(worker.id, 0)
        ))

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
        is_favorite=is_favorite,
        confirmed_workers=workers_list
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
    # Исправленный подзапрос: учитываем все бронирования, занимающие место
    occupied_subq = db.query(
        Booking.job_id,
        func.count(Booking.id).label('occupied_count')
    ).filter(
        Booking.status.in_(["confirmed", "employer_booked"])
    ).group_by(Booking.job_id).subquery()
    
    # Запрос для избранных вакансий с фильтрацией
    results = db.query(
        Job,
        func.coalesce(occupied_subq.c.occupied_count, 0).label('occupied_count')
    ).options(joinedload(Job.required_skill)) \
        .join(FavoriteJob, FavoriteJob.job_id == Job.id) \
        .outerjoin(occupied_subq, Job.id == occupied_subq.c.job_id) \
        .filter(
            FavoriteJob.user_id == current_user.id,
            Job.status == "active",
            Job.work_date >= date.today(),
            Job.workers_needed > func.coalesce(occupied_subq.c.occupied_count, 0)
        ).all()
    
    if not results:
        return []
    
    # Обработка результатов
    employer_ids = list(set(job.employer_id for job, _ in results))
    
    employers_data = db.query(
        User.id,
        User.company_name,
        User.is_verified
    ).filter(User.id.in_(employer_ids)).all()
    employer_map = {e.id: e for e in employers_data}
    
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
    for job, occupied_count in results:
        employer = employer_map.get(job.employer_id)
        company_name = employer.company_name if employer else "Компания не указана"
        
        remaining = job.workers_needed - occupied_count
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
            employer_rating=rating_map.get(job.employer_id, 0.0),
            employer_verified=employer.is_verified if employer else False,
            completed_jobs=completed_map.get(job.employer_id, 0)
        ))
    
    return result


@router.get("/{job_id}/confirmed_workers", response_model=List[ConfirmedWorker])
def get_confirmed_workers_for_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(f"Запрос подтвержденных работников для вакансии {job_id} от пользователя {current_user.id}")
    
    job = db.query(Job).get(job_id)
    if not job:
        logger.warning(f"Вакансия не найдена: {job_id}")
        raise HTTPException(status_code=404, detail="Вакансия не найдена")
    
    # Проверка прав доступа
    if job.employer_id != current_user.id:
        logger.warning(f"Доступ запрещен: Пользователь {current_user.id} не является владельцем вакансии {job_id}")
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    try:
        # Получаем всех работников, забронированных на вакансию
        bookings = db.query(Booking).options(
            joinedload(Booking.worker)
        ).filter(
            Booking.job_id == job_id,
            Booking.status.in_(["confirmed", "employer_booked"])
        ).all()
        
        logger.info(f"Найдено {len(bookings)} бронирований для вакансии {job_id}")
        
        if not bookings:
            return []
        
        # Собираем ID работников
        worker_ids = [b.worker_id for b in bookings]
        
        # Получаем рейтинги работников
        ratings = db.query(
            Review.target_id,
            func.avg(Review.rating).label('avg_rating')
        ).filter(Review.target_id.in_(worker_ids)).group_by(Review.target_id).all()
        rating_map = {r.target_id: float(r.avg_rating) for r in ratings}
        
        # Получаем количество завершенных смен
        completed_shifts = db.query(
            Booking.worker_id,
            func.count(Booking.id).label('completed_count')
        ).filter(
            Booking.worker_id.in_(worker_ids),
            Booking.status == 'completed'
        ).group_by(Booking.worker_id).all()
        completed_map = {c.worker_id: c.completed_count for c in completed_shifts}
        
        result = []
        for booking in bookings:
            worker = booking.worker
            result.append(ConfirmedWorker(
                id=worker.id,
                first_name=worker.first_name,
                last_name=worker.last_name,
                phone=worker.phone,
                avatar_url=worker.avatar_url,
                rating=rating_map.get(worker.id, 0.0),
                completed_shifts=completed_map.get(worker.id, 0)
            ))
        
        return result
        
    except Exception as e:
        logger.error(f"Ошибка при получении работников: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")

@router.get("/employer/{employer_id}", response_model=List[JobOut])
def get_jobs_by_employer(
    employer_id: int,
    db: Session = Depends(get_db)
):
    # Исправленный подзапрос: учитываем все бронирования, занимающие место
    occupied_subq = db.query(
        Booking.job_id,
        func.count(Booking.id).label('occupied_count')
    ).filter(
        Booking.status.in_(["confirmed", "employer_booked"])
    ).group_by(Booking.job_id).subquery()

    # Основной запрос: выбираем все вакансии данного работодателя
    results = db.query(
        Job,
        func.coalesce(occupied_subq.c.occupied_count, 0).label('occupied_count')
    ).options(joinedload(Job.required_skill)) \
        .outerjoin(occupied_subq, Job.id == occupied_subq.c.job_id) \
        .filter(Job.employer_id == employer_id) \
        .order_by(Job.created_at.desc()).all()

    if not results:
        return []
    
    # Собираем данные
    employer_ids = list(set(job.employer_id for job, _ in results))
    employers = db.query(User).filter(User.id.in_(employer_ids)).all()
    employer_map = {e.id: e for e in employers}
    
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
    for job, occupied_count in results:
        employer = employer_map.get(job.employer_id)
        company_name = employer.company_name if employer else "Компания не указана"
        
        remaining = job.workers_needed - occupied_count
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
            employer_rating=rating_map.get(job.employer_id, 0.0),
            employer_verified=employer.is_verified if employer else False,
            completed_jobs=completed_map.get(job.employer_id, 0)
        ))
    
    return result