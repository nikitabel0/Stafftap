from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status, Body
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Chat, Message, User, Booking
from app.schemas.chat import ChatOut, MessageCreate, MessageOut, ChatDetailOut, UnreadTotalOut
from app.schemas.user import UserRole
from app.dependencies import get_current_user, get_current_user_from_token
from typing import Dict, List
import json
from sqlalchemy import or_, and_, func
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

def get_total_unread_for_user(db: Session, user_id: int) -> int:
    """Получает общее количество непрочитанных сообщений для пользователя"""
    try:
        # Используем более эффективный запрос с JOIN
        total = db.query(func.count(Message.id)) \
            .join(Chat, Message.chat_id == Chat.id) \
            .filter(
                or_(
                    Chat.employer_id == user_id,
                    Chat.worker_id == user_id
                ),
                Message.sender_id != user_id,
                Message.is_read == False
            ) \
            .scalar()
        
        return total if total is not None else 0
    except Exception as e:
        logger.error(f"Error counting unread messages for user {user_id}: {str(e)}")
        return 0

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """WebSocket для обновлений чатов в реальном времени"""
    try:
        current_user = await get_current_user_from_token(token, db)
        if not current_user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        await websocket.accept()
        await manager.connect(current_user.id, websocket)
        logger.info(f"User {current_user.id} connected via WebSocket")
        
        # Отправляем текущее количество непрочитанных сообщений при подключении
        total_unread = get_total_unread_for_user(db, current_user.id)
        await manager.send_personal_message({
            "type": "chat_unread_update",
            "count": total_unread
        }, current_user.id)
        
        # Ожидаем сообщения (в этом эндпоинте мы только слушаем обновления)
        while True:
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        logger.info(f"User {current_user.id if 'current_user' in locals() else 'unknown'} disconnected")
        if 'current_user' in locals():
            manager.disconnect(current_user.id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass

@router.get("/", response_model=List[ChatOut])
def get_user_chats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Получает все чаты пользователя с последними сообщениями"""
    try:
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
            
            # Пропускаем чаты без собеседника
            if not interlocutor:
                continue
                
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
        
        # Сортируем по времени последнего сообщения
        result.sort(key=lambda x: x.last_message_time or datetime.min, reverse=True)
        return result
        
    except Exception as e:
        logger.error(f"Error getting user chats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Эндпоинт для получения общего количества непрочитанных сообщений
# Должен быть объявлен ВЫШЕ динамических путей
@router.get("/unread-total", response_model=UnreadTotalOut)
def get_total_unread_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получает общее количество непрочитанных сообщений"""
    try:
        total = get_total_unread_for_user(db, current_user.id)
        return UnreadTotalOut(total_unread=total)
    except Exception as e:
        logger.error(f"Error in unread-total endpoint: {str(e)}")
        return UnreadTotalOut(total_unread=0)

# Все последующие эндпоинты с параметрами пути должны иметь явное указание типа
@router.get("/{chat_id:int}/messages", response_model=List[MessageOut])
async def get_chat_messages(
    chat_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Получает сообщения чата и помечает их как прочитанные"""
    try:
        chat = db.query(Chat).get(chat_id)
        if not chat or (chat.employer_id != current_user.id and chat.worker_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Помечаем сообщения как прочитанные
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
        
    except Exception as e:
        logger.error(f"Error getting chat messages: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{chat_id:int}/messages", response_model=MessageOut)
async def send_message(
    chat_id: int,
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отправляет новое сообщение в чат"""
    try:
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
        await manager.send_personal_message({
            "type": "new_message",
            "message": message_out.dict(),
            "chat_id": chat_id
        }, receiver_id)
        
        # Отправляем обновление счетчика непрочитанных
        total_unread = get_total_unread_for_user(db, receiver_id)
        await manager.send_personal_message({
            "type": "chat_unread_update",
            "count": total_unread
        }, receiver_id)
        
        return message_out
        
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/start/{booking_id:int}", response_model=ChatOut)
def start_chat(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создает новый чат для бронирования"""
    try:
        booking = db.query(Booking).options(joinedload(Booking.job)).get(booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
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
        
    except Exception as e:
        logger.error(f"Error starting chat: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{chat_id:int}", response_model=ChatDetailOut)
def get_chat_detail(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получает детали чата"""
    try:
        chat = db.query(Chat).get(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        if current_user.id not in [chat.employer_id, chat.worker_id]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        interlocutor = chat.worker if current_user.id == chat.employer_id else chat.employer
        
        # Проверяем существование собеседника
        if not interlocutor:
            raise HTTPException(status_code=404, detail="Interlocutor not found")
        
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
        
    except Exception as e:
        logger.error(f"Error getting chat details: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/by-booking/{booking_id:int}", response_model=ChatDetailOut)
def get_chat_by_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получает чат по ID бронирования"""
    try:
        chat = db.query(Chat).filter(Chat.booking_id == booking_id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        if current_user.id not in [chat.employer_id, chat.worker_id]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        interlocutor = chat.worker if current_user.id == chat.employer_id else chat.employer
        
        if not interlocutor:
            raise HTTPException(status_code=404, detail="Interlocutor not found")
        
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
        
    except Exception as e:
        logger.error(f"Error getting chat by booking: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/admin/start/{booking_id:int}", response_model=ChatOut)
def start_admin_chat(
    booking_id: int,
    participant_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Администратор начинает чат с участником бронирования"""
    try:
        if current_user.role != UserRole.admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        participant_id = participant_data.get("participant_id")
        if not participant_id:
            raise HTTPException(status_code=400, detail="Participant ID is required")
        
        logger.info(f"Admin chat request: booking_id={booking_id}, participant_id={participant_id}")
        
        booking = db.query(Booking).options(joinedload(Booking.job)).get(booking_id)
        if not booking:
            logger.error(f"Booking not found: {booking_id}")
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if not booking.job:
            logger.error(f"Job not found for booking: {booking_id}")
            raise HTTPException(status_code=404, detail="Job not found for booking")
        
        valid_participants = [booking.job.employer_id, booking.worker_id]
        logger.info(f"Valid participants for booking {booking_id}: {valid_participants}")
        
        if participant_id not in valid_participants:
            logger.error(f"Invalid participant: {participant_id} not in {valid_participants}")
            raise HTTPException(
                status_code=400,
                detail=f"Participant not in booking. Valid IDs: {valid_participants}"
            )
        
        # Ищем существующий чат
        existing_chat = db.query(Chat).filter(
            or_(
                and_(
                    Chat.employer_id == current_user.id,
                    Chat.worker_id == participant_id,
                    Chat.booking_id == booking_id
                ),
                and_(
                    Chat.employer_id == participant_id,
                    Chat.worker_id == current_user.id,
                    Chat.booking_id == booking_id
                )
            )
        ).first()
        
        if existing_chat:
            logger.info(f"Existing chat found: {existing_chat.id}")
            return existing_chat
        
        # Создаем новый чат
        new_chat = Chat(
            booking_id=booking_id,
            employer_id=current_user.id,
            worker_id=participant_id
        )
        
        db.add(new_chat)
        db.commit()
        db.refresh(new_chat)
        
        logger.info(f"New chat created: {new_chat.id}")
        return new_chat
        
    except Exception as e:
        logger.error(f"Error starting admin chat: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")