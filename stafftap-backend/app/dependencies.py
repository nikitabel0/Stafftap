from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.database import get_db
from sqlalchemy.orm import Session
from app.crud.user import get_user_by_id
import os
from typing import Optional
from app.models import User

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def decode_jwt_token(token: str) -> dict:
    """Декодирует JWT токен и возвращает payload"""
    try:
        
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
            
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        print(f"JWT decoding error: {str(e)}")
        return None

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    print(f"Received token: {token}")
    
    payload = decode_jwt_token(token)
    if not payload:
        print("Token decoding failed")
        raise credentials_exception
        
    user_id = payload.get("sub")
    if not user_id:
        print("User ID not found in token")
        raise credentials_exception
        
    try:
        user_id = int(user_id)
    except ValueError:
        print(f"Invalid user ID format: {user_id}")
        raise credentials_exception
        
    user = get_user_by_id(db, user_id)
    if not user:
        print(f"User not found with ID: {user_id}")
        raise credentials_exception
        
    print(f"Authenticated user: {user.id} - {user.email}")
    return user


async def get_current_user_from_token(token: str, db: Session) -> Optional[User]:
    """Аутентификация пользователя по токену для WebSocket соединений"""
    payload = decode_jwt_token(token)
    if not payload:
        return None
        
    user_id = payload.get("sub")
    if not user_id:
        return None
        
    try:
        user_id = int(user_id)
    except ValueError:
        return None
        
    return get_user_by_id(db, user_id)


async def get_current_user_optional(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None