from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, me, users, withdrawals,jobs,skills,bookings,chats,notifications,admin
from app.database import Base, engine
app = FastAPI()
from fastapi import FastAPI, Depends
from app.dependencies import get_current_user
from app.models.user import User


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],   # потом заменить на вебапп адрес
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


app.include_router(auth.router)
app.include_router(me.router)
app.include_router(users.router)
app.include_router(withdrawals.router)
app.include_router(jobs.router)
app.include_router(skills.router)
app.include_router(bookings.router)
app.include_router(chats.router)
app.include_router(notifications.router)
app.include_router(admin.router)
