


async def test_register_new_user(client):
    r = await client.post("/auth/register",json={"email": "a@test.com", "password": "password123", "name": "Seller1"})

    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "a@test.com"
    assert body["name"] == "Seller1"
    assert body["is_seller"] is False
    assert float(body["balance"]) == 0
    assert "password" not in body
    assert "hashed_password" not in body

async def test_register_as_seller(client):
    r = await client.post("/auth/register",json={"email": "s@test.com", "password": "password123", "is_seller": True})

    assert r.status_code == 201
    assert r.json()["is_seller"] is True

async def test_cannot_register_as_superuser(client):
    r = await client.post(
        "/auth/register",
        json={"email": "hacker@test.com", "password": "password123", "is_superuser": True},
    )
    assert r.status_code == 201
    assert r.json()["is_superuser"] is False
 
 
async def test_register_same_email_twice_fails(client):
    data = {"email": "dup@test.com", "password": "password123"}
    assert (await client.post("/auth/register", json=data)).status_code == 201
    r = await client.post("/auth/register", json=data)
    assert r.status_code == 400
    assert r.json()["detail"] == "REGISTER_USER_ALREADY_EXISTS"
 
 
async def test_register_with_bad_email_fails(client):
    r = await client.post("/auth/register", json={"email": "not-an-email", "password": "password123"})
    assert r.status_code == 422
 
 
async def test_login_with_wrong_password_fails(client):
    await client.post("/auth/register", json={"email": "a@test.com", "password": "password123"})
    r = await client.post("/auth/jwt/login", data={"username": "a@test.com", "password": "wrong"})
    assert r.status_code == 400
    assert r.json()["detail"] == "LOGIN_BAD_CREDENTIALS"
 
 
async def test_me_needs_login(client):
    r = await client.get("/users/me")
    assert r.status_code == 401
 
 
async def test_me_returns_logged_in_user(client, buyer):
    r = await client.get("/users/me", headers=buyer)
    assert r.status_code == 200
    assert r.json()["email"] == "buyer@test.com"
 
 
async def test_user_cannot_change_own_balance(client, buyer):
    r = await client.patch("/users/me", json={"balance": "999999"}, headers=buyer)
    assert r.status_code == 200
    me = (await client.get("/users/me", headers=buyer)).json()
    assert float(me["balance"]) == 0