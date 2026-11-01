from fastapi.testclient import TestClient
from api.app import app

client = TestClient(app)

def test_health_check():
    r = client.get("/health")
    assert r.status_code == 200