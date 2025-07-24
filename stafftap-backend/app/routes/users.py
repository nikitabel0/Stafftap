from decimal import Decimal
import os
import uuid
import shutil
from typing import List
from sqlalchemy.orm import joinedload
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File,Query
from sqlalchemy.orm import Session
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import or_
from datetime import date
from app.database import get_db
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User, UserRole
from app.models.WithdrawalRequest import WithdrawalRequest
from app.schemas.worker import WorkerAvailabilityOut, WorkerOut, WorkerSkillOut
from typing import List
from sqlalchemy.orm import selectinload  
from app.models import (
    User, Skill, UserSkill, WorkerAvailability,
    EmployerDocument, Review, Job, Booking
)
from sqlalchemy import func
from app.schemas.reviews import ReviewOut, ReviewResponse, ReviewCreate
from app.schemas.user import (
    UserProfileResponse, SkillOut, AvailabilityOut,
    AvailabilityInput, DocumentOut, VacancyOut,UserOut, UserUpdate, WithdrawalRequestCreate, WithdrawalRequestOut
)
from app.dependencies import get_current_user
BASEBACK = os.getenv("BASEBACKEND_URL")

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/workers", response_model=List[WorkerOut])
def list_workers(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    skill: Optional[str] = Query(None),
    available_date: Optional[date] = Query(None),
    min_rate: Optional[float] = Query(None),
    search: Optional[str] = Query(None)
):
    try:
        # Базовый запрос с обязательными условиями
        query = (
            db.query(
                User,
                func.coalesce(func.round(func.avg(Review.rating), 1), 0.0).label('rating')
            )
            .outerjoin(Review, Review.target_id == User.id)
            .filter(
                User.role == "worker",
                User.is_blocked.is_(False),
                User.rate_per_shift.isnot(None),  # Только с заполненной суммой
                User.availability.any(  # Только с хотя бы одной будущей датой
                    WorkerAvailability.available_date >= date.today()
                )
            )
            .group_by(User.id)
            .options(
                selectinload(User.skills),
                selectinload(User.availability)  # Загружаем связанные данные
            )
        )

        # Фильтр по навыку
        if skill:
            query = query.join(User.skills).filter(Skill.name == skill)

        # Фильтр по конкретной дате (только будущие даты)
        if available_date:
            if available_date < date.today():
                raise HTTPException(
                    status_code=400,
                    detail="Дата должна быть в будущем"
                )
            query = query.join(User.availability).filter(
                WorkerAvailability.available_date == available_date
            )

        # Фильтр по минимальной ставке
        if min_rate is not None:
            query = query.filter(User.rate_per_shift >= min_rate)

        # Поиск по имени/фамилии/компании
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_pattern),
                    User.last_name.ilike(search_pattern),
                    User.company_name.ilike(search_pattern)
                )
            )

        workers_data = query.offset(skip).limit(limit).all()

        workers_out = []
        for worker, rating in workers_data:
            # Пропускаем некорректные записи
            if worker.phone is None or worker.birth_date is None:
                continue

            # Фильтруем доступные даты (только будущие)
            future_availability = [
                av for av in worker.availability
                if av.available_date >= date.today()
            ]

            worker_dict = {
                "id": worker.id,
                "first_name": worker.first_name,
                "last_name": worker.last_name,
                "avatar_url": worker.avatar_url,
                "phone": worker.phone,
                "birth_date": worker.birth_date,
                "experience_months": worker.experience_months,
                "rate_per_shift": float(worker.rate_per_shift),
                "balance": float(worker.balance),
                "is_verified": worker.is_verified,
                "is_blocked": worker.is_blocked,
                "rating": float(rating),
                "skills": [
                    {"id": skill.id, "name": skill.name}
                    for skill in worker.skills
                ],
                "availability": [
                    {"id": av.id, "date": av.available_date}
                    for av in sorted(future_availability, key=lambda x: x.available_date)
                ]
            }
            workers_out.append(WorkerOut(**worker_dict))
        
        return workers_out
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


@router.get("/skills", response_model=List[SkillOut])
def get_all_skills(db: Session = Depends(get_db)):
    return db.query(Skill).all()


