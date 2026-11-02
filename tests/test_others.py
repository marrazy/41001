import uuid
 
import pytest
 
PASSWORD = "password123"
 
async def login_as(client, email, is_seller=False):
    r = await client.post(
        "/auth/register", json={"email": email, "password": PASSWORD, "is_seller": is_seller}
    )
    assert r.status_code == 201, r.text
    r = await client.post("/auth/jwt/login", data={"username": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
 
 
async def create_item(client, seller, name="Tomato", price="2.50", stock=10):
    r = await client.post(
        "/items", json={"name": name, "price": price, "stock": stock}, headers=seller
    )
    assert r.status_code in (200, 201), r.text
    return r.json()
 
 
async def place_order(client, buyer, item_id, quantity=1):
    r = await client.post("/wallet/top-up", json={"amount": "1000"}, headers=buyer)
    assert r.status_code == 200, r.text
    r = await client.post(
        "/orders", json={"lines": [{"item_id": item_id, "quantity": quantity}]}, headers=buyer
    )
    assert r.status_code in (200, 201), r.text
    return r.json()
 
 
def as_list(body, key):
    """Accepts either a plain list or a wrapped one like {"items": [...]}."""
    return body if isinstance(body, list) else body[key]
 
 
@pytest.fixture
async def other_seller(client):
    return await login_as(client, "other-seller@test.com", is_seller=True)
 
async def test_list_items_works_without_login(client, seller):
    await create_item(client, seller, name="Tomato")
    await create_item(client, seller, name="Carrot")
 
    r = await client.get("/items")
    assert r.status_code == 200
    names = {i["name"] for i in as_list(r.json(), "items")}
    assert names == {"Tomato", "Carrot"}
 
 
async def test_list_items_empty(client):
    r = await client.get("/items")
    assert r.status_code == 200
    assert as_list(r.json(), "items") == []
 
 
 
async def test_my_items_only_shows_my_items(client, seller, other_seller):
    await create_item(client, seller, name="Mine")
    await create_item(client, other_seller, name="Theirs")
 
    r = await client.get("/items/mine", headers=seller)
    assert r.status_code == 200
    names = [i["name"] for i in as_list(r.json(), "items")]
    assert names == ["Mine"]
 
 
async def test_my_items_needs_seller(client, buyer):
    r = await client.get("/items/mine", headers=buyer)
    assert r.status_code == 403
 
 
async def test_my_items_needs_login(client):
    r = await client.get("/items/mine")
    assert r.status_code == 401
 
 
 
async def test_get_one_item(client, seller):
    item = await create_item(client, seller, name="Tomato", price="2.50")
 
    r = await client.get(f"/items/{item['id']}")
    assert r.status_code == 200
    assert r.json()["name"] == "Tomato"
    assert float(r.json()["price"]) == 2.50
 
 
async def test_get_missing_item_is_404(client):
    r = await client.get(f"/items/{uuid.uuid4()}")
    assert r.status_code == 404
 
 
async def test_get_item_with_bad_id_is_422(client):
    r = await client.get("/items/not-a-uuid")
    assert r.status_code == 422
 
 
 
async def test_owner_can_update_item(client, seller):
    item = await create_item(client, seller, name="Tomato", price="2.50", stock=10)
 
    r = await client.patch(f"/items/{item['id']}", json={"price": "3.00"}, headers=seller)
    assert r.status_code == 200, r.text
 
    updated = (await client.get(f"/items/{item['id']}")).json()
    assert float(updated["price"]) == 3.00

    assert updated["name"] == "Tomato"
    assert updated["stock"] == 10
 
 
async def test_update_several_fields(client, seller):
    item = await create_item(client, seller)
 
    r = await client.patch(
        f"/items/{item['id']}", json={"name": "Cherry tomato", "stock": 3}, headers=seller
    )
    assert r.status_code == 200, r.text
 
    updated = (await client.get(f"/items/{item['id']}")).json()
    assert updated["name"] == "Cherry tomato"
    assert updated["stock"] == 3
 
 
async def test_other_seller_cannot_update_item(client, seller, other_seller):
    item = await create_item(client, seller, price="2.50")
 
    r = await client.patch(f"/items/{item['id']}", json={"price": "0.01"}, headers=other_seller)
    assert r.status_code == 403
 
    unchanged = (await client.get(f"/items/{item['id']}")).json()
    assert float(unchanged["price"]) == 2.50
 
 
async def test_buyer_cannot_update_item(client, seller, buyer):
    item = await create_item(client, seller)
    r = await client.patch(f"/items/{item['id']}", json={"price": "0.01"}, headers=buyer)
    assert r.status_code == 403
 
 
async def test_update_missing_item_is_404(client, seller):
    r = await client.patch(f"/items/{uuid.uuid4()}", json={"price": "1"}, headers=seller)
    assert r.status_code == 404
 
 
async def test_update_with_negative_price_is_422(client, seller):
    item = await create_item(client, seller)
    r = await client.patch(f"/items/{item['id']}", json={"price": "-1"}, headers=seller)
    assert r.status_code == 422
 
 
 
async def test_owner_can_delete_item(client, seller):
    item = await create_item(client, seller)
 
    r = await client.delete(f"/items/{item['id']}", headers=seller)
    assert r.status_code in (200, 204), r.text
 
    r = await client.get(f"/items/{item['id']}")
    assert r.status_code == 404
 
 
async def test_other_seller_cannot_delete_item(client, seller, other_seller):
    item = await create_item(client, seller)
 
    r = await client.delete(f"/items/{item['id']}", headers=other_seller)
    assert r.status_code == 403
 
    r = await client.get(f"/items/{item['id']}")
    assert r.status_code == 200
 
 
async def test_buyer_cannot_delete_item(client, seller, buyer):
    item = await create_item(client, seller)
    r = await client.delete(f"/items/{item['id']}", headers=buyer)
    assert r.status_code == 403
 
 
async def test_delete_missing_item_is_404(client, seller):
    r = await client.delete(f"/items/{uuid.uuid4()}", headers=seller)
    assert r.status_code == 404
 
 
async def test_cannot_delete_item_that_has_orders(client, seller, buyer):
    """An item that appears in an order can't be deleted, or the order would point at nothing.
 
    Note: SQLite (used in these tests) does NOT enforce foreign keys by default,
    so the route has to check for existing order lines itself and return 400.
    MySQL/PostgreSQL on RDS would refuse the delete with an IntegrityError instead.
    """
    item = await create_item(client, seller)
    await place_order(client, buyer, item["id"])
 
    r = await client.delete(f"/items/{item['id']}", headers=seller)
    assert r.status_code == 400
 
    r = await client.get(f"/items/{item['id']}")
    assert r.status_code == 200
 
 
async def test_get_my_order(client, seller, buyer):
    item = await create_item(client, seller, price="2.50")
    order = await place_order(client, buyer, item["id"], quantity=2)
 
    r = await client.get(f"/orders/{order['order_id']}", headers=buyer)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == order["order_id"]
    assert float(body["total"]) == 5.00
    assert len(body["lines"]) == 1
    assert body["lines"][0]["quantity"] == 2
 
 
async def test_cannot_see_someone_elses_order(client, seller, buyer):
    item = await create_item(client, seller)
    order = await place_order(client, buyer, item["id"])
 
    stranger = await login_as(client, "stranger@test.com")
    r = await client.get(f"/orders/{order['order_id']}", headers=stranger)
    assert r.status_code == 404
 
 
async def test_get_missing_order_is_404(client, buyer):
    r = await client.get(f"/orders/{uuid.uuid4()}", headers=buyer)
    assert r.status_code == 404
 
 
async def test_get_order_needs_login(client):
    r = await client.get(f"/orders/{uuid.uuid4()}")
    assert r.status_code == 401
 