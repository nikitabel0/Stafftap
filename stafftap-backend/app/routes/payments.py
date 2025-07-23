import os
import uuid
import httpx
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.payment import PaymentCreate, PaymentOut
from app.models.payment import Payment
from app.models.user import User
from app.dependencies import get_current_user

# Импортируем модели и схемы отдельно
from app.models.commission import CommissionSetting as CommissionSettingModel
from app.schemas.commission import  CommissionSettingCreate, CommissionSettingBase, CommissionSettingUpdate,CommissionSettingResponse

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Конфигурация Юкассы
YOOKASSA_SHOP_ID = os.getenv("YOOKASSA_SHOP_ID")
YOOKASSA_SECRET_KEY = os.getenv("YOOKASSA_SECRET_KEY")
YOOKASSA_API_URL = "https://api.yookassa.ru/v3/payments"

async def calculate_commission(amount: Decimal, db: Session) -> Decimal:
    """Рассчитывает комиссию для указанной суммы"""
    # Используем модель SQLAlchemy для запросов
    setting = db.query(CommissionSettingModel).first()
    if not setting or not setting.is_active:
        return Decimal("0.00")
    
    if setting.commission_type == "percentage":
        commission = amount * (Decimal(str(setting.value)) / Decimal("100.0"))
    else:
        commission = Decimal(str(setting.value))
    
    # Применяем минимальную комиссию
    if commission < Decimal(str(setting.min_amount)):
        commission = Decimal(str(setting.min_amount))
    
    return commission.quantize(Decimal('0.01'))

@router.get("/calculate-commission")
async def calculate_commission_endpoint(
    amount: float = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    amount_decimal = Decimal(str(amount))
    commission = await calculate_commission(amount_decimal, db)
    total = amount_decimal + commission
    
    return {
        "amount": float(amount_decimal.quantize(Decimal('0.00'))),
        "commission": float(commission.quantize(Decimal('0.00'))),
        "total": float(total.quantize(Decimal('0.00')))
    }

async def create_yookassa_payment(amount: Decimal, description: str, return_url: str):
    headers = {
        "Idempotence-Key": str(uuid.uuid4()),
        "Content-Type": "application/json"
    }
    auth = (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY)
    payload = {
        "amount": {"value": str(amount.quantize(Decimal('0.00'))), "currency": "RUB"},
        "confirmation": {"type": "redirect", "return_url": return_url},
        "capture": True,
        "description": description
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(YOOKASSA_API_URL, json=payload, headers=headers, auth=auth)
        response.raise_for_status()
        return response.json()

@router.post("/deposit", response_model=dict)
async def create_deposit(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        amount_decimal = Decimal(str(payment_data.amount))
        
        # Рассчитываем комиссию
        commission = await calculate_commission(amount_decimal, db)
        total_amount = amount_decimal + commission
        
        description = f"Пополнение баланса для {current_user.email} | Сумма: {amount_decimal} руб. | Комиссия: {commission} руб."
        return_url = "http://ваш-домен/balance"
        
        payment_response = await create_yookassa_payment(
            total_amount, 
            description, 
            return_url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка создания платежа: {str(e)}")

    # Сохраняем платеж в базу с информацией о комиссии
    db_payment = Payment(
        user_id=current_user.id,
        amount=amount_decimal,
        commission=commission,  # Сохраняем сумму комиссии
        status="pending",
        payment_id=payment_response['id'],
        is_processed=False
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)

    return {
        "confirmation_url": payment_response['confirmation']['confirmation_url'],
        "payment_id": db_payment.id,
        "amount": amount_decimal,
        "commission": commission,
        "total": total_amount
    }

def get_current_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для выполнения операции"
        )
    return current_user

@router.get("/commission", response_model=CommissionSettingResponse)
def get_commission_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    settings = db.query(CommissionSettingModel).first()
    if not settings:
        default_settings = CommissionSettingModel(
            is_active=True,
            commission_type="percentage",
            value=10.0,
            min_amount=50.0,
            description="Комиссия 10% (минимум 50 руб.)"
        )
        db.add(default_settings)
        db.commit()
        db.refresh(default_settings)
        settings = default_settings
    
    return CommissionSettingResponse(
        id=settings.id,
        is_active=settings.is_active,
        commission_type=settings.commission_type,
        value=float(settings.value),
        min_amount=float(settings.min_amount),
        description=settings.description
    )

@router.put("/commission", response_model=CommissionSettingResponse)
def update_commission_settings(
    settings_data: CommissionSettingUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    settings = db.query(CommissionSettingModel).first()
    if not settings:
        settings = CommissionSettingModel()
        db.add(settings)
    
    # Обновляем поля
    settings.is_active = settings_data.is_active
    settings.commission_type = settings_data.commission_type
    settings.value = float(settings_data.value)
    settings.min_amount = float(settings_data.min_amount)
    settings.description = settings_data.description
    
    db.commit()
    db.refresh(settings)
    
    return CommissionSettingResponse(
        id=settings.id,
        is_active=settings.is_active,
        commission_type=settings.commission_type,
        value=float(settings.value),
        min_amount=float(settings.min_amount),
        description=settings.description
    )

@router.post("/notify")
async def yookassa_webhook(notification: dict, db: Session = Depends(get_db)):
    event = notification.get('event')
    if event != 'payment.succeeded':
        return {"status": "ignored"}

    payment_data = notification.get('object')
    payment_id = payment_data.get('id')
    status = payment_data.get('status')

    # Поиск платежа в базе
    db_payment = db.query(Payment).filter(
        Payment.payment_id == payment_id
    ).first()
    
    if not db_payment:
        raise HTTPException(status_code=404, detail="Платеж не найден")

    # Обновление статуса
    db_payment.status = status
    db.commit()

    # Начисление средств
    if status == 'succeeded' and not db_payment.is_processed:
        user = db.query(User).get(db_payment.user_id)
        if user:
            user.balance += db_payment.amount
            db_payment.is_processed = True  # Помечаем как обработанный
            db.commit()

    return {"status": "success"}

@router.get("/", response_model=list[PaymentOut])
def get_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Payment).filter(
        Payment.user_id == current_user.id
    ).order_by(Payment.created_at.desc()).all()

@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Платеж не найден")
    
    return payment