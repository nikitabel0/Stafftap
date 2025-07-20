from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Skill
from app.schemas.skill import SkillOut

router = APIRouter(prefix="/api/skills", tags=["skills"])

@router.get("/", response_model=list[SkillOut])
def get_skills(db: Session = Depends(get_db)):
    return db.query(Skill).all()