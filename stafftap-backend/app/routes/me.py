from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.schemas.user import UserOut
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload  # Добавляем импорты
from app.dependencies import get_db, get_current_user  # Импортируем get_db
from app.schemas.user import UserOut
from app.models.user import User  

router = APIRouter(tags=["me"])
@router.get("/me", response_model=UserOut)
def me(db: Session = Depends(get_db), user = Depends(get_current_user)):
    # Загружаем пользователя со связями
    db_user = db.query(User).options(
        joinedload(User.availability),
        joinedload(User.skills)
    ).filter(User.id == user.id).first()
    
    return db_user  # Просто возвращаем ORM-объект
        