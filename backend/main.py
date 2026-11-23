"""
FastAPI Server for Science Diagram Maker.
Provides endpoints for health check, retrieving master results,
and running live diagram generation with Gemini and automated checks.
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from backend.schemas import Dataset, ConceptResult, GenerateRequest, GenerateResponse
from backend.storage import load_master_results, save_master_results
from backend.retry import generate_and_validate_concept
from backend.generator import get_configured_model
from backend.prompts import CONCEPTS

load_dotenv()

app = FastAPI(
    title="Science Diagram Maker API",
    description="AI-powered GCSE science diagram generator with automated code checks and reviewer persistence",
    version="1.0.0"
)

# Configure CORS for Next.js frontend
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
        frontend_url
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """Health check endpoint providing status and configuration state."""
    api_key_set = bool(os.getenv("GEMINI_API_KEY") and os.getenv("GEMINI_API_KEY") != "your_gemini_api_key_here")
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": get_configured_model(),
        "gemini_api_key_configured": api_key_set,
        "supported_concepts": list(CONCEPTS.keys())
    }


@app.get("/api/results")
def get_all_results():
    """Returns the 5 pre-generated master results without any AI calls."""
    data = load_master_results()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master results not found. Please run batch generation or seed script."
        )
    return data


@app.get("/api/results/{concept_id}")
def get_concept_result(concept_id: str):
    """Retrieves result for a single concept from master storage."""
    data = load_master_results()
    if not data or "results" not in data:
        raise HTTPException(status_code=404, detail="Dataset unavailable")
    
    for r in data["results"]:
        if r["id"] == concept_id:
            return r
    raise HTTPException(status_code=404, detail=f"Concept '{concept_id}' not found")


@app.post("/api/generate", response_model=GenerateResponse)
def generate_concept_live(req: GenerateRequest):
    """
    Live Generation Endpoint:
    Generates a new animated SVG for the requested concept, runs 5 code checks,
    retries once if validation fails, and returns full metrics.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        return GenerateResponse(
            success=False,
            error="GEMINI_API_KEY is not configured on the server. Please set it in backend .env to generate live."
        )

    try:
        result: ConceptResult = generate_and_validate_concept(req.concept_id)
        if result.generation_status == "failed":
            return GenerateResponse(
                success=False,
                error=result.error or "Gemini generation failed. Please try again later."
            )
        return GenerateResponse(
            success=True,
            result=result,
            error=None
        )
    except Exception as e:
        return GenerateResponse(
            success=False,
            error=f"Unexpected server error during diagram generation: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", "8000"))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
