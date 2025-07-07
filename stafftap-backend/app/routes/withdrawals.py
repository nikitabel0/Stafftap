from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, WithdrawalRequest
from app.schemas.user import WithdrawalRequestIn

router = APIRouter(prefix="/api/withdrawals", tags=["withdrawals"])

@router.post("")
def create_withdrawal(request: WithdrawalRequestIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    withdrawal = WithdrawalRequest(
        worker_id=request.user_id,
        amount=request.amount,
        payment_details=request.payment_details
    )
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)
    return {"status": "created", "id": withdrawal.id}
