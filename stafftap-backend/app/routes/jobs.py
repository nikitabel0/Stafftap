from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, datetime
from app.database import get_db
from app.models import Job, Skill, Booking, User, Review, FrozenFunds, Notification, FavoriteJob,Chat
from app.schemas.job import JobDetail, JobOut, JobCreate, ConfirmedWorker
from app.schemas.booking import BookingOut, EmployerBookRequest
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.models import Job, Booking, Notification, FrozenFunds, Dispute, User
from app.dependencies import get_current_user
from app.core import background_check_completed_jobs
from app.dependencies import get_current_user, get_current_user_optional 
from sqlalchemy import func, or_
import logging
from datetime import date, datetime, time
from sqlalchemy import and_, or_

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

logger = logging.getLogger("confirmed_workers")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

def release_funds(db: Session, booking_id: int):
    """Размораживает средства и переводит на баланс работника"""
    try:
        # Находим замороженные средства
        frozen_funds = db.query(FrozenFunds).filter(
            FrozenFunds.booking_id == booking_id
        ).first()
        
        if not frozen_funds:
            logger.warning(f"Замороженные средства не найдены для бронирования {booking_id}")
            return

        # Получаем связанные объекты
        booking = db.query(Booking).get(booking_id)
        if not booking:
            logger.error(f"Бронирование не найдено: {booking_id}")
            return
            
        worker = db.query(User).get(booking.worker_id)
        if not worker:
            logger.error(f"Работник не найден: {booking.worker_id}")
            return

        # Переводим средства
        worker.balance += frozen_funds.amount
        db.delete(frozen_funds)
        
        # Создаем уведомление
        notification = Notification(
            user_id=worker.id,
            type="payment_released",
            title="Оплата за смену",
            message=f"Средства за смену '{booking.job.title}' были переведены на ваш баланс",
            related_id=booking.id
        )
        db.add(notification)
        logger.info(f"Средства разморожены для работника {worker.id}")

    except Exception as e:
        logger.error(f"Ошибка при разморозке средств: {str(e)}", exc_info=True)
        raise

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
        
        # ИСПРАВЛЕНИЕ: добавляем booking_id и chat_id
        chat = db.query(Chat).filter(Chat.booking_id == worker_booking.id).first()
        chat_id = chat.id if chat else None
        
        workers_list.append(ConfirmedWorker(
            id=worker.id,
            first_name=worker.first_name,
            last_name=worker.last_name,
            phone=worker.phone,
            avatar_url=worker.avatar_url,
            rating=rating_map.get(worker.id, 0.0),
            completed_shifts=completed_map.get(worker.id, 0),
            # ДОБАВЛЕНО ОБЯЗАТЕЛЬНОЕ ПОЛЕ
            booking_id=worker_booking.id,
            # ДОБАВЛЕНО ОПЦИОНАЛЬНОЕ ПОЛЕ
            chat_id=chat_id
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
    
    # Проверка прав доступа - только владелец вакансии
    if job.employer_id != current_user.id and current_user.role != "admin":
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
            # Получаем чат для этого бронирования
            chat = db.query(Chat).filter(Chat.booking_id == booking.id).first()
            chat_id = chat.id if chat else None

            result.append(ConfirmedWorker(
                id=worker.id,
                first_name=worker.first_name,
                last_name=worker.last_name,
                phone=worker.phone,
                avatar_url=worker.avatar_url,
                rating=rating_map.get(worker.id, 0.0),
                completed_shifts=completed_map.get(worker.id, 0),
                chat_id=chat_id,
                booking_id=booking.id  # Добавлено новое поле
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

@router.get("/awaiting-feedback")
def get_jobs_awaiting_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Только работодатели могут оставлять фидбэк")
    
    # Находим смены, которые закончились, но еще не получили фидбэк
    jobs = db.query(Job).filter(
        Job.employer_id == current_user.id,
        Job.status == "completed",
        Job.feedback_status == "pending"
    ).all()
    
    return jobs

# Эндпоинт для получения работников смены@router.get("/{job_id}/workers", response_model=List[schemas.ConfirmedWorker])
async def get_job_workers(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Исправленный запрос с загрузкой отношений
    job = db.query(Job)\
        .options(
            joinedload(Job.employer),
            joinedload(Job.bookings).joinedload(Booking.worker)
        )\
        .filter(Job.id == job_id)\
        .first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Проверяем что пользователь - работодатель этой смены
    if job.employer.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # Получаем подтвержденных работников
    confirmed_workers = []
    for booking in job.bookings:
        if booking.status == "confirmed":
            worker = booking.worker
            confirmed_workers.append({
                "id": worker.id,
                "first_name": worker.first_name,
                "last_name": worker.last_name,
                "phone": worker.phone,
                "avatar_url": worker.avatar_url,
                "rating": worker.rating,
                "completed_shifts": worker.completed_shifts,
                "booking_id": booking.id
            })
    
    return confirmed_workers
@router.post("/{job_id}/feedback")
def submit_job_feedback(
    job_id: int,
    feedback: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверка существования смены
    job = db.query(Job).get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Вакансия не найдена")
    
    # Проверка прав доступа
    if job.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    # Проверка статуса смены
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Смена еще не завершена")
    
    # Проверка предыдущего фидбэка
    if job.feedback_status != "pending":
        raise HTTPException(status_code=400, detail="Фидбэк уже был предоставлен")
    
    feedback_status = feedback.get("status")
    problem_worker_ids = feedback.get("problem_workers", [])
    problem_description = feedback.get("problem_description", "")
    
    # Валидация данных
    if feedback_status not in ["success", "problem"]:
        raise HTTPException(status_code=400, detail="Некорректный статус фидбэка")
    
    # Получаем все бронирования для смены
    bookings = db.query(Booking).filter(
        Booking.job_id == job_id,
        Booking.status.in_(["confirmed", "employer_booked"])
    ).all()
    
    # Валидация problem_worker_ids
    valid_worker_ids = [b.worker_id for b in bookings]
    invalid_workers = [wid for wid in problem_worker_ids if wid not in valid_worker_ids]
    
    if invalid_workers:
        raise HTTPException(
            status_code=400,
            detail=f"Указаны несуществующие работники: {invalid_workers}"
        )
    
    # Обработка положительного фидбэка
    if feedback_status == "success":
        for booking in bookings:
            release_funds(db, booking.id)
        job.status = "successfully_completed"
    
    # Обработка проблемного фидбэка
    elif feedback_status == "problem":
        for booking in bookings:
            if booking.worker_id in problem_worker_ids:
                # ПЕРЕДАЕМ ID ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ КАК ИНИЦИАТОРА ДИСПУТА
                create_dispute(
                    db, 
                    booking.id, 
                    problem_description,
                    initiator_id=current_user.id  # ДОБАВЛЕНО
                )
            else:
                release_funds(db, booking.id)
        job.status = "disputed"
    
    # Обновляем статус фидбэка
    job.feedback_status = feedback_status
    job.feedback_submitted_at = datetime.utcnow()
    db.commit()
    
    return {"status": "feedback_accepted"}


# Вспомогательная функция для разморозки средств
def release_funds(db: Session, booking_id: int):
    frozen_funds = db.query(FrozenFunds).filter(
        FrozenFunds.booking_id == booking_id
    ).first()
    
    if frozen_funds:
        booking = db.query(Booking).get(booking_id)
        worker = booking.worker
        worker.balance += frozen_funds.amount
        
        # Создаем уведомление для работника
        notification = Notification(
            user_id=worker.id,
            type="payment_released",
            title="Оплата за смену",
            message=f"Средства за смену '{booking.job.title}' были переведены на ваш баланс",
            related_id=booking.id
        )
        db.add(notification)
        
        db.delete(frozen_funds)

# Вспомогательная функция для создания диспута
def create_dispute(
    db: Session, 
    booking_id: int, 
    description: str,
    initiator_id: int
):
    try:
        # Получаем бронирование с загрузкой связанных данных
        booking = db.query(Booking)\
            .options(
                joinedload(Booking.worker),
                joinedload(Booking.job)
            )\
            .filter(Booking.id == booking_id)\
            .first()
        
        if not booking:
            logger.error(f"Бронирование не найдено: {booking_id}")
            return
        if not booking.job:
            logger.error(f"Смена не найдена для бронирования: {booking_id}")
            return
        if not booking.worker:
            logger.error(f"Работник не найден для бронирования: {booking_id}")
            return

        # СОЗДАЕМ ДИСПУТ С АВТОМАТИЧЕСКИМ ЗАПОЛНЕНИЕМ JOB_ID И WORKER_ID
        dispute = Dispute(
            booking_id=booking_id,
            job_id=booking.job_id,      # Автоматически из бронирования
            worker_id=booking.worker_id, # Автоматически из бронирования
            initiator_id=initiator_id,
            description=description,
            status="open"
        )
        
        db.add(dispute)
        db.flush()

        # Создаем уведомления
        employer_notification = Notification(
            user_id=booking.job.employer_id,
            type="dispute_created",
            title="Открыт диспут",
            message=f"Диспут по работнику {booking.worker.first_name} {booking.worker.last_name} открыт",
            related_id=dispute.id
        )
        db.add(employer_notification)

        worker_notification = Notification(
            user_id=booking.worker.id,
            type="dispute_created",
            title="Открыт диспут",
            message=f"Работодатель открыл диспут по вашей работе на смене '{booking.job.title}'",
            related_id=dispute.id
        )
        db.add(worker_notification)

        booking.status = "disputed"
        logger.info(f"Диспут создан для бронирования {booking_id}")

    except Exception as e:
        logger.error(f"Ошибка при создании диспута: {str(e)}", exc_info=True)
        raise
# Фоновая задача для проверки завершенных смен
def background_check_completed_jobs(db: Session):
    now = datetime.utcnow()
    
    # Находим смены, которые закончились (work_date + end_time < текущего времени)
    jobs = db.query(Job).filter(
        Job.status == "active",
        or_(
            and_(
                Job.work_date == now.date(),
                Job.end_time < now.time()
            ),
            Job.work_date < now.date()
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