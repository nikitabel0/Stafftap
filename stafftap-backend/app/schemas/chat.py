from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class ChatOut(BaseModel):
    id: int
    booking_id: int
    employer_id: int
    worker_id: int
    created_at: datetime
    interlocutor_name: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: Optional[int] = 0

    class Config:
        orm_mode = True

class MessageCreate(BaseModel):
    content: str

class MessageOut(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    content: str
    is_read: bool
    sent_at: datetime

    class Config:
        orm_mode = True


class ChatDetailOut(BaseModel):
    id: int
    booking_id: int
    employer_id: int
    worker_id: int
    created_at: datetime
    interlocutor_id: int
    interlocutor_name: str
    avatar: Optional[str] = None
    status: str