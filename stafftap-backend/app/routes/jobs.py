from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, datetime
import os
from pathlib import Path
from fastapi import UploadFile, File
from datetime import datetime
import uuid
import requests
from app.database import get_db
from app.schemas.review import ReviewCreate 
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
from app.routes.notifications import create_admin_notification


BASEBACK = os.getenv("BASEBACKEND_URL")

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
        
        frozen_funds = db.query(FrozenFunds).filter(
            FrozenFunds.booking_id == booking_id
        ).first()
        
        if not frozen_funds:
            logger.warning(f"Замороженные средства не найдены для бронирования {booking_id}")
            return

        
        booking = db.query(Booking).get(booking_id)
        if not booking:
            logger.error(f"Бронирование не найдено: {booking_id}")
            return
            
        worker = db.query(User).get(booking.worker_id)
        if not worker:
            logger.error(f"Работник не найден: {booking.worker_id}")
            return

        
        worker.balance += frozen_funds.amount
        db.delete(frozen_funds)
        
        
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


TG_BOT_TOKEN = os.getenv("TELEGRAM_TOKEN")
TG_CHANNEL_ID = os.getenv("TG_VACANCIES_CHANNEL_ID")


import requests
from sqlalchemy.orm import joinedload

def send_telegram_notification(job: Job, db: Session):
    """Отправляет уведомление о новой вакансии в Telegram-канал"""
    if not all([TG_BOT_TOKEN, TG_CHANNEL_ID]):
        logger.error("Telegram notification settings not configured")
        return

    try:
        # Перезагружаем job с явной загрузкой связанных данных
        job = db.query(Job).options(
            joinedload(Job.required_skill),
            joinedload(Job.employer)
        ).filter(Job.id == job.id).first()
        
        if not job:
            logger.error(f"Job not found in database: {job.id}")
            return

        # Получаем информацию о работодателе
        company_name = job.employer.company_name if job.employer else "Неизвестная компания"
        
        # Формируем название навыка
        skill_name = (
            job.required_skill.name if job.required_skill 
            else job.custom_skill or "Не указан"
        )
        
        # Добавляем ссылку на вакансию
      
        
        message = (
            "🚀 *Новая вакансия на модерации!*\n\n"
            f"*Компания:* {company_name}\n"
            f"*Название:* {job.title}\n"
            f"*Навык:* {skill_name}\n"
            f"*Дата:* {job.work_date}\n"
            f"*Адрес:* {job.address}\n"
            f"*Ставка:* {job.rate} руб.\n"
            f"*Количество работников:* {job.workers_needed}\n\n"
 
        )
        
        # Отправляем сообщение в Telegram
        url = f"https://api.telegram.org/bot{TG_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": "@StaffTap_Notifications",
            "text": message,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True
        }
        
        response = requests.post(url, json=payload)
        response.raise_for_status()
        logger.info(f"Telegram notification sent for job {job.id}")
        
    except Exception as e:
        logger.error(f"Error sending Telegram notification: {str(e)}", exc_info=True)
@router.get("/", response_model=List[JobOut])
def get_jobs(
    skill: Optional[str] = Query(None, alias="skill"),
    date_filter: Optional[date] = Query(None, alias="date"),
    min_rate: Optional[float] = Query(None, alias="min_rate"),
    city: Optional[str] = Query(None, alias="city"), 
    db: Session = Depends(get_db)
):
    
    occupied_subq = db.query(
        Booking.job_id,
        func.count(Booking.id).label('occupied_count')
    ).filter(
        Booking.status.in_(["confirmed", "employer_booked"])
    ).group_by(Booking.job_id).subquery()

    
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
    if city:
        query = query.filter(Job.address.ilike(f"%{city}%"))
    
    results = query.all()
    
    if not results:
        return []
    
    
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
        skill_name = (job.required_skill.name if job.required_skill 
              else job.custom_skill if job.custom_skill 
              else 'не указано')
        
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
            custom_skill=job.custom_skill,
            establishment_name=job.establishment_name,
            completed_jobs=completed_map.get(job.employer_id, 0)
        ))
    
    return result


