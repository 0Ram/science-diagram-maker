import { ReviewRecord, ReviewDecision, ConceptResult } from '../types';

const STORAGE_KEY = 'science-diagram-reviews';
const CUSTOM_HISTORY_KEY = 'science-diagram-custom-history';

export function loadSavedReviews(): Record<string, ReviewRecord> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load reviews from localStorage:', err);
    return {};
  }
}

export function saveReviewDecision(
  conceptId: string,
  decision: ReviewDecision,
  note: string
): Record<string, ReviewRecord> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const current = loadSavedReviews();
    current[conceptId] = {
      decision,
      note,
      reviewed_at: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return current;
  } catch (err) {
    console.error('Failed to save review to localStorage:', err);
    return loadSavedReviews();
  }
}

/**
 * Loads any custom or newly generated diagrams saved in the user's browser history.
 */
export function loadSavedCustomHistory(): ConceptResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load custom diagram history from localStorage:', err);
    return [];
  }
}

/**
 * Persists a newly generated diagram to the user's browser history across page refreshes.
 */
export function saveCustomDiagramToHistory(newResult: ConceptResult): ConceptResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = loadSavedCustomHistory();
    const existingIndex = current.findIndex((c) => c.id === newResult.id);
    let updated: ConceptResult[] = [];
    if (existingIndex !== -1) {
      updated = [...current];
      updated[existingIndex] = newResult;
    } else {
      updated = [newResult, ...current];
    }
    localStorage.setItem(CUSTOM_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save custom diagram history to localStorage:', err);
    return [];
  }
}

