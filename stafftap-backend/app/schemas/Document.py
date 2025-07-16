from pydantic import BaseModel, EmailStr, Field, validator
from datetime import date, datetime
from enum import Enum
from typing import Optional, List,Dict



class DocumentStatusUpdate(BaseModel):
    status: str
    comment: Optional[str] = None

class DocumentResponse(BaseModel):
    id: int
    user_id: int
    document_type: str
    file_url: str
    status: str
    uploaded_at: datetime
    admin_comment: Optional[str] = None
    user_email: str
    company_name: str