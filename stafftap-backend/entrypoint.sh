#!/usr/bin/env bash
set -e

until pg_isready -h db -p 5432 -U "$POSTGRES_USER"; do
  echo "Waiting for Postgres..."
  sleep 2
done

echo "Apply Alembic migrations…"
alembic upgrade head

echo "Starting Uvicorn…"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
