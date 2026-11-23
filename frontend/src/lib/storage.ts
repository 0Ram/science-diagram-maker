import { ReviewRecord, ReviewDecision } from '../types';

const STORAGE_KEY = 'science-diagram-reviews';

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
