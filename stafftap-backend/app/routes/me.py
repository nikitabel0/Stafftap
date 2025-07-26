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





from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.patch("/me/complete-registration", response_model=UserOut)
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
                detail = {
                    "code": "email_exists",
                    "message": "Email уже зарегистрирован"
                }
                if existing_user.password_hash:
                    detail["code"] = "email_exists_with_password"
                raise HTTPException(status_code=400, detail=detail)

        # Хешируем пароль
        hashed_password = pwd_context.hash(registration_data.password)

        # Обновление данных пользователя
        update_data = {
            "birth_date": registration_data.birth_date,
            "role": registration_data.role,
            "email": registration_data.email,
            "password_hash": hashed_password,
            "is_registration_complete": True
        }
        
        if registration_data.role == UserRole.employer:
            update_data["company_name"] = registration_data.company_name
        
        db.query(User).filter(User.id == current_user.id).update(update_data)
        db.commit()
        db.refresh(current_user)
        
        return current_user
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except exc.IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Ошибка при обновлении данных")