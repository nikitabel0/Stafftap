from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from app.models import Notification
from app.database import get_db
from app.models import User, Job, EmployerDocument, Booking, Dispute, FrozenFunds
from app.schemas.job import JobOut
from app.schemas.admin import StatisticsResponse, DisputeDetail
from app.schemas.user import UserRole
from app.schemas.Document import DocumentResponse, DocumentStatusUpdate
from app.dependencies import get_current_user
from datetime import datetime, timedelta
from sqlalchemy.orm import aliased

router = APIRouter(prefix="/api/admin", tags=["admin"])


def get_current_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для выполнения операции"
        )
    return current_user

@router.get("/statistics", response_model=StatisticsResponse)
def get_platform_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    
    total_users = db.query(func.count(User.id)).scalar()
    workers = db.query(func.count(User.id)).filter(User.role == "worker").scalar()
    employers = db.query(func.count(User.id)).filter(User.role == "employer").scalar()
    admins = db.query(func.count(User.id)).filter(User.role == "admin").scalar()
    
    
    active_jobs = db.query(func.count(Job.id)).filter(Job.status == "active").scalar()
    completed_jobs = db.query(func.count(Job.id)).filter(Job.status == "completed").scalar()
    
    
    pending_documents = db.query(func.count(EmployerDocument.id)).filter(
        EmployerDocument.status == "pending"
    ).scalar()
    
    
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=6)
    
    registrations = db.query(
        func.date(User.created_at).label('date'),
        func.count(User.id).label('count')
    ).filter(
        func.date(User.created_at) >= start_date,
        func.date(User.created_at) <= end_date
    ).group_by(func.date(User.created_at)).order_by(func.date(User.created_at)).all()
    
    
    registrations_data = [
        {"date": reg.date.strftime("%Y-%m-%d"), "count": reg.count}
        for reg in registrations
    ]
    
    return {
        "total_users": total_users,
        "workers": workers,
        "employers": employers,
        "admins": admins,
        "active_jobs": active_jobs,
        "completed_jobs": completed_jobs,
        "pending_documents": pending_documents,
        "user_registrations": registrations_data
    }
@router.get("/users")
def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    
    offset = (page - 1) * page_size
    
    
    query = db.query(User)
    
    if search:
        
        search_pattern = f"%{search}%"
        query = query.filter(
            User.email.ilike(search_pattern) |
            User.first_name.ilike(search_pattern) |
            User.last_name.ilike(search_pattern) |
            User.company_name.ilike(search_pattern)
        )
    
    total_users = query.count()
    total_pages = (total_users + page_size - 1) // page_size
    
    users = query.offset(offset).limit(page_size).all()
    
    return {
        "users": users,
        "total_pages": total_pages
    }

