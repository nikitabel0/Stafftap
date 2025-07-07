import os
import uuid
import shutil
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Skill, UserSkill, WorkerAvailability,
    EmployerDocument, Review, Job, Booking
)
from app.schemas.reviews import ReviewOut, ReviewResponse
from app.schemas.user import (
    UserProfileResponse, SkillOut, AvailabilityOut,
    AvailabilityInput, DocumentOut, VacancyOut
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


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


@router.put("/{id}")
def update_user_by_id(
    id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != id:
        raise HTTPException(status_code=403, detail="Forbidden")

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    allowed_fields = [
        "first_name", "last_name", "phone", "email", "birth_date",
        "company_name", "experience_months", "rate_per_shift"
    ]

    update_data = {k: v for k, v in data.items() if k in allowed_fields}

    if not update_data:
        return {"status": "ничего не обновлено"}

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    return {"status": "updated"}


@router.post("/{id}/avatar")
def upload_avatar(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != id:
        raise HTTPException(status_code=403, detail="Forbidden")

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    AVATAR_UPLOAD_DIR = "static/avatars"
    os.makedirs(AVATAR_UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(AVATAR_UPLOAD_DIR, filename)

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    user.avatar_url = f"/static/avatars/{filename}"
    db.commit()

    return {"avatar_url": user.avatar_url}


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
        AvailabilityOut(id=a.id, date=a.available_date)
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
