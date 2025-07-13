#!/bin/sh
until pg_isready -h db -p 5432 -U "$POSTGRES_USER"; do
  echo "Waiting for Postgres..."
  sleep 2
done

alembic upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
