import pytest

async def create_item(client, seller, name="Tomato", price="2.50", stock=10):
    r = await client.post(
        "/items", json={"name": name, "price": price, "stock": stock}, headers=seller
    )
    assert r.status_code in (200, 201), r.text
    return r.json()


async def get_balance(client, headers):
    me = (await client.get("/users/me", headers=headers)).json()
    return float(me["balance"])


async def test_seller_can_create_item(client, seller):
    item = await create_item(client, seller)
    assert item["name"] == "Tomato"
    assert item["stock"] == 10


async def test_buyer_cannot_create_item(client, buyer):
    r = await client.post("/items", json={"name": "X", "price": "1", "stock": 1}, headers=buyer)
    assert r.status_code == 403


async def test_item_price_cannot_be_negative(client, seller):
    r = await client.post("/items", json={"name": "X", "price": "-5", "stock": 1}, headers=seller)
    assert r.status_code == 422



async def test_top_up_adds_money(client, buyer):
    r = await client.post("/wallet/top-up", json={"amount": "50"}, headers=buyer)
    assert r.status_code == 200
    assert await get_balance(client, buyer) == 50


async def test_top_up_must_be_positive(client, buyer):
    r = await client.post("/wallet/top-up", json={"amount": "-50"}, headers=buyer)
    assert r.status_code == 422
    assert await get_balance(client, buyer) == 0



async def test_buying_moves_money_and_stock(client, buyer, seller):
    await client.post("/wallet/top-up", json={"amount": "100"}, headers=buyer)
    item = await create_item(client, seller, price="2.50", stock=10)

    r = await client.post(
        "/orders", json={"lines": [{"item_id": item["id"], "quantity": 4}]}, headers=buyer
    )
    assert r.status_code in (200, 201), r.text
    assert float(r.json()["total"]) == 10

    assert await get_balance(client, buyer) == 90
    assert await get_balance(client, seller) == 10


async def test_cannot_buy_more_than_stock(client, buyer, seller):
    await client.post("/wallet/top-up", json={"amount": "100"}, headers=buyer)
    item = await create_item(client, seller, stock=2)
    r = await client.post(
        "/orders", json={"lines": [{"item_id": item["id"], "quantity": 3}]}, headers=buyer
    )
    assert r.status_code == 400
    assert await get_balance(client, buyer) == 100  


async def test_cannot_buy_without_enough_money(client, buyer, seller):
    await client.post("/wallet/top-up", json={"amount": "100"}, headers=buyer)
    item = await create_item(client, seller, price="600", stock=5)
    r = await client.post(
        "/orders", json={"lines": [{"item_id": item["id"], "quantity": 2}]}, headers=buyer
    )
    assert r.status_code == 400
    assert await get_balance(client, buyer) == 100
    assert await get_balance(client, seller) == 0


async def test_failed_order_changes_nothing(client, buyer, seller):
    """Second line fails, so the first line must not be saved either."""
    cheap = await create_item(client, seller, name="Cheap", price="1", stock=10)
    rare = await create_item(client, seller, name="Rare", price="1", stock=1)

    r = await client.post(
        "/orders",
        json={"lines": [
            {"item_id": cheap["id"], "quantity": 5},
            {"item_id": rare["id"], "quantity": 5},
        ]},
        headers=buyer,
    )
    assert r.status_code == 400
    assert await get_balance(client, buyer) == 0
    assert await get_balance(client, seller) == 0

async def test_my_orders_lists_only_my_orders(client, buyer, seller):
    await client.post("/wallet/top-up", json={"amount": "1000"}, headers=buyer)
    item = await create_item(client, seller)
    await client.post(
        "/orders", json={"lines": [{"item_id": item["id"], "quantity": 1}]}, headers=buyer
    )
    r = await client.get("/orders/me", headers=buyer)
    assert r.status_code == 200
    assert len(r.json()["orders"]) == 1

    r = await client.get("/orders/me", headers=seller)
    assert r.json() == {'orders': []}