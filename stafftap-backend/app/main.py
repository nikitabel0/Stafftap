from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth
from app.database import Base, engine
from app.routes import me
app = FastAPI()
from fastapi import FastAPI, Depends
from app.dependencies import get_current_user
from app.models.user import User


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # потом заменить на вебапп адрес
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


app.include_router(auth.router)
app.include_router(me.router)
@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user