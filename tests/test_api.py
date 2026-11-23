"""Unit tests for FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model" in data
    assert len(data["supported_concepts"]) >= 5


def test_get_master_results():
    response = client.get("/api/results")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 5
    first = data["results"][0]
    assert "id" in first
    assert "svg" in first
    assert "checks" in first


def test_get_single_concept():
    response = client.get("/api/results/pythagoras")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "pythagoras"
    assert "Pythagoras" in data["concept"]


def test_generate_endpoint_without_key_returns_friendly_error(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = client.post("/api/generate", json={"concept_id": "circle"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "GEMINI_API_KEY" in data["error"] or "error" in data
