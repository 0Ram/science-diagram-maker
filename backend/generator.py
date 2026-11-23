"""
Gemini API Generator Client for Science Diagram Maker.
Interacts with Google Gemini models using the official google-genai SDK,
captures precise token usage metadata, and sanitizes output.
"""

import os
from typing import Dict, Any, Optional, Tuple
from dotenv import load_dotenv
from google import genai
from google.genai import types

from backend.prompts import build_prompt, CONCEPTS
from backend.sanitizer import sanitize_svg, extract_svg_code

load_dotenv()


def get_configured_model() -> str:
    """Returns the verified model identifier from environment or default."""
    return os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")


def get_genai_client() -> genai.Client:
    """Initializes and returns a Google GenAI client."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        raise ValueError(
            "GEMINI_API_KEY is not set or contains the default placeholder. "
            "Please set a valid key in your environment or .env file."
        )
    return genai.Client(api_key=api_key)


def generate_diagram_raw(
    concept_id: str,
    feedback: Optional[str] = None,
    client: Optional[genai.Client] = None,
    model_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes a single generation call to Gemini for a given concept.
    Returns:
    {
        "success": bool,
        "svg": str,
        "sanitized_svg": str,
        "sanitization_warnings": List[str],
        "model": str,
        "usage": {
            "prompt_tokens": int,
            "completion_tokens": int,
            "total_tokens": int
        },
        "error": Optional[str]
    }
    """
    actual_model = model_name or get_configured_model()
    prompt = build_prompt(concept_id, feedback=feedback)

    if client is None:
        client = get_genai_client()

    try:
        response = client.models.generate_content(
            model=actual_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                top_p=0.95,
            )
        )

        raw_text = response.text or ""
        extracted_svg = extract_svg_code(raw_text)
        clean_svg, warnings = sanitize_svg(extracted_svg)

        # Extract actual token counts from response metadata
        usage = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0
        }
        if response.usage_metadata:
            usage["prompt_tokens"] = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
            usage["completion_tokens"] = getattr(response.usage_metadata, "candidates_token_count", 0) or 0
            usage["total_tokens"] = getattr(response.usage_metadata, "total_token_count", 0) or (
                usage["prompt_tokens"] + usage["completion_tokens"]
            )

        return {
            "success": True,
            "svg": extracted_svg,
            "sanitized_svg": clean_svg,
            "sanitization_warnings": warnings,
            "model": actual_model,
            "usage": usage,
            "error": None
        }

    except Exception as e:
        return {
            "success": False,
            "svg": "",
            "sanitized_svg": "",
            "sanitization_warnings": [],
            "model": actual_model,
            "usage": {
                "prompt_tokens": None,
                "completion_tokens": None,
                "total_tokens": None
            },
            "error": str(e)
        }
