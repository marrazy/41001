from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal

from contextlib import asynccontextmanager

from api.db import create_db_and_tables, User, get_async_session, Item, OrderItem, Order
from api.schemas import ItemCreate, OrderCreate, TopUp, OrderLineIn, UserCreate, UserRead, UserUpdate
from api.users import auth_backend, current_active_user, fastapi_users


@asynccontextmanager
async def lifespan(app):
    await create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(fastapi_users.get_auth_router(auth_backend), prefix='/auth/jwt', tags=["auth"])
app.include_router(fastapi_users.get_register_router(UserRead, UserCreate), prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_reset_password_router(), prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_verify_router(UserRead), prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_users_router(UserRead, UserUpdate), prefix="/users", tags=["users"])

def ensure_seller(user: User):
    if not user.is_seller:
        raise HTTPException(status_code=403, detail="User is not a seller.")


@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/items")
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

@app.post("/wallet/top-up")
async def top_up(
    body: TopUp,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    user = await session.get(User, user.id, with_for_update=True, populate_existing=True)
    user.balance = user.balance + body.amount
    await session.commit()
    return {"balance": user.balance}


@app.post("/orders")
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

    