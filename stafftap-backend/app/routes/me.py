from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.schemas.user import UserOut, UserRole
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload  
from app.dependencies import get_db, get_current_user  
from app.schemas.user import UserOut, UserCompleteRegistration
from app.models.user import User
from sqlalchemy import exc

router = APIRouter(tags=["me"])
@router.get("/me", response_model=UserOut)
def me(db: Session = Depends(get_db), user = Depends(get_current_user)):
    db_user = db.query(User).options(
        joinedload(User.availability),
        joinedload(User.skills)
    ).filter(User.id == user.id).first()
    
    return db_user





@router.patch("/me/complete-registration")
async def complete_registration(
    registration_data: UserCompleteRegistration,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Проверяем уникальность email
        if registration_data.email:
            existing_user = db.query(User).filter(
                User.email == registration_data.email,
                User.id != current_user.id
            ).first()
            
            if existing_user:
                raise HTTPException(
                    status_code=400,
                    detail="Email уже используется другим пользователем"
                )

        # Обновление данных пользователя
        current_user.birth_date = registration_data.birth_date
        current_user.role = registration_data.role
        current_user.email = registration_data.email
        
        if registration_data.role == UserRole.employer:
            current_user.company_name = registration_data.company_name
        
        current_user.is_registration_complete = True
        
        db.commit()
        db.refresh(current_user)
        
        return {"status": "registration_complete"}
    
    except exc.IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Ошибка при обновлении данных пользователя"
        )