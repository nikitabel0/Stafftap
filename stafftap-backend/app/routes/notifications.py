import logging  # Добавляем стандартный модуль логирования
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Notification, User
from app.schemas.notification import NotificationOut
from app.dependencies import get_current_user, get_current_user_from_token
from typing import List, Dict
import json
from sqlalchemy import func

# Создаем правильный логгер
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        # УБРАН вызов websocket.accept() здесь
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except Exception:
                self.disconnect(user_id)

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    current_user = None
    try:
        current_user = await get_current_user_from_token(token, db)
        if not current_user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # ПЕРЕНЕСЕНО: принимаем соединение только здесь
        await websocket.accept()
        await manager.connect(websocket, current_user.id)
        
        while True:
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        if current_user:
            manager.disconnect(current_user.id)
    except Exception as e:
        # Используем правильный логгер
        logger.error(f"WebSocket error: {e}", exc_info=True)
        if current_user:
            manager.disconnect(current_user.id)
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)


# Остальные эндпоинты
@router.get("/", response_model=List[NotificationOut])
async def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()
    return notifications

# ИСПРАВЛЕНО: убраны лишние квадратные скобки
@router.put("/{id}/read", response_model=NotificationOut)
async def mark_notification_as_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = db.query(Notification).filter(
        Notification.id == id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    
    # Отправляем обновление через WebSocket
    count = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).scalar()
    
    await manager.send_personal_message({
        "type": "unread_count_update",
        "count": count
    }, current_user.id)
    
    return notification

@router.delete("/{id}")
async def delete_notification(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = db.query(Notification).filter(
        Notification.id == id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    db.delete(notification)
    db.commit()
    
    # Отправляем обновление через WebSocket
    count = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).scalar()
    
    await manager.send_personal_message({
        "type": "unread_count_update",
        "count": count
    }, current_user.id)
    
    return {"status": "deleted"}

@router.get("/unread-count")
async def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).scalar()
    return {"count": count}