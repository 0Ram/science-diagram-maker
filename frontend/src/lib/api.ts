import { Dataset, ConceptResult } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchInitialDataset(): Promise<Dataset> {
  // Always prioritize loading the bundled results.json to guarantee instant zero-API first load
  try {
    const res = await fetch('/data/results.json', { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not load static /data/results.json, falling back to API:', err);
  }

  // Fallback to backend API if available
  const apiRes = await fetch(`${API_BASE_URL}/api/results`);
  if (!apiRes.ok) {
    throw new Error('Failed to load initial diagram dataset');
  }
  return await apiRes.json();
}

export async function generateConceptLive(
  conceptId: string
): Promise<{ success: boolean; result?: ConceptResult; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ concept_id: conceptId }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData.detail || errData.error || `Server returned error status ${res.status}`
      };
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: `Network error connecting to backend (${API_BASE_URL}). Make sure the backend server is running.`
    };
  }
}
