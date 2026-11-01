from pydantic import BaseModel, Field
from fastapi_users import schemas
from decimal import Decimal
import uuid

class ItemCreate(BaseModel):
    name: str
    description: str | None = None
    price: Decimal = Field(ge=0)
    stock: int = Field(ge=0, default=0)

class OrderCreate(BaseModel):
    lines: list[OrderLineIn]

class TopUp(BaseModel):
    amount: Decimal = Field(gt=0, le=100000)

class OrderLineIn(BaseModel):
    item_id: uuid.UUID
    quantity: int = Field(gt=0)


class UserRead(schemas.BaseUser[uuid.UUID]):
    name: str
    is_seller: bool
    balance: Decimal

class UserCreate(schemas.BaseUserCreate):
    name: str = ""
    is_seller: bool = False

class UserUpdate(schemas.BaseUserUpdate):
    name: str | None = None