import json
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Chat, Message, User, Booking
from app.schemas.chat import ChatOut, MessageCreate, MessageOut,ChatDetailOut
from app.dependencies import get_current_user
from typing import Dict, List

router = APIRouter(prefix="/api/chats", tags=["chats"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(json.dumps(message))

manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    await manager.connect(user_id, websocket)
    try:
        while True:
            
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)

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
def get_chat_messages(
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
    
    
    await manager.send_personal_message(message_out.dict(), receiver_id)
    
    return message_out

@router.post("/start/{booking_id}", response_model=ChatOut)
def start_chat(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    booking = db.query(Booking).get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    
    if current_user.id != booking.job.employer_id and current_user.id != booking.worker_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    
    existing_chat = db.query(Chat).filter(
        Chat.booking_id == booking_id
    ).first()
    
    if existing_chat:
        return existing_chat
    
    
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
    
    return {
        "id": chat.id,
        "booking_id": chat.booking_id,
        "employer_id": chat.employer_id,
        "worker_id": chat.worker_id,
        "created_at": chat.created_at,
        "interlocutor_id": interlocutor.id,
        "interlocutor_name": f"{interlocutor.first_name} {interlocutor.last_name}",
        "avatar": "avata",
        "status": "online"  
    }


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
    
    return {
        "id": chat.id,
        "booking_id": chat.booking_id,
        "employer_id": chat.employer_id,
        "worker_id": chat.worker_id,
        "created_at": chat.created_at,
        "interlocutor_id": interlocutor.id,
        "interlocutor_name": f"{interlocutor.first_name} {interlocutor.last_name}",
        "avatar": interlocutor.avatar_url or "default_avatar_url",
        "status": "online"  
    }