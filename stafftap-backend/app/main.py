from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, me, users, withdrawals, jobs, skills, bookings, chats, notifications, admin
from app.database import Base, engine
from apscheduler.schedulers.background import BackgroundScheduler
from app.tasks import background_check_completed_jobs  # Импорт из правильного места
from datetime import datetime  # Добавленный импорт

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# Инициализация планировщика
scheduler = BackgroundScheduler()
scheduler.add_job(
    background_check_completed_jobs,
    'interval',
    minutes=10,
    next_run_time=datetime.now()
)
scheduler.start()

# Остановка планировщика при завершении приложения
@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

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