from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import hmac
import json
from urllib.parse import parse_qs
import hashlib
from app.database import get_db
from app.schemas.user import UserCreate, UserOut
from app.crud.user import get_user_by_email, create_user, verify_password, get_user_by_telegram_id,create_user_via_telegram,get_user_by_telegram_username
from app.auth.jwt import create_access_token
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.schemas.user import UserOut, UserRole
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload  
from app.dependencies import get_db, get_current_user  
from app.schemas.user import UserOut, UserCompleteRegistration
from app.models.user import User
from sqlalchemy import exc
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = create_user(db, user_data)
    if not db_user:
        raise HTTPException(status_code=400, detail="Registration failed")

    return db_user

@router.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    found_user = get_user_by_email(db, data.get("email"))
    if not found_user or not verify_password(data.get("password"), found_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(found_user.id)})
    return {"access_token": token, "token_type": "bearer"}





@router.post("/merge-account")
def merge_account(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_user = get_user_by_email(db, data["email"])
    if not existing_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if not pwd_context.verify(data["password"], existing_user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный пароль")
    
    # Хешируем новый пароль (если он был передан)
    hashed_password = pwd_context.hash(data.get("new_password", data["password"]))
    
    # Переносим данные
    current_user.role = existing_user.role
    current_user.balance = existing_user.balance
    current_user.is_verified = existing_user.is_verified
    current_user.first_name = existing_user.first_name
    current_user.last_name = existing_user.last_name
    current_user.company_name = existing_user.company_name
    current_user.password_hash = hashed_password
    current_user.is_registration_complete = True
    
    # Архивируем старый профиль
    existing_user.email = f"archived_{existing_user.id}@example.com"
    existing_user.is_archived = True
    
    db.commit()
    db.refresh(current_user)
    
    return {"status": "data_merged"}




@router.post("/telegram")
async def telegram_auth(
    data: dict,  # { "initData": "строка_данных" }
    db: Session = Depends(get_db)
):
    init_data_str = data.get("initData")
    if not init_data_str:
        raise HTTPException(status_code=400, detail="initData required")
    
    # Парсим строку данных
    parsed_data = parse_qs(init_data_str)
    telegram_data = {k: v[0] for k, v in parsed_data.items()}
    
    # Проверяем подпись
    bot_token = "8084921632:AAEjh-NdL7wu_5Mpc7owSCporhQ01fgKpB4"
    data_check_string = "\n".join(
        f"{k}={telegram_data[k]}" 
        for k in sorted(telegram_data.keys()) 
        if k != "hash"
    )
    
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(
        secret_key, 
        data_check_string.encode(), 
        hashlib.sha256
    ).hexdigest()
    
    if computed_hash != telegram_data.get("hash"):
        raise HTTPException(status_code=401, detail="Invalid Telegram signature")
    
    # Извлекаем данные пользователя
    user_data = json.loads(telegram_data.get("user"))
    telegram_id = user_data.get("id")
    telegram_username = user_data.get("username")  # Получаем username
    
    # Поиск пользователя
    user = None
    
    # 1. Поиск по telegram_id
    if telegram_id:
        user = get_user_by_telegram_id(db, telegram_id)
    
    # 2. Если не найден по ID, ищем по username
    if not user and telegram_username:
        user = get_user_by_telegram_username(db, telegram_username)
    
    # 3. Если пользователь не найден, создаем нового
    if not user:
        user = create_user_via_telegram(db, telegram_id, user_data)
    else:
        # Обновляем данные существующего пользователя
        update_fields = False
        
        # Обновляем username если он изменился
        if telegram_username and user.telegram_username != telegram_username:
            user.telegram_username = telegram_username
            update_fields = True
        
        # Обновляем имя, если его не было
        if not user.first_name and 'first_name' in user_data:
            user.first_name = user_data['first_name']
            update_fields = True
        
        # Обновляем фамилию, если ее не было
        if not user.last_name and 'last_name' in user_data:
            user.last_name = user_data['last_name']
            update_fields = True
        
        # Обновляем аватар, если его не было
        if not user.avatar_url and 'photo_url' in user_data:
            user.avatar_url = user_data['photo_url']
            update_fields = True
        
        # Сохраняем изменения, если были обновления
        if update_fields:
            db.commit()
            db.refresh(user)
    
    # Генерация JWT токена
    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}