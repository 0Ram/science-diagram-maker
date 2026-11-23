"""
Retry Engine for Science Diagram Maker.
Maintains two completely independent retry loops:
1. API Error Retries: Exponential backoff (2s, 4s, 8s up to 3 retries) on 429 and 503.
2. Validation Retries: Exactly 1 retry providing structured feedback on failed checks.
"""

import time
import logging
from typing import Dict, Any, Optional, Tuple, Callable
from google import genai
from google.genai.errors import APIError

from backend.prompts import CONCEPTS
from backend.generator import generate_diagram_raw, get_configured_model
from backend.validator import validate_svg, ValidationResult
from backend.cost_calculator import calculate_cost, get_pricing_config
from backend.schemas import ConceptResult, UsageMetadata, RetryMetrics, CheckItem

logger = logging.getLogger(__name__)


def execute_api_call_with_backoff(
    concept_id: str,
    feedback: Optional[str] = None,
    client: Optional[genai.Client] = None,
    max_retries: int = 3,
    backoff_factor: float = 2.0
) -> Tuple[Dict[str, Any], int]:
    """
    Executes a Gemini API call, retrying on 429 (Rate Limit) and 503 (Overloaded)
    up to max_retries times using exponential backoff (2s, 4s, 8s).
    Returns (raw_response_dict, api_retries_count).
    """
    attempt = 0
    api_retries = 0

    while True:
        res = generate_diagram_raw(concept_id, feedback=feedback, client=client)
        if res["success"]:
            return res, api_retries

        err_msg = res.get("error", "")
        # Check if error is transient rate limit (429) or service overload (503)
        is_transient = any(code in err_msg for code in ["429", "503", "ResourceExhausted", "UNAVAILABLE"])
        
        if is_transient and attempt < max_retries:
            attempt += 1
            api_retries += 1
            wait_time = backoff_factor ** attempt  # 2s, 4s, 8s
            logger.warning(
                f"Transient Gemini API error ({err_msg}). Retrying in {wait_time:.1f}s (Attempt {attempt}/{max_retries})..."
            )
            time.sleep(wait_time)
            continue

        # Permanent error or exceeded max retries
        return res, api_retries


def generate_and_validate_concept(
    concept_id: str,
    client: Optional[genai.Client] = None
) -> ConceptResult:
    """
    Orchestrates generation, 5-check validation, and self-correction retry.
    Guarantees:
    - At most 2 generation attempts (1 initial + 1 validation retry if needed).
    - API retries are logged independently.
    - Full token usage and USD cost are aggregated.
    """
    concept_info = CONCEPTS.get(concept_id, {
        "title": concept_id,
        "subject": "Science"
    })
    model_name = get_configured_model()

    total_prompt_tokens = 0
    total_completion_tokens = 0
    total_api_retries = 0
    validation_retries = 0
    total_attempts = 1

    # ----------------------------------------------------
    # ATTEMPT 1: Initial Generation
    # ----------------------------------------------------
    gen_res, api_retries_1 = execute_api_call_with_backoff(concept_id, feedback=None, client=client)
    total_api_retries += api_retries_1

    if not gen_res["success"]:
        return ConceptResult(
            id=concept_id,
            concept=concept_info["title"],
            subject=concept_info["subject"],
            svg="",
            model=model_name,
            usage=UsageMetadata(),
            retries=RetryMetrics(validation=0, api=total_api_retries, total_attempts=1),
            checks={},
            generation_status="failed",
            validation_status="failed",
            error=gen_res["error"]
        )

    p_tokens = gen_res["usage"]["prompt_tokens"] or 0
    c_tokens = gen_res["usage"]["completion_tokens"] or 0
    total_prompt_tokens += p_tokens
    total_completion_tokens += c_tokens

    current_svg = gen_res["sanitized_svg"]
    val_result = validate_svg(current_svg, concept_id)

    # ----------------------------------------------------
    # ATTEMPT 2: Validation Self-Correction Retry (If Failed)
    # ----------------------------------------------------
    if not val_result.all_passed:
        validation_retries = 1
        total_attempts = 2
        feedback_str = "\n".join([f"- {r}" for r in val_result.failure_reasons])
        logger.info(f"Validation failed on attempt 1 for '{concept_id}'. Triggering self-correction retry with feedback:\n{feedback_str}")

        gen_res_2, api_retries_2 = execute_api_call_with_backoff(
            concept_id, feedback=feedback_str, client=client
        )
        total_api_retries += api_retries_2

        if gen_res_2["success"]:
            p_tokens_2 = gen_res_2["usage"]["prompt_tokens"] or 0
            c_tokens_2 = gen_res_2["usage"]["completion_tokens"] or 0
            total_prompt_tokens += p_tokens_2
            total_completion_tokens += c_tokens_2

            # Use corrected SVG and re-validate
            current_svg = gen_res_2["sanitized_svg"]
            val_result = validate_svg(current_svg, concept_id)

    # Calculate overall USD cost
    cost_info = calculate_cost(total_prompt_tokens, total_completion_tokens, is_free_tier=True)

    # Map check results to Pydantic models
    checks_dict = {
        k: CheckItem(passed=v["passed"], message=v["message"], details=v.get("details", {}))
        for k, v in val_result.checks.items()
    }

    return ConceptResult(
        id=concept_id,
        concept=concept_info["title"],
        subject=concept_info["subject"],
        svg=current_svg,
        model=model_name,
        usage=UsageMetadata(
            input_tokens=total_prompt_tokens,
            output_tokens=total_completion_tokens,
            total_tokens=total_prompt_tokens + total_completion_tokens,
            estimated_cost_usd=cost_info["estimated_cost_usd"],
            actual_cost_usd=cost_info["actual_cost_usd"],
            pricing_tier=cost_info["pricing_tier"]
        ),
        retries=RetryMetrics(
            validation=validation_retries,
            api=total_api_retries,
            total_attempts=total_attempts
        ),
        checks=checks_dict,
        generation_status="completed",
        validation_status="passed" if val_result.all_passed else "failed",
        review_status="pending",
        review_note="",
        error=None
    )
