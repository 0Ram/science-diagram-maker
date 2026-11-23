"""
Token Usage & Cost Calculator for Science Diagram Maker.
Calculates estimated USD costs based on configurable model pricing tiers,
distinguishing free-tier equivalent costs from billed charges.
"""

import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


def get_pricing_config() -> Dict[str, float]:
    """Retrieves token pricing per million from environment with verified defaults."""
    input_price = float(os.getenv("INPUT_PRICE_PER_MILLION", "0.075"))
    output_price = float(os.getenv("OUTPUT_PRICE_PER_MILLION", "0.300"))
    return {
        "input_price_per_million": input_price,
        "output_price_per_million": output_price
    }


def calculate_cost(
    prompt_tokens: Optional[int],
    completion_tokens: Optional[int],
    is_free_tier: bool = True
) -> Dict[str, Any]:
    """
    Calculates estimated USD cost from token counts.
    Returns:
    {
        "estimated_cost_usd": float,
        "actual_cost_usd": float,
        "formatted_cost": str,
        "pricing_tier": str
    }
    """
    if prompt_tokens is None or completion_tokens is None:
        return {
            "estimated_cost_usd": 0.0,
            "actual_cost_usd": 0.0,
            "formatted_cost": "$0.000000",
            "pricing_tier": "unavailable"
        }

    pricing = get_pricing_config()
    in_cost = (prompt_tokens / 1_000_000.0) * pricing["input_price_per_million"]
    out_cost = (completion_tokens / 1_000_000.0) * pricing["output_price_per_million"]
    estimated_total = in_cost + out_cost

    actual_total = 0.0 if is_free_tier else estimated_total

    return {
        "estimated_cost_usd": round(estimated_total, 6),
        "actual_cost_usd": round(actual_total, 6),
        "formatted_cost": f"${estimated_total:.6f}",
        "pricing_tier": "free_tier_equivalent" if is_free_tier else "paid_commercial"
    }
