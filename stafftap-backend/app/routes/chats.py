from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Chat, Message, User, Booking
from app.schemas.chat import ChatOut, MessageCreate, MessageOut, ChatDetailOut
from app.dependencies import get_current_user, get_current_user_from_token
from typing import Dict, List
import json
from sqlalchemy import func, or_
import logging

router = APIRouter(prefix="/api/chats", tags=["chats"])
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    self.disconnect(user_id, websocket)

manager = ConnectionManager()

def get_total_unread_for_user(db: Session, user_id: int):
    chat_ids = db.query(Chat.id).filter(
        or_(Chat.employer_id == user_id, Chat.worker_id == user_id)
    ).subquery()
    
    total = db.query(func.count(Message.id)).filter(
        Message.chat_id.in_(chat_ids),
        Message.is_read == False,
        Message.sender_id != user_id
    ).scalar()
    
    return total or 0

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        current_user = await get_current_user_from_token(token, db)
        if not current_user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        await websocket.accept()
        await manager.connect(current_user.id, websocket)
        logger.info(f"User {current_user.id} connected via WebSocket")
        
        while True:
            data = await websocket.receive_text()
            
    except WebSocketDisconnect:
        logger.info(f"User {current_user.id if 'current_user' in locals() else 'unknown'} disconnected")
        if 'current_user' in locals():
            manager.disconnect(current_user.id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)

@router.get("/", response_model=List[ChatOut])
def get_user_chats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    chats = db.query(Chat).filter(
        (Chat.employer_id == current_user.id) | 
        (Chat.worker_id == current_user.id)
    ).all()
    
    result = []
    for chat in chats:
        if chat.employer_id == current_user.id:
            interlocutor = chat.worker
        else:
            interlocutor = chat.employer
        
        last_message = db.query(Message).filter(
            Message.chat_id == chat.id
        ).order_by(Message.sent_at.desc()).first()
        
        unread_count = db.query(Message).filter(
            Message.chat_id == chat.id,
            Message.sender_id != current_user.id,
            Message.is_read == False
        ).count()
        
        result.append(ChatOut(
            id=chat.id,
            booking_id=chat.booking_id,
            employer_id=chat.employer_id,
            worker_id=chat.worker_id,
            created_at=chat.created_at,
            interlocutor_name=f"{interlocutor.first_name} {interlocutor.last_name}",
            last_message=last_message.content if last_message else "",
            last_message_time=last_message.sent_at if last_message else chat.created_at,
            unread_count=unread_count
        ))
    
    result.sort(key=lambda x: x.last_message_time, reverse=True)
    return result

@router.get("/{chat_id}/messages", response_model=List[MessageOut])
async def get_chat_messages(  # Изменили на асинхронную функцию
    chat_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    chat = db.query(Chat).get(chat_id)
    if not chat or (chat.employer_id != current_user.id and chat.worker_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    db.query(Message).filter(
        Message.chat_id == chat_id,
        Message.sender_id != current_user.id,
        Message.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    messages = db.query(Message).filter(
        Message.chat_id == chat_id
    ).order_by(Message.sent_at.asc()).all()
    
    # Отправляем обновление счетчика
    total_unread = get_total_unread_for_user(db, current_user.id)
    await manager.send_personal_message({
        "type": "chat_unread_update",
        "count": total_unread
    }, current_user.id)
    
    return messages

@router.post("/{chat_id}/messages", response_model=MessageOut)
async def send_message(
    chat_id: int,
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = db.query(Chat).get(chat_id)
    if not chat or (chat.employer_id != current_user.id and chat.worker_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    new_message = Message(
        chat_id=chat_id,
        sender_id=current_user.id,
        content=message_data.content,
        is_read=False
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    receiver_id = chat.employer_id if current_user.id == chat.worker_id else chat.worker_id
    
    message_out = MessageOut(
        id=new_message.id,
        chat_id=new_message.chat_id,
        sender_id=new_message.sender_id,
        content=new_message.content,
        is_read=new_message.is_read,
        sent_at=new_message.sent_at
    )
    
    # Отправляем новое сообщение получателю
    await manager.send_personal_message(message_out.dict(), receiver_id)
    
    # Отправляем обновление счетчика непрочитанных
    total_unread = get_total_unread_for_user(db, receiver_id)
    await manager.send_personal_message({
        "type": "chat_unread_update",
        "count": total_unread
    }, receiver_id)
    
    return message_out

@router.post("/start/{booking_id}", response_model=ChatOut)
def start_chat(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Получаем бронирование с связанной работой
    booking = db.query(Booking).options(joinedload(Booking.job)).get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Проверяем, что текущий пользователь является участником бронирования
    if current_user.id != booking.job.employer_id and current_user.id != booking.worker_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Проверяем существующий чат
    existing_chat = db.query(Chat).filter(
        Chat.booking_id == booking_id
    ).first()
    
    if existing_chat:
        return existing_chat
    
    # Создаем новый чат
    new_chat = Chat(
        booking_id=booking_id,
        employer_id=booking.job.employer_id,
        worker_id=booking.worker_id
    )
    
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    
    return new_chat

@router.get("/{chat_id}", response_model=ChatDetailOut)
def get_chat_detail(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = db.query(Chat).get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Чат не найден")
    
    if current_user.id not in [chat.employer_id, chat.worker_id]:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    
    if current_user.id == chat.employer_id:
        interlocutor = chat.worker
    else:
        interlocutor = chat.employer
    
    return ChatDetailOut(
        id=chat.id,
        booking_id=chat.booking_id,
        employer_id=chat.employer_id,
        worker_id=chat.worker_id,
        created_at=chat.created_at,
        interlocutor_id=interlocutor.id,
        interlocutor_name=f"{interlocutor.first_name} {interlocutor.last_name}",
        status="online"  
    )

@router.get("/by-booking/{booking_id}", response_model=ChatDetailOut)
def get_chat_by_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = db.query(Chat).filter(Chat.booking_id == booking_id).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Чат не найден")
    
    if current_user.id not in [chat.employer_id, chat.worker_id]:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    
    if current_user.id == chat.employer_id:
        interlocutor = chat.worker
    else:
        interlocutor = chat.employer
    
    return ChatDetailOut(
        id=chat.id,
        booking_id=chat.booking_id,
        employer_id=chat.employer_id,
        worker_id=chat.worker_id,
        created_at=chat.created_at,
        interlocutor_id=interlocutor.id,
        interlocutor_name=f"{interlocutor.first_name} {interlocutor.last_name}",
        status="online"
    )

@router.get("/unread-total", response_model=dict)
def get_total_unread_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total = get_total_unread_for_user(db, current_user.id)
    return {"total_unread": total}