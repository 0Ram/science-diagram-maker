"""Unit tests for backend.retry module with mocked API interactions."""

import pytest
from unittest.mock import patch, MagicMock
from backend.retry import generate_and_validate_concept, execute_api_call_with_backoff


def test_api_backoff_on_429():
    # Simulate first call 429, second call success
    responses = [
        {"success": False, "error": "429 ResourceExhausted: rate limit exceeded"},
        {
            "success": True,
            "svg": "<svg viewBox='0 0 800 500'><title>Test</title></svg>",
            "sanitized_svg": "<svg viewBox='0 0 800 500'><title>Test</title></svg>",
            "sanitization_warnings": [],
            "model": "gemini-2.5-flash",
            "usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150},
            "error": None
        }
    ]

    with patch("backend.retry.generate_diagram_raw", side_effect=responses), \
         patch("time.sleep", return_value=None):
        res, api_retries = execute_api_call_with_backoff("pythagoras", max_retries=2, backoff_factor=1.0)
        assert res["success"] is True
        assert api_retries == 1


def test_validation_retry_triggers_on_failed_first_attempt():
    # Attempt 1: SVG with no title/labels (fails validation)
    failed_svg = "<svg viewBox='0 0 800 500'><circle cx='100' cy='100' r='20'/></svg>"
    # Attempt 2: Valid SVG
    valid_svg = """
    <svg viewBox="0 0 800 500">
        <title>Pythagoras Theorem</title>
        <polygon points="200,350 450,350 200,150" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
        <text x="210" y="260">Side a</text>
        <text x="320" y="370">Side b</text>
        <text x="340" y="230">Hypotenuse c</text>
        <text x="250" y="420">Formula: a² + b² = c²</text>
        <animate attributeName="opacity" from="0.8" to="1" dur="1s"/>
    </svg>
    """

    responses = [
        # Call 1
        (
            {
                "success": True,
                "svg": failed_svg,
                "sanitized_svg": failed_svg,
                "sanitization_warnings": [],
                "model": "gemini-2.5-flash",
                "usage": {"prompt_tokens": 200, "completion_tokens": 100, "total_tokens": 300},
                "error": None
            },
            0
        ),
        # Call 2 (correction retry)
        (
            {
                "success": True,
                "svg": valid_svg,
                "sanitized_svg": valid_svg,
                "sanitization_warnings": [],
                "model": "gemini-2.5-flash",
                "usage": {"prompt_tokens": 300, "completion_tokens": 150, "total_tokens": 450},
                "error": None
            },
            0
        )
    ]

    with patch("backend.retry.execute_api_call_with_backoff", side_effect=responses):
        result = generate_and_validate_concept("pythagoras")
        assert result.retries.validation == 1
        assert result.retries.total_attempts == 2
        assert result.validation_status == "passed"
        assert result.usage.input_tokens == 500  # 200 + 300 aggregated
        assert result.usage.output_tokens == 250  # 100 + 150 aggregated
