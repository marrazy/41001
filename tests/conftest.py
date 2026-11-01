import os

os.environ.setdefault("JWT_SECRET", "random_jwt_secret_for_testing")

import pytest
from httpx2 import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from api.app import app
from api.db import Base, get_async_session

@pytest.fixture
async def client(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path}/qa.db")
    async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
 
    async def test_get_async_session():
        async with async_session_maker() as session:
            yield session

    app.dependency_overrides[get_async_session] = test_get_async_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
    await engine.dispose()

async def register_and_login(client, email, password="password123", is_seller=False):
    r = await client.post("/auth/register",json={"email": email, "password": password, "is_seller": is_seller})
    assert r.status_code == 201, r.text

    r = await client.post("/auth/jwt/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}

@pytest.fixture
async def buyer(client):
    return await register_and_login(client, "buyer@test.com")

@pytest.fixture
async def seller(client):
    return await register_and_login(client, "seller@test.com", is_seller=True)