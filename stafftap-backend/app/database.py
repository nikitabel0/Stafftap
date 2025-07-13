from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
import logging

# Настройка логгера
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
logger.info(f"DATABASE_URL: {DATABASE_URL}")

engine = create_engine(DATABASE_URL)

# Проверяем, используем ли PostgreSQL
if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
    
    # Функция для добавления значения в enum при подключении
    @event.listens_for(engine, "connect")
    def add_admin_value(dbapi_connection, connection_record):
        try:
            # Создаем курсор для выполнения SQL
            cursor = dbapi_connection.cursor()
            
            # Проверяем существование значения 'admin' в enum
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM pg_enum 
                    WHERE enumtypid = 'userrole'::regtype 
                    AND enumlabel = 'admin'
                )
            """)
            exists = cursor.fetchone()[0]
            
            if not exists:
                logger.info("Adding 'admin' value to userrole enum")
                try:
                    # Пытаемся добавить значение
                    cursor.execute("ALTER TYPE userrole ADD VALUE 'admin'")
                    dbapi_connection.commit()
                except Exception as alter_err:
                    logger.error(f"Error adding admin value: {alter_err}")
                    dbapi_connection.rollback()
            cursor.close()
        except Exception as e:
            logger.error(f"Error checking enum values: {e}")
        finally:
            if cursor:
                cursor.close()

# Проверяем наличие значения при запуске
try:
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT EXISTS (
                SELECT 1 
                FROM pg_enum 
                WHERE enumtypid = 'userrole'::regtype 
                AND enumlabel = 'admin'
            )
        """))
        exists = result.scalar()
        logger.info(f"'admin' value exists in enum: {exists}")
except Exception as e:
    logger.error(f"Error checking enum on startup: {e}")

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()