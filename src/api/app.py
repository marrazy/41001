from fastapi import FastAPI, HTTPException, Depends, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal

from contextlib import asynccontextmanager
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from api.db import create_db_and_tables, User, get_async_session, Item, OrderItem, Order
from api.schemas import ItemCreate, OrderCreate, TopUp, OrderLineIn, UserCreate, UserRead, UserUpdate, ItemUpdate
from api.users import auth_backend, current_active_user, fastapi_users

import uuid

@asynccontextmanager
async def lifespan(app):
    await create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)
api = APIRouter(prefix="/api")

api.include_router(fastapi_users.get_auth_router(auth_backend), prefix='/auth/jwt', tags=["auth"])
api.include_router(fastapi_users.get_register_router(UserRead, UserCreate), prefix="/auth", tags=["auth"])
api.include_router(fastapi_users.get_reset_password_router(), prefix="/auth", tags=["auth"])
api.include_router(fastapi_users.get_verify_router(UserRead), prefix="/auth", tags=["auth"])
api.include_router(fastapi_users.get_users_router(UserRead, UserUpdate), prefix="/users", tags=["users"])

def ensure_seller(user: User):
    if not user.is_seller:
        raise HTTPException(status_code=403, detail="User is not a seller.")


@app.get("/health")
async def health_check():
    return {"status": "ok"}

@api.post("/items")
async def create_item(
    body: ItemCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    ensure_seller(user)

    new_item = Item(
        seller_id=user.id,
        name=body.name,
        description=body.description,
        price=body.price,
        stock=body.stock
    )
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item

@api.post("/wallet/top-up")
async def top_up(
    body: TopUp,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    user = await session.get(User, user.id, with_for_update=True, populate_existing=True)
    user.balance = user.balance + body.amount
    await session.commit()
    return {"balance": user.balance}


@api.post("/orders")
async def order(
    body: OrderCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    user = await session.get(User, user.id, with_for_update=True, populate_existing=True)
    total = Decimal('0.00')
    items = []
    for line in body.lines:
        item = await session.get(Item, line.item_id, with_for_update=True, populate_existing=True)
        if item is None:
            raise HTTPException(status_code=404)
        if item.seller_id == user.id:
            raise HTTPException(status_code=400, detail="You can't buy your own item")
        if item.stock < line.quantity:
            raise HTTPException(status_code=400)
        item.stock = item.stock - line.quantity
        item_total_price = item.price*line.quantity
        
        seller = await session.get(User, item.seller_id, with_for_update=True, populate_existing=True)
        seller.balance += item_total_price
        total += item_total_price

        order = OrderItem(
            item_id=item.id,
            quantity=line.quantity,
            unit_price=item.price
        )
        items.append(order)

    if user.balance < total:
        raise HTTPException(status_code=400)
    user.balance = user.balance - total

    new_order = Order(
        buyer_id=user.id,
        total=total,
        lines=items
    )
    session.add(new_order)
    await session.commit()
    await session.refresh(new_order)
    
    return {"order_id": new_order.id, "total": total, "balance": user.balance}

@api.get("/orders/me")
async def get_my_orders(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(select(Order).where(Order.buyer_id == user.id).order_by(Order.created_at.desc()).options(selectinload(Order.lines)))
    orders = [row[0] for row in result.all()]

    orders_data = []
    for order in orders:
        orders_data.append(
            {
                "id": order.id,
                "total": order.total,
                "created_at": order.created_at,
                "lines": order.lines
                
            }
        )
    return {"orders": orders_data}

@api.get("/items")
async def get_items(session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(Item).order_by(Item.created_at.desc()))
    items = [row[0] for row in result.all()]

    items_data = []
    for item in items:
        items_data.append(
            {
                "id": item.id,
                "seller_id": item.seller_id,
                "name": item.name,
                "description": item.description,
                "price": item.price,
                "stock": item.stock
            }
        )
    return {"items": items_data}

@api.get("/items/mine")
async def list_my_items(
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    ensure_seller(user)
    result = await session.execute(select(Item).order_by(Item.created_at.desc()).where(Item.seller_id == user.id))
    items = result.scalars().all()

    items_data = []
    for item in items:
        items_data.append(
            {
                "id": item.id,
                "seller_id": item.seller_id,
                "name": item.name,
                "description": item.description,
                "price": item.price,
                "stock": item.stock
            }
        )
    return {"items": items_data}

@api.get("/items/{item_id}")
async def get_single_item(
    item_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session)
):
    item = await session.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {
        "id": item.id,
        "seller_id": item.seller_id,
        "name": item.name,
        "description": item.description,
        "price": item.price,
        "stock": item.stock
    }

@api.patch("/items/{item_id}")
async def update_item(
    item_id: uuid.UUID,
    updated_item: ItemUpdate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    item = await session.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.seller_id != user.id:
        raise HTTPException(status_code=403, detail="Not this account's item")

    for key, value in updated_item.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
        
    await session.commit()
    await session.refresh(item)
    return item

@api.delete("/items/{item_id}", status_code=204)
async def delete_item(
    item_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    item = await session.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.seller_id != user.id:
        raise HTTPException(status_code=403, detail="Not this account's item")

    result = await session.execute(
    select(OrderItem.id).where(OrderItem.item_id == item_id).limit(1)
)
    if result.first() is not None:
        raise HTTPException(status_code=400, detail="Item has orders and can't be deleted")
    await session.delete(item)
    await session.commit()

@api.get("/orders/{order_id}")
async def single_order(
    order_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user)
):
    result = await session.execute(select(Order).where(Order.id == order_id, Order.buyer_id == user.id).options(selectinload(Order.lines)))
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Item not found")
    if order.buyer_id != user.id:
        raise HTTPException(status_code=404)
    
    return {
        "id": order.id,
        "created_at": order.created_at,
        "total": order.total,
        "lines": order.lines
    }

app.include_router(api)

from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

FRONTEND_DIR = (Path(__file__).resolve().parents[2] / "frontend" / "dist").resolve()

if FRONTEND_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def serve_frontend(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        file = (FRONTEND_DIR / path).resolve()
        if path and file.is_file() and FRONTEND_DIR in file.parents:
            return FileResponse(file)
        return FileResponse(FRONTEND_DIR / "index.html")