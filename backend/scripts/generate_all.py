"""
Batch Generator CLI for Science Diagram Maker.
Generates animated SVG diagrams for all 5 GCSE science concepts,
runs 5 automated validation checks, performs self-correction if needed,
calculates token costs, and saves master results.json.
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

# Ensure root directory is in python path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.prompts import CONCEPTS
from backend.generator import get_configured_model
from backend.cost_calculator import get_pricing_config
from backend.retry import generate_and_validate_concept
from backend.storage import save_master_results, sync_to_frontend
from backend.schemas import Dataset, ConceptResult

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def run_batch_generation():
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    model = get_configured_model()
    pricing = get_pricing_config()

    if not api_key or api_key == "your_gemini_api_key_here":
        logger.error(
            "GEMINI_API_KEY is not set. Please set your key in .env or environment variable."
        )
        sys.exit(1)

    logger.info(f"Starting Science Diagram Maker batch generation...")
    logger.info(f"Model: {model}")
    logger.info(f"Input Price: ${pricing['input_price_per_million']}/1M, Output Price: ${pricing['output_price_per_million']}/1M")

    concept_ids = ["pythagoras", "circle", "circuit", "photosynthesis", "matter"]
    all_results = []
    total_tokens = 0
    total_estimated_cost = 0.0

    for idx, cid in enumerate(concept_ids, 1):
        concept_title = CONCEPTS[cid]["title"]
        logger.info(f"\n[{idx}/5] Generating & Validating Concept: '{concept_title}' (ID: {cid})...")
        
        try:
            result: ConceptResult = generate_and_validate_concept(cid)
            all_results.append(result)

            status_icon = "✓ PASS" if result.validation_status == "passed" else "✗ FAIL"
            logger.info(f"Outcome: {status_icon}")
            logger.info(f"Retries: Validation={result.retries.validation}, API={result.retries.api}")
            logger.info(f"Tokens: {result.usage.total_tokens} (Input: {result.usage.input_tokens}, Output: {result.usage.output_tokens})")
            logger.info(f"Estimated Cost: ${result.usage.estimated_cost_usd:.6f}")
            
            # Print check summary
            for check_name, check_data in result.checks.items():
                mark = "✓" if check_data.passed else "✗"
                logger.info(f"  {mark} {check_name}: {check_data.message}")

            total_tokens += result.usage.total_tokens or 0
            total_estimated_cost += result.usage.estimated_cost_usd

        except Exception as e:
            logger.error(f"Failed to generate diagram for {cid}: {e}")

    # Build dataset
    dataset_dict = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": model,
        "pricing_assumptions": pricing,
        "total_metrics": {
            "total_diagrams": len(all_results),
            "passed": sum(1 for r in all_results if r.validation_status == "passed"),
            "failed": sum(1 for r in all_results if r.validation_status != "passed"),
            "total_tokens": total_tokens,
            "total_estimated_cost_usd": round(total_estimated_cost, 6),
            "actual_cost_usd": 0.0
        },
        "results": [r.model_dump() for r in all_results]
    }

    # Save to master backend/data/results.json and sync to frontend
    save_master_results(dataset_dict)
    logger.info("\nBatch generation complete!")
    logger.info(f"Saved {len(all_results)} results to backend/data/results.json and synced to frontend/public/data/results.json")
    logger.info(f"Total Tokens: {total_tokens} | Total Estimated Cost: ${total_estimated_cost:.6f}")


if __name__ == "__main__":
    run_batch_generation()
