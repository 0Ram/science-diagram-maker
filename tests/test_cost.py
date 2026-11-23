"""Unit tests for backend.cost_calculator module."""

import pytest
from backend.cost_calculator import calculate_cost, get_pricing_config


def test_calculate_cost_standard():
    # 1,000,000 input tokens at $0.075 + 1,000,000 output tokens at $0.300 = $0.375
    cost = calculate_cost(1_000_000, 1_000_000, is_free_tier=False)
    assert cost["estimated_cost_usd"] == pytest.approx(0.375, rel=1e-3)
    assert cost["actual_cost_usd"] == pytest.approx(0.375, rel=1e-3)


def test_calculate_cost_free_tier():
    # On free tier, estimated_cost_usd > 0, but actual_cost_usd == 0
    cost = calculate_cost(5000, 2000, is_free_tier=True)
    assert cost["estimated_cost_usd"] > 0
    assert cost["actual_cost_usd"] == 0.0
    assert cost["pricing_tier"] == "free_tier_equivalent"


def test_calculate_cost_null_tokens():
    cost = calculate_cost(None, None)
    assert cost["estimated_cost_usd"] == 0.0
    assert cost["actual_cost_usd"] == 0.0
    assert cost["pricing_tier"] == "unavailable"
