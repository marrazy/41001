from fastapi import FastAPI, HTTPException, Depends

from contextlib import asynccontextmanager

from api.db import create_db_and_tables
from api.users import auth_backend, current_active_user, fastapi_users


@asynccontextmanager
async def lifespan(app):
    await create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

