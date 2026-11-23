export interface CheckItem {
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface UsageMetadata {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  actual_cost_usd: number;
  pricing_tier: string;
}

export interface RetryMetrics {
  validation: number;
  api: number;
  total_attempts: number;
}

export type GenerationStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ValidationStatus = 'passed' | 'failed';
export type ReviewDecision = 'pending' | 'approved' | 'rejected';

export interface ConceptResult {
  id: string;
  concept: string;
  subject: string;
  svg: string;
  model: string;
  usage: UsageMetadata;
  retries: RetryMetrics;
  checks: Record<string, CheckItem>;
  generation_status: GenerationStatus;
  validation_status: ValidationStatus;
  review_status: ReviewDecision;
  review_note: string;
  error?: string | null;
}

export interface ReviewRecord {
  decision: ReviewDecision;
  note: string;
  reviewed_at: string;
}

export interface Dataset {
  generated_at: string;
  model: string;
  pricing_assumptions: {
    input_price_per_million: number;
    output_price_per_million: number;
  };
  total_metrics: {
    total_diagrams: number;
    passed: number;
    failed: number;
    total_tokens: number;
    total_estimated_cost_usd: number;
    actual_cost_usd: number;
  };
  results: ConceptResult[];
}
