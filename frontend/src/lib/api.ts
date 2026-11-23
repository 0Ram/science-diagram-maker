import { Dataset, ConceptResult } from '../types';

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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/results` : '/data/results.json';
  const apiRes = await fetch(apiUrl);
  if (!apiRes.ok) {
    throw new Error('Failed to load initial diagram dataset');
  }
  return await apiRes.json();
}

export interface GeneratePayload {
  conceptId: string;
  isCustom?: boolean;
  customName?: string;
  customSubject?: string;
  customDescription?: string;
}

export async function generateConceptLive(
  payload: GeneratePayload | string
): Promise<{ success: boolean; result?: ConceptResult; error?: string }> {
  try {
    const body = typeof payload === 'string' ? { concept_id: payload } : {
      concept_id: payload.conceptId,
      is_custom: payload.isCustom,
      custom_name: payload.customName,
      custom_subject: payload.customSubject,
      custom_description: payload.customDescription
    };

    const endpoint = process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/generate`
      : '/api/generate';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: data.detail || data.error || `Server returned error status ${res.status}`
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: `Network error connecting to generator endpoint: ${err.message}. Make sure the server is accessible.`
    };
  }
}
