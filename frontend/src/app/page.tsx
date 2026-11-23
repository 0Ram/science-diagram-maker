'use client';

import React, { useEffect, useState } from 'react';
import { DashboardHeader } from '../components/DashboardHeader';
import { StatsCards } from '../components/StatsCards';
import { DiagramTable } from '../components/DiagramTable';
import { DiagramModal } from '../components/DiagramModal';
import { GenerateDialog } from '../components/GenerateDialog';
import { fetchInitialDataset } from '../lib/api';
import { loadSavedReviews, saveReviewDecision } from '../lib/storage';
import { reverifyAndFixResult } from '../lib/svgHelper';
import { Dataset, ConceptResult, ReviewDecision } from '../types';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inspectingResult, setInspectingResult] = useState<ConceptResult | null>(null);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const data = await fetchInitialDataset();
        const savedReviews = loadSavedReviews();

        // Merge saved reviews from localStorage into the concept results
        // and ensure verification checks reflect the latest geometric & scientific engine
        const mergedResults = data.results.map((r) => {
          let item = r;
          if (item.validation_status !== 'passed') {
            item = reverifyAndFixResult(item);
          }
          const saved = savedReviews[item.id];
          if (saved) {
            return {
              ...item,
              review_status: saved.decision,
              review_note: saved.note,
            };
          }
          return item;
        });

        setDataset({
          ...data,
          results: mergedResults,
        });
      } catch (err: any) {
        console.error('Error loading dataset:', err);
        setError(err.message || 'Failed to load science diagrams dataset');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleReview = (conceptId: string, decision: ReviewDecision, note: string) => {
    // 1. Save to localStorage
    saveReviewDecision(conceptId, decision, note);

    // 2. Update local state
    if (dataset) {
      setDataset({
        ...dataset,
        results: dataset.results.map((r) => {
          if (r.id === conceptId) {
            return {
              ...r,
              review_status: decision,
              review_note: note,
            };
          }
          return r;
        }),
      });
    }
  };

  const handleReverify = (conceptId: string) => {
    if (!dataset) return;
    const updatedResults = dataset.results.map((r) => {
      if (r.id === conceptId) {
        return reverifyAndFixResult(r);
      }
      return r;
    });

    setDataset({
      ...dataset,
      results: updatedResults,
    });
  };

  const handleLiveGenerated = (newResult: ConceptResult) => {
    if (!dataset) return;

    // Ensure generated result is passed through latest layout & verification engine
    const verifiedResult =
      newResult.validation_status !== 'passed'
        ? reverifyAndFixResult(newResult)
        : newResult;

    // Check if concept exists in table; if so update it, otherwise prepend
    const existingIndex = dataset.results.findIndex((r) => r.id === verifiedResult.id);
    let updatedResults = [...dataset.results];

    if (existingIndex !== -1) {
      // Preserve existing review decision if present
      const existing = updatedResults[existingIndex];
      verifiedResult.review_status = existing.review_status;
      verifiedResult.review_note = existing.review_note;
      updatedResults[existingIndex] = verifiedResult;
    } else {
      updatedResults.unshift(verifiedResult);
    }

    setDataset({
      ...dataset,
      results: updatedResults,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <DashboardHeader
        modelName={dataset?.model || 'gemini-2.5-flash'}
        onOpenGenerate={() => setIsGenerateOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-medium">Loading Science Diagrams...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800 max-w-2xl mx-auto my-12 text-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <h3 className="font-bold text-lg text-red-900">Unable to load diagrams</h3>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Page
            </button>
          </div>
        ) : dataset ? (
          <>
            {/* Overview Metric Cards */}
            <StatsCards results={dataset.results} />

            {/* Main Interactive Diagram Review Table */}
            <DiagramTable
              results={dataset.results}
              onReview={handleReview}
              onInspect={(r) => setInspectingResult(r)}
              onReverify={handleReverify}
            />
          </>
        ) : null}
      </main>

      {/* Full-view Diagram Inspection Modal */}
      <DiagramModal
        result={inspectingResult}
        onClose={() => setInspectingResult(null)}
      />

      {/* Live Concept Generator Dialog */}
      <GenerateDialog
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        onSuccess={handleLiveGenerated}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>
            Built for <strong>Udhi Technologies</strong> Home Assignment: AI-Powered Science Diagram Maker.
          </p>
          <p className="mt-1 text-slate-400">
            Automated 5-Stage Code Validation • Free Gemini Flash Model • Reviewer decisions persisted in localStorage
          </p>
        </div>
      </footer>
    </div>
  );
}
