from pydantic import BaseModel
from datetime import datetime

class PaymentBase(BaseModel):
    amount: float
    description: str = "Deposit to account"

class PaymentCreate(PaymentBase):
    pass

class PaymentOut(PaymentBase):
    id: int
    status: str
    payment_id: str
    created_at: datetime

    class Config:
        orm_mode = True