@router.patch("/users/{user_id}/block")
def toggle_user_block(
    user_id: int,
    is_blocked: bool = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    user.is_blocked = is_blocked
    db.commit()
    return {"status": "blocked" if is_blocked else "unblocked"}

@router.patch("/users/{user_id}/verify")
def toggle_user_verify(
    user_id: int,
    is_verified: bool = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    user.is_verified = is_verified
    db.commit()
    return {"status": "verified" if is_verified else "unverified"}

@router.patch("/users/{user_id}/role")
def change_user_role(
    user_id: int,
    role: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    if role not in ["worker", "employer", "admin"]:
        raise HTTPException(status_code=400, detail="Недопустимая роль")
    
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    user.role = role
    db.commit()
    return {"status": "role updated"}

@router.get("/documents")
def get_documents_for_moderation(
    status: str = Query("pending", description="Статус документов"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    documents = db.query(EmployerDocument).options(
        joinedload(EmployerDocument.user)
    ).filter(
        EmployerDocument.status == status
    ).all()
    
    return [
        {
            "id": doc.id,
            "document_type": doc.document_type,
            "file_url": doc.file_url,
            "status": doc.status,
            "uploaded_at": doc.uploaded_at,
            "user": {
                "id": doc.user.id,
                "first_name": doc.user.first_name,
                "last_name": doc.user.last_name,
                "company_name": doc.user.company_name
            }
        }
        for doc in documents
    ]

@router.patch("/documents/{doc_id}/status")
def update_document_status(
    doc_id: int,
    status: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    valid_statuses = ["pending", "approved", "rejected"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Недопустимый статус. Допустимые значения: {', '.join(valid_statuses)}"
        )
    
    document = db.query(EmployerDocument).get(doc_id)
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    document.status = status
    db.commit()
    
    
    if status == "approved":
        user = db.query(User).get(document.user_id)
        if user and not user.is_verified:
            user.is_verified = True
            db.commit()
    
    return {"status": "updated"}
@router.get("/jobs/moderation", response_model=List[JobOut])
def get_jobs_for_moderation(
    status: str = Query("moderation", description="Статус вакансий"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    
    valid_statuses = ["moderation", "active", "rejected", "completed", "canceled"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый статус. Допустимые значения: {', '.join(valid_statuses)}"
        )
    
    
    confirmed_subq = db.query(
        Booking.job_id,
        func.count(Booking.id).label('confirmed_count')
    ).filter(
        Booking.status == "confirmed"
    ).group_by(Booking.job_id).subquery()

    
    query = db.query(
        Job,
        func.coalesce(confirmed_subq.c.confirmed_count, 0).label('confirmed_count')
    ).options(
        joinedload(Job.required_skill),
        joinedload(Job.employer)
    ).outerjoin(confirmed_subq, Job.id == confirmed_subq.c.job_id) \
     .filter(Job.status == status)

    results = query.all()
    
    if not results:
        return []
    
    
    result = []
    for job, confirmed_count in results:
        employer = job.employer
        company_name = employer.company_name if employer else "Компания не указана"
        
        remaining = job.workers_needed - confirmed_count
        skill_name = job.required_skill.name if job.required_skill else "Не указано"
        
        
        start_time_str = job.start_time.strftime("%H:%M") if job.start_time else ""
        end_time_str = job.end_time.strftime("%H:%M") if job.end_time else ""
        
        result.append(JobOut(
            id=job.id,
            title=job.title,
            description=job.description,
            required_skill_id=job.required_skill_id,
            required_skill_name=skill_name,
            work_date=job.work_date,
            start_time=start_time_str,
            end_time=end_time_str,
            rate=float(job.rate),
            address=job.address,
            workers_needed=job.workers_needed,
            remaining_slots=remaining,
            company_name=company_name,
            employer_id=job.employer_id,
            created_at=job.created_at,
            employer_rating=0.0,  
            employer_verified=employer.is_verified if employer else False,
            completed_jobs=0  
        ))
    
    return result

@router.patch("/jobs/{job_id}/status")
def update_job_status(
    job_id: int,
    new_status: str = Body(..., embed=True, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    valid_statuses = ["moderation", "active", "rejected", "completed", "canceled"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Недопустимый статус. Допустимые значения: {', '.join(valid_statuses)}"
        )
    
    job = db.query(Job).get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Вакансия не найдена")
    
    
    employer = db.query(User).get(job.employer_id)
    if not employer:
        raise HTTPException(status_code=404, detail="Работодатель не найден")
    
    
    if new_status == "active" and job.status != "moderation":
        raise HTTPException(
            status_code=400,
            detail="Можно активировать только вакансии на модерации"
        )
    
    job.status = new_status
    db.commit()
    
    
    if new_status in ["rejected", "canceled"]:
        bookings = db.query(Booking).filter(
            Booking.job_id == job_id,
            Booking.status.in_(["pending", "confirmed"])
        ).all()
        
        for booking in bookings:
            booking.status = "canceled"
        
        db.commit()
    
    
    notification = None
    
    if new_status == "active":
        notification = Notification(
            user_id=job.employer_id,
            type="job_moderation",
            title="Вакансия прошла модерацию",
            message=f'Ваша вакансия "{job.title}" прошла модерацию и теперь активна',
            related_id=job_id
        )
    elif new_status == "rejected":
        notification = Notification(
            user_id=job.employer_id,
            type="job_moderation",
            title="Вакансия отклонена",
            message=f'Ваша вакансия "{job.title}" отклонена модератором',
            related_id=job_id
        )
    
    if notification:
        db.add(notification)
        db.commit()
    
    return {"status": "updated", "new_status": new_status}


@router.get("/documents/pending", response_model=List[DocumentResponse])
def get_pending_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    documents = db.query(EmployerDocument).filter(
        EmployerDocument.status == "pending"
    ).options(joinedload(EmployerDocument.user)).all()
    
    return [
        DocumentResponse(
            id=doc.id,
            user_id=doc.user_id,
            document_type=doc.document_type,
            file_url=doc.file_url,
            status=doc.status,
            uploaded_at=doc.uploaded_at,
            admin_comment=doc.admin_comment,
            user_email=doc.user.email,
            company_name=doc.user.company_name
        )
        for doc in documents
    ]

@router.post("/documents/{doc_id}/review")
def review_document(
    doc_id: int,
    update: DocumentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    doc = db.query(EmployerDocument).get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if update.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    
    doc.status = update.status
    doc.admin_comment = update.comment
    
    
    if update.status == "approved":
        user = db.query(User).get(doc.user_id)
        user.is_verified = True
    
    db.commit()
    return {"status": "updated"}



@router.get("/disputes", response_model=List[DisputeDetail])
def get_disputes_for_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    Worker = aliased(User)
    Employer = aliased(User)

    disputes = db.query(
        Dispute.id,
        Dispute.booking_id,
        Dispute.description,
        Dispute.created_at,
        Dispute.status,
        Worker.id.label("worker_id"),
        Worker.first_name.label("worker_first_name"),
        Worker.last_name.label("worker_last_name"),
        Worker.email.label("worker_email"),
        Worker.phone.label("worker_phone"),
        Employer.id.label("employer_user_id"),  
        Employer.company_name.label("employer_company_name"),
        Employer.email.label("employer_email"),
        Job.title.label("job_title"),
        Job.work_date.label("job_date"),
        Job.start_time.label("job_start_time"),
        Job.end_time.label("job_end_time"),
        Job.address.label("job_address"),
        FrozenFunds.amount.label("frozen_amount")
    ) \
        .join(Booking, Dispute.booking_id == Booking.id) \
        .join(Worker, Booking.worker_id == Worker.id) \
        .join(Job, Booking.job_id == Job.id) \
        .join(Employer, Job.employer_id == Employer.id) \
        .join(FrozenFunds, FrozenFunds.booking_id == Booking.id) \
        .filter(Dispute.status == "open") \
        .all()

    return disputes

@router.post("/disputes/{dispute_id}/resolve")
def resolve_dispute(
    dispute_id: int,
    decision_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    dispute = db.query(Dispute).get(dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    if dispute.status != "open":
        raise HTTPException(status_code=400, detail="Dispute already resolved")
    
    booking = db.query(Booking).get(dispute.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    job = db.query(Job).get(booking.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    frozen_funds = db.query(FrozenFunds).filter(
        FrozenFunds.booking_id == booking.id
    ).first()
    
    if not frozen_funds:
        raise HTTPException(status_code=404, detail="Frozen funds not found")
    
    
    decision = decision_data.get("decision")
    admin_comment = decision_data.get("comment", "")
    
    if decision == "worker":
        
        worker = db.query(User).get(booking.worker_id)
        if worker:
            worker.balance += frozen_funds.amount
            
            
            notification = Notification(
                user_id=worker.id,
                type="dispute_resolved",
                title="Диспут разрешен",
                message=f"Администратор разрешил диспут в вашу пользу по смене '{job.title}'",
                related_id=booking.id
            )
            db.add(notification)
    elif decision == "employer":
        
        employer = db.query(User).get(job.employer_id)
        if employer:
            employer.balance += frozen_funds.amount
            
            
            notification = Notification(
                user_id=employer.id,
                type="dispute_resolved",
                title="Диспут разрешен",
                message=f"Администратор разрешил диспут в вашу пользу по смене '{job.title}'",
                related_id=booking.id
            )
            db.add(notification)
    else:
        raise HTTPException(status_code=400, detail="Invalid decision")
    
    
    db.delete(frozen_funds)
    
    
    dispute.status = "resolved"
    dispute.resolved_at = datetime.utcnow()
    dispute.admin_id = current_user.id
    dispute.admin_comment = admin_comment
    
    
    booking.status = "completed"
    
    db.commit()
    
    return {"status": "dispute_resolved"}