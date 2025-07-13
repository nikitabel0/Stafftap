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

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    print(f"Received token: {token}")
    
    try:
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
            
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"Decoded payload: {payload}")
        
        user_id = payload.get("sub")
        if not user_id:
            print("User ID not found in token")
            raise credentials_exception
            
        user = get_user_by_id(db, int(user_id))
        if not user:
            print(f"User not found with ID: {user_id}")
            raise credentials_exception
            
        print(f"Authenticated user: {user.id} - {user.email}")
        return user
            
    except JWTError as e:
        print(f"JWT decoding error: {str(e)}")
        raise credentials_exception
    except ValueError as e:
        print(f"Invalid user ID format: {str(e)}")
        raise credentials_exception

# Новая зависимость для необязательной аутентификации
async def get_current_user_optional(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:  # Убедитесь, что импортировали Optional и User
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None