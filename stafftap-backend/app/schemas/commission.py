from pydantic import BaseModel
from typing import Optional

class CommissionSettingBase(BaseModel):
    is_active: bool
    commission_type: str
    value: float
    min_amount: float
    description: Optional[str] = None

class CommissionSettingCreate(CommissionSettingBase):
    pass

class CommissionSettingUpdate(CommissionSettingBase):
    pass

class CommissionSettingResponse(CommissionSettingBase):
    id: int

    class Config:
        orm_mode = True