@router.post("/", status_code=201)
def create_job(
    job_data: JobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверка прав и верификации пользователя
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
    
    # Проверка навыков
    if job_data.required_skill_id and job_data.custom_skill:
        raise HTTPException(
            status_code=400,
            detail="Укажите либо навык из списка, либо свой собственный, но не оба сразу"
        )
    
    if job_data.required_skill_id:
        skill = db.query(Skill).get(job_data.required_skill_id)
        if not skill:
            raise HTTPException(
                status_code=400,
                detail="Указан несуществующий навык"
            )
    
    # Создание вакансии
    new_job = Job(
        employer_id=current_user.id,
        title=job_data.title,
        description=job_data.description,
        required_skill_id=job_data.required_skill_id,
        custom_skill=job_data.custom_skill,  
        work_date=job_data.work_date,
        start_time=job_data.start_time,
        end_time=job_data.end_time,
        address=job_data.address,
        rate=job_data.rate,
        workers_needed=job_data.workers_needed,
        photo_urls=job_data.photo_urls,
        establishment_name=job_data.establishment_name,
        status="moderation"
    )
    
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    
    # Отправка уведомления в Telegram
    background_tasks.add_task(send_telegram_notification, new_job, db)
    
    # Создание уведомления для администраторов
    title = "Новая вакансия на модерации"
    message = (
        f"Вакансия: {new_job.title}\n"
        f"Компания: {current_user.company_name or 'Без названия'}\n"
        f"Дата: {new_job.work_date}\n"
        f"Кол-во работников: {new_job.workers_needed}\n\n"
    )
    
    background_tasks.add_task(
        create_admin_notification,
        db,
        title,
        message,
        new_job.id
    )
    
    return {"id": new_job.id, "status": "created"}
    


@router.post("/upload")
async def upload_photo(
    photo: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    
    upload_dir = Path("static/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    
    file_ext = photo.filename.split(".")[-1].lower()
    if file_ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(400, detail="Недопустимый формат файла")
    
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = upload_dir / file_name
    
    
    try:
        with open(file_path, "wb") as buffer:
            content = await photo.read()
            
            if len(content) > 5 * 1024 * 1024:
                raise HTTPException(400, detail="Файл слишком большой (макс. 5MB)")
            buffer.write(content)
    except Exception as e:
        raise HTTPException(500, detail=f"Ошибка сохранения файла: {str(e)}")
    
    return {"url": f"{BASEBACK}/static/uploads/{file_name}"}
@router.get("/{job_id}", response_model=JobDetail)
def get_job_details(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Вакансия не найдена")
    
    
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

    
    occupied_count = db.query(func.count(Booking.id)).filter(
        Booking.job_id == job_id,
        Booking.status.in_(["confirmed", "employer_booked"])
    ).scalar()
    remaining_slots = job.workers_needed - occupied_count

    
    workers_list = []
    worker_ids = [bw.worker_id for bw in booked_workers]
    
    if worker_ids:
        
        ratings = db.query(
            Review.target_id,
            func.avg(Review.rating).label('avg_rating')
        ).filter(Review.target_id.in_(worker_ids)).group_by(Review.target_id).all()
        rating_map = {r.target_id: float(r.avg_rating) for r in ratings}
        
        
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
            
            booking_id=worker_booking.id,
            
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
        status=job.status, 
        photo_urls=job.photo_urls,
        establishment_name=job.establishment_name,
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
        custom_skill=job.custom_skill, 
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
    
    occupied_subq = db.query(
        Booking.job_id,
        func.count(Booking.id).label('occupied_count')
    ).filter(
        Booking.status.in_(["confirmed", "employer_booked"])
    ).group_by(Booking.job_id).subquery()
    
    
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
             custom_skill=job.custom_skill,
               establishment_name=job.establishment_name,
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
    job = db.query(Job).get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Вакансия не найдена")
    
    if job.employer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    bookings = db.query(Booking).options(
        joinedload(Booking.worker)
    ).filter(
        Booking.job_id == job_id,
        Booking.status.in_(["confirmed", "employer_booked"])
    ).all()
    
    if not bookings:
        return []
    
    worker_ids = [b.worker_id for b in bookings]
    
    
    ratings = db.query(
        Review.target_id,
        func.avg(Review.rating).label('avg_rating')
    ).filter(Review.target_id.in_(worker_ids)).group_by(Review.target_id).all()
    rating_map = {r.target_id: float(r.avg_rating) for r in ratings}
    
    
    completed_shifts = db.query(
        Booking.worker_id,
        func.count(Booking.id).label('completed_count')
    ).filter(
        Booking.worker_id.in_(worker_ids),
        Booking.status == 'completed'
    ).group_by(Booking.worker_id).all()
    completed_map = {c.worker_id: c.completed_count for c in completed_shifts}
    
    
    reviews_exist = db.query(
        Review.booking_id
    ).filter(
        Review.booking_id.in_([b.id for b in bookings])
    ).all()
    reviewed_bookings = {r.booking_id for r in reviews_exist}
    
    result = []
    for booking in bookings:
        worker = booking.worker
        
        chat = db.query(Chat).filter(Chat.booking_id == booking.id).first()
        chat_id = chat.id if chat else None

        result.append({
            "id": worker.id,
            "first_name": worker.first_name,
            "last_name": worker.last_name,
            "phone": worker.phone,
            "avatar_url": worker.avatar_url,
            "rating": rating_map.get(worker.id, 0.0),
            "completed_shifts": completed_map.get(worker.id, 0),
            "booking_id": booking.id,
            "chat_id": chat_id,
            
            "has_review": booking.id in reviewed_bookings
        })
    
    return result
    

@router.get("/employer/{employer_id}", response_model=List[JobOut])
def get_jobs_by_employer(
    employer_id: int,
    db: Session = Depends(get_db)
):
    
    occupied_subq = db.query(
        Booking.job_id,
        func.count(Booking.id).label('occupied_count')
    ).filter(
        Booking.status.in_(["confirmed", "employer_booked"])
    ).group_by(Booking.job_id).subquery()

    
    results = db.query(
        Job,
        func.coalesce(occupied_subq.c.occupied_count, 0).label('occupied_count')
    ).options(joinedload(Job.required_skill)) \
        .outerjoin(occupied_subq, Job.id == occupied_subq.c.job_id) \
        .filter(Job.employer_id == employer_id) \
        .order_by(Job.created_at.desc()).all()

    if not results:
        return []
    
    
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
            completed_jobs=completed_map.get(job.employer_id, 0),
            custom_skill=job.custom_skill,
            establishment_name=job.establishment_name
        ))
    
    return result

@router.get("/awaiting-feedback")
def get_jobs_awaiting_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Только работодатели могут оставлять фидбэк")
    
    
    jobs = db.query(Job).filter(
        Job.employer_id == current_user.id,
        Job.status == "completed",
        Job.feedback_status == "pending"
    ).all()
    
    return jobs


async def get_job_workers(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    job = db.query(Job)\
        .options(
            joinedload(Job.employer),
            joinedload(Job.bookings).joinedload(Booking.worker)
        )\
        .filter(Job.id == job_id)\
        .first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    
    if job.employer.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    
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
    job = db.query(Job).get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Вакансия не найдена")
    
    if job.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Смена еще не завершена")
    
    if job.feedback_status != "pending":
        raise HTTPException(status_code=400, detail="Фидбэк уже был предоставлен")
    
    feedback_status = feedback.get("status")
    problem_worker_ids = feedback.get("problem_workers", [])
    problem_description = feedback.get("problem_description", "")
    
    if feedback_status not in ["success", "problem"]:
        raise HTTPException(status_code=400, detail="Некорректный статус фидбэка")
    
    bookings = db.query(Booking).filter(
        Booking.job_id == job_id,
        Booking.status.in_(["confirmed", "employer_booked"])
    ).all()
    
    valid_worker_ids = [b.worker_id for b in bookings]
    invalid_workers = [wid for wid in problem_worker_ids if wid not in valid_worker_ids]
    
    if invalid_workers:
        raise HTTPException(
            status_code=400,
            detail=f"Указаны несуществующие работники: {invalid_workers}"
        )
    
    
    if feedback_status == "success":
        for booking in bookings:
            release_funds(db, booking.id)
        
        
        for booking in bookings:
            notification = Notification(
                user_id=booking.worker_id,
                type="payment_released",
                title="Оплата за смену",
                message=f"Средства за смену '{job.title}' были переведены на ваш баланс",
                related_id=booking.id
            )
            db.add(notification)
        
        job.status = "successfully_completed"
    

    elif feedback_status == "problem":
        for booking in bookings:
            if booking.worker_id in problem_worker_ids:
                create_dispute(db, booking.id, problem_description, current_user.id)
            else:
                release_funds(db, booking.id)
                
                notification = Notification(
                    user_id=booking.worker_id,
                    type="payment_released",
                    title="Оплата за смену",
                    message=f"Средства за смену '{job.title}' были переведены на ваш баланс",
                    related_id=booking.id
                )
                db.add(notification)
        job.status = "disputed"
    
    job.feedback_status = feedback_status
    job.feedback_submitted_at = datetime.utcnow()
    db.commit()
    
    return {"status": "feedback_accepted"}


def release_funds(db: Session, booking_id: int):
    frozen_funds = db.query(FrozenFunds).filter(
        FrozenFunds.booking_id == booking_id
    ).first()
    
    if frozen_funds:
        booking = db.query(Booking).get(booking_id)
        worker = booking.worker
        worker.balance += frozen_funds.amount
        
        
        notification = Notification(
            user_id=worker.id,
            type="payment_released",
            title="Оплата за смену",
            message=f"Средства за смену '{booking.job.title}' были переведены на ваш баланс",
            related_id=booking.id
        )
        db.add(notification)
        
        db.delete(frozen_funds)


def create_dispute(
    db: Session, 
    booking_id: int, 
    description: str,
    initiator_id: int
):
    try:
        
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

        
        dispute = Dispute(
            booking_id=booking_id,
            job_id=booking.job_id,      
            worker_id=booking.worker_id, 
            initiator_id=initiator_id,
            description=description,
            status="open"
        )
        
        db.add(dispute)
        db.flush()

        
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

@router.post("/worker-create")
def worker_create_dispute(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    if current_user.role != "worker":
        raise HTTPException(status_code=403, detail="Только работники могут создавать диспут")

    booking_id = data.get("booking_id")
    description = data.get("description")

    if not booking_id or not description:
        raise HTTPException(status_code=400, detail="Не указаны обязательные поля")

    
    booking = db.query(Booking).get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    if booking.worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    
    job = booking.job
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Смена еще не завершена")

    
    existing_dispute = db.query(Dispute).filter(Dispute.booking_id == booking_id).first()
    if existing_dispute:
        raise HTTPException(status_code=400, detail="Диспут уже существует")

    
    dispute = Dispute(
        booking_id=booking_id,
        job_id=booking.job_id,
        worker_id=booking.worker_id,
        initiator_id=current_user.id,
        description=description,
        status="open"
    )
    db.add(dispute)

    
    booking.status = "disputed"

    
    employer_notification = Notification(
        user_id=job.employer_id,
        type="dispute_created",
        title="Открыт диспут",
        message=f"Работник открыл диспут по смене '{job.title}'",
        related_id=dispute.id
    )
    db.add(employer_notification)

    
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        admin_notification = Notification(
            user_id=admin.id,
            type="dispute_created",
            title="Новый диспут",
            message=f"Создан новый диспут по смене '{job.title}'",
            related_id=dispute.id
        )
        db.add(admin_notification)

    db.commit()

    return {"status": "dispute_created", "dispute_id": dispute.id}



@router.post("/{notification_id}/confirm-work")
def confirm_work(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    notification = db.query(Notification).get(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    if notification.type != "worker_job_completed":
        raise HTTPException(
            status_code=400,
            detail="Неверный тип уведомления"
        )
    
    
    review_notification = Notification(
        user_id=current_user.id,
        type="review_request",
        title="Оставить отзыв",
        message="Пожалуйста, оцените работодателя",
        related_id=notification.related_id  
    )
    db.add(review_notification)
    
    
    db.delete(notification)
    db.commit()
    
    return {"status": "work_confirmed"}

@router.post("/{notification_id}/submit-review")
def submit_review(
    notification_id: int,
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    notification = db.query(Notification).get(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    if notification.type != "review_request":
        raise HTTPException(
            status_code=400,
            detail="Неверный тип уведомления"
        )
    
    
    booking = db.query(Booking).get(notification.related_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    
    review = Review(
        booking_id=booking.id,
        reviewer_id=current_user.id,
        target_id=booking.job.employer_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    db.add(review)
    
    
    db.delete(notification)
    db.commit()
    
    return {"status": "review_submitted"}

@router.post("/{notification_id}/skip-review")
def skip_review(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    notification = db.query(Notification).get(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    if notification.type != "review_request":
        raise HTTPException(
            status_code=400,
            detail="Неверный тип уведомления"
        )
    
    
    db.delete(notification)
    db.commit()
    
    return {"status": "review_skipped"}

def background_check_completed_jobs(db: Session):
    now = datetime.utcnow()
    
    
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
        
        job.status = "completed"
        job.feedback_status = "pending"
        
        
        notification = Notification(
            user_id=job.employer_id,
            type="job_completed",
            title="Смена завершена",
            message=f"Смена '{job.title}' завершена. Пожалуйста, оставьте отзыв",
            related_id=job.id
        )
        db.add(notification)
    
    db.commit()