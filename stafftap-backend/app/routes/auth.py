from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserCreate, UserOut
from app.crud.user import get_user_by_email, create_user, verify_password
from app.auth.jwt import create_access_token

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