@router.post("/{id}/skills")
def add_skill_to_user(
    id: int,
    skill_id: int = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.role != "worker":
        raise HTTPException(status_code=403, detail="Only workers can add skills")

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    exists = db.query(UserSkill).filter_by(user_id=id, skill_id=skill_id).first()
    if exists:
        raise HTTPException(status_code=400, detail="Skill already added")

    db.add(UserSkill(user_id=id, skill_id=skill_id))
    db.commit()
    return {"status": "added"}


@router.delete("/{id}/skills/{skill_id}")
def remove_skill_from_user(
    id: int,
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.role != "worker":
        raise HTTPException(status_code=403, detail="Only workers can remove skills")

    link = db.query(UserSkill).filter_by(user_id=id, skill_id=skill_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Skill not found for user")

    db.delete(link)
    db.commit()
    return {"status": "removed"}
@router.put("/{id}", response_model=UserOut)
def update_user(
    id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != id:
        raise HTTPException(status_code=403, detail="Forbidden")

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Обновление основных полей
    update_data = data.dict(exclude_unset=True, exclude={"skills", "availability"})
    for field, value in update_data.items():
        setattr(user, field, value)

    # Обновление навыков (только для работника)
    if data.skills is not None and current_user.role == UserRole.worker:
        # Удаляем старые навыки
        db.query(UserSkill).filter(UserSkill.user_id == id).delete()
        # Добавляем новые
        for skill_id in data.skills:
            if db.query(Skill).get(skill_id):
                db.add(UserSkill(user_id=id, skill_id=skill_id))

    # Обновление доступности (только для работника)
    if data.availability is not None and current_user.role == UserRole.worker:
        # Удаляем старую доступность
        db.query(WorkerAvailability).filter(WorkerAvailability.worker_id == id).delete()
        # Добавляем новую
        for date_val in data.availability:
            if date_val < date.today():
                continue
            db.add(WorkerAvailability(worker_id=id, available_date=date_val))

    db.commit()
    
    # Перезагружаем пользователя со всеми связями
    updated_user = db.query(User).options(
        joinedload(User.availability),
        joinedload(User.skills)
    ).filter(User.id == id).first()
    
    return updated_user  # Возвращаем ORM-объект

@router.put("/{id}/availability")
def update_availability(
    id: int,
    data: List[AvailabilityInput],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.role != "worker":
        raise HTTPException(status_code=403, detail="Only workers can update availability")

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.query(WorkerAvailability).filter(WorkerAvailability.worker_id == id).delete()

    for item in data:
        db.add(WorkerAvailability(worker_id=id, available_date=item.date))

    db.commit()
    return {"status": "availability updated", "count": len(data)}

@router.post("/skills", response_model=SkillOut)
def create_skill(
    name: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверяем, существует ли уже такой навык
    existing_skill = db.query(Skill).filter(
        func.lower(Skill.name) == func.lower(name)
    ).first()
    
    if existing_skill:
        return existing_skill
    
    # Создаем новый навык
    new_skill = Skill(name=name)
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    return new_skill


@router.post("/skills/create", response_model=SkillOut)
def create_skill(
    name: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверяем, существует ли уже такой навык
    existing_skill = db.query(Skill).filter(
        func.lower(Skill.name) == func.lower(name)
    ).first()
    
    if existing_skill:
        return existing_skill
    
    # Создаем новый навык
    new_skill = Skill(name=name)
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    return new_skill

@router.get("/{id}/reviews", response_model=ReviewResponse)
def get_user_reviews(id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    reviews = db.query(Review).options(
        joinedload(Review.author)
    ).filter(Review.target_id == id).all()

    rating = round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else 0
    reviews_count = len(reviews)

    result = [
        ReviewOut(
            id=r.id,
            author=f"{r.author.first_name} {r.author.last_name}",
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at
        )
        for r in reviews
    ]

    return ReviewResponse(
        rating=rating,
        reviews_count=reviews_count,
        reviews=result
    )


@router.post("/withdraw", response_model=WithdrawalRequestOut)
async def create_withdrawal_request(
    withdrawal_data: WithdrawalRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Преобразуем float в Decimal
    amount_decimal = Decimal(str(withdrawal_data.amount))
    
    if current_user.balance < amount_decimal:
        raise HTTPException(status_code=400, detail="Недостаточно средств")
    
    if amount_decimal <= 0:
        raise HTTPException(status_code=400, detail="Сумма должна быть положительной")

    # Замораживаем средства
    current_user.balance -= amount_decimal
    current_user.frozen_balance = (current_user.frozen_balance or Decimal('0')) + amount_decimal

    # Создаем запрос на вывод
    withdrawal_request = WithdrawalRequest(
        user_id=current_user.id,
        amount=amount_decimal,
        status="pending",
        payment_method=withdrawal_data.payment_method,
        wallet_address=withdrawal_data.wallet_address
    )
    
    db.add(withdrawal_request)
    db.commit()
    db.refresh(withdrawal_request)
    
    # Уведомление администраторам
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        admin_notification = Notification(
            user_id=admin.id,
            type="new_withdrawal_request",
            title="Новая заявка на вывод средств",
            message=f"Пользователь {current_user.email} подал заявку на вывод {amount_decimal} руб.",
            related_id=withdrawal_request.id
        )
        db.add(admin_notification)
    
    # Уведомление пользователю
    user_notification = Notification(
        user_id=current_user.id,
        type="withdrawal_requested",
        title="Заявка на вывод создана",
        message=f"Ваша заявка на вывод {amount_decimal} руб. принята в обработку",
        related_id=withdrawal_request.id
    )
    db.add(user_notification)
    
    db.commit()
    
    return withdrawal_request

@router.get("/withdraw", response_model=List[WithdrawalRequestOut])
def get_my_withdrawal_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(WithdrawalRequest).filter(
        WithdrawalRequest.user_id == current_user.id
    ).order_by(WithdrawalRequest.created_at.desc()).all()
    
@router.post("/{id}/documents")
def upload_document(
    id: int,
    file: UploadFile = File(...),
    document_type: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Only employers can upload documents")

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    DOC_UPLOAD_DIR = "static/documents"
    os.makedirs(DOC_UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(DOC_UPLOAD_DIR, filename)

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_document = EmployerDocument(
        user_id=id,
        document_type=document_type,
        file_url=f"/static/documents/{filename}"
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    return {"id": db_document.id, "url": db_document.file_url}


@router.delete("/{id}/documents/{doc_id}")
def delete_document(
    id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Only employers can delete documents")

    doc = db.query(EmployerDocument).filter_by(id=doc_id, user_id=id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        os.remove(doc.file_url.lstrip("/"))
    except FileNotFoundError:
        pass

    db.delete(doc)
    db.commit()
    return {"status": "deleted"}




@router.post("/{id}/avatar")
async def upload_avatar(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверка прав доступа
    if current_user.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden"
        )

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Проверка типа файла
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed types: JPG, JPEG, PNG, WEBP"
        )

    # Проверка размера файла (максимум 5MB)
    max_size = 5 * 1024 * 1024  # 5MB
    file.file.seek(0, 2)  # Перемещаемся в конец файла
    file_size = file.file.tell()
    file.file.seek(0)  # Возвращаемся в начало
    
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size is {max_size//1024//1024}MB"
        )

    try:
        # Создаем директорию если ее нет
        AVATAR_UPLOAD_DIR = "static/avatars"
        os.makedirs(AVATAR_UPLOAD_DIR, exist_ok=True)
        
        # Генерируем уникальное имя файла
        ext = file_extension
        filename = f"{uuid.uuid4()}{ext}"
        path = os.path.join(AVATAR_UPLOAD_DIR, filename)

        # Сохраняем файл асинхронно
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Обновляем ссылку в базе данных
        user.avatar_url = f"{BASEBACK}/static/avatars/{filename}"
        db.commit()

        return {"avatar_url": user.avatar_url}
    
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create directory: {str(e)}"
        )
    except Exception as e:
        # Откатываем транзакцию в случае ошибки
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading avatar: {str(e)}"
        )


@router.get("/{id}", response_model=UserProfileResponse)
def get_user_by_id(id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    skill_rows = (
        db.query(Skill)
        .join(UserSkill, UserSkill.skill_id == Skill.id)
        .filter(UserSkill.user_id == id)
        .all()
    )
    skills = [SkillOut(id=s.id, name=s.name) for s in skill_rows]

    availability_rows = (
        db.query(WorkerAvailability)
        .filter(WorkerAvailability.worker_id == id)
        .all()
    )
    availability = [
        AvailabilityOut(id=a.id, available_date=a.available_date)
        for a in availability_rows
    ]

    documents_rows = (
        db.query(EmployerDocument)
        .filter(EmployerDocument.user_id == id)
        .all()
    )
    documents = [
        DocumentOut(
            id=d.id,
            document_type=d.document_type,
            file_url=d.file_url,
            status=d.status,
            uploaded_at=d.uploaded_at
        ) for d in documents_rows
    ]

    reviews = db.query(Review).filter(Review.target_id == id).all()
    rating = round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else 0
    reviews_count = len(reviews)

    active_vacancies = []
    if user.role == "worker":
        bookings = (
            db.query(Booking)
            .filter(Booking.worker_id == id, Booking.status == "confirmed")
            .all()
        )
        job_ids = [b.job_id for b in bookings]
        if job_ids:
            jobs = db.query(Job).filter(Job.id.in_(job_ids)).all()
            for job in jobs:
                active_vacancies.append(VacancyOut(
                    id=job.id,
                    title=job.title,
                    company="N/A",
                    date=job.work_date,
                    start_time=str(job.start_time),
                    end_time=str(job.end_time),
                    address=job.address,
                    salary=float(job.rate),
                    status="confirmed"
                ))

    return UserProfileResponse(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        phone=user.phone,
        email=user.email,
        birth_date=user.birth_date,
        company_name=user.company_name,
        experience_months=user.experience_months,
        rate_per_shift=float(user.rate_per_shift or 0),
        is_verified=user.is_verified,
        created_at=user.created_at,
        rating=rating,
        reviews_count=reviews_count,
        skills=skills,
        availability=availability,
        documents=documents,
        active_vacancies=active_vacancies
    )





@router.get("/{id}/vacancies", response_model=List[VacancyOut])
def get_user_vacancies(id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role != "worker":
        return []

    bookings = (
        db.query(Booking)
        .filter(Booking.worker_id == id, Booking.status == "confirmed")
        .all()
    )
    job_ids = [b.job_id for b in bookings]

    if not job_ids:
        return []

    jobs = db.query(Job).filter(Job.id.in_(job_ids)).all()

    return [
        VacancyOut(
            id=job.id,
            title=job.title,
            company="N/A",
            date=job.work_date,
            start_time=str(job.start_time),
            end_time=str(job.end_time),
            address=job.address,
            salary=float(job.rate),
            status="confirmed"
        )
        for job in jobs
    ]


@router.get("/{id}/reviews", response_model=ReviewResponse)
def get_user_reviews(id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    reviews = db.query(Review).filter(Review.target_id == id).all()

    rating = round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else 0
    reviews_count = len(reviews)

    result = [
        ReviewOut(
            id=r.id,
            author=f"{r.author.first_name} {r.author.last_name}",
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at
        )
        for r in reviews
    ]

    return ReviewResponse(
        rating=rating,
        reviews_count=reviews_count,
        reviews=result
    )


@router.post("/reviews", response_model=ReviewOut)
def create_review(
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверка существования бронирования
    booking = db.query(Booking).get(review_data.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Проверка участия пользователя в бронировании
    if current_user.id not in [booking.worker_id, booking.employer_id]:
        raise HTTPException(status_code=403, detail="Not a participant of this booking")
    
    # Проверка что отзыв не самому себе
    if current_user.id == review_data.target_id:
        raise HTTPException(status_code=400, detail="Cannot review yourself")
    
    # Проверка статуса бронирования (должно быть завершено)
    if booking.status != "completed":
        raise HTTPException(status_code=400, detail="Booking not completed yet")
    
    # Проверка дубликата отзыва
    existing_review = db.query(Review).filter_by(
        booking_id=review_data.booking_id,
        reviewer_id=current_user.id,
        target_id=review_data.target_id
    ).first()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="Review already exists for this booking")
    
    # Создание отзыва
    new_review = Review(
        booking_id=review_data.booking_id,
        reviewer_id=current_user.id,
        target_id=review_data.target_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    
    # Загрузка данных об авторе
    review_with_author = db.query(Review).options(
        joinedload(Review.author)
    ).filter(Review.id == new_review.id).first()
    
    return ReviewOut(
        id=review_with_author.id,
        author=f"{review_with_author.author.first_name} {review_with_author.author.last_name}",
        rating=review_with_author.rating,
        comment=review_with_author.comment,
        created_at=review_with_author.created_at
    )





