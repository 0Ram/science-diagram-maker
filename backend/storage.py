"""
Storage and Synchronization Manager for Science Diagram Maker.
Maintains backend/data/results.json as the authoritative master copy
and synchronizes it to frontend/public/data/results.json.
"""

import os
import json
import shutil
from pathlib import Path
from typing import Optional, Dict, Any

from backend.schemas import Dataset

MASTER_DATA_DIR = Path(__file__).parent / "data"
MASTER_RESULTS_FILE = MASTER_DATA_DIR / "results.json"
FRONTEND_PUBLIC_DIR = Path(__file__).parent.parent / "frontend" / "public" / "data"
FRONTEND_RESULTS_FILE = FRONTEND_PUBLIC_DIR / "results.json"


def ensure_directories():
    MASTER_DATA_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)


def load_master_results() -> Optional[Dict[str, Any]]:
    """Loads results from the backend master file."""
    if not MASTER_RESULTS_FILE.exists():
        return None
    try:
        with open(MASTER_RESULTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading master results: {e}")
        return None


def save_master_results(data: Dict[str, Any]) -> bool:
    """Saves results dictionary to the master file and syncs to frontend."""
    ensure_directories()
    try:
        with open(MASTER_RESULTS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        sync_to_frontend()
        return True
    except Exception as e:
        print(f"Error saving master results: {e}")
        return False


def sync_to_frontend() -> bool:
    """Copies master results.json to frontend/public/data/results.json."""
    ensure_directories()
    if not MASTER_RESULTS_FILE.exists():
        return False
    try:
        shutil.copyfile(MASTER_RESULTS_FILE, FRONTEND_RESULTS_FILE)
        return True
    except Exception as e:
        print(f"Error synchronizing results to frontend: {e}")
        return False
