from pydantic import BaseModel

class SkillOut(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True