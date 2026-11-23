import React, { useState } from 'react';
import { Sparkles, X, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { generateConceptLive } from '../lib/api';
import { ConceptResult } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newResult: ConceptResult) => void;
}

const CONCEPTS = [
  { id: 'pythagoras', title: "Pythagoras' theorem (Maths)" },
  { id: 'circle', title: 'Parts of a circle (Maths)' },
  { id: 'circuit', title: 'Series circuit (Physics)' },
  { id: 'photosynthesis', title: 'Photosynthesis (Biology)' },
  { id: 'matter', title: 'States of matter (Chemistry)' },
];

export const GenerateDialog: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedConcept, setSelectedConcept] = useState('pythagoras');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCurrentStep(1); // Calling Gemini

    const stepTimer1 = setTimeout(() => setCurrentStep(2), 2000); // Running validation
    const stepTimer2 = setTimeout(() => setCurrentStep(3), 3500); // Self-correcting / finalizing

    try {
      const response = await generateConceptLive(selectedConcept);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!response.success || !response.result) {
        setError(
          response.error ||
            'Gemini API is temporarily unavailable or returned an error. Your existing diagrams remain safe.'
        );
        setLoading(false);
        setCurrentStep(0);
        return;
      }

      setCurrentStep(4);
      setTimeout(() => {
        onSuccess(response.result!);
        setLoading(false);
        setCurrentStep(0);
        onClose();
      }, 1000);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setError(
        err.message || 'An unexpected network error occurred while contacting the diagram generator backend.'
      );
      setLoading(false);
      setCurrentStep(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Live Diagram Generation</h3>
              <p className="text-xs text-slate-500">Test AI generation & 5-check validation in real-time</p>
            </div>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Science Concept to Generate
            </label>
            <select
              value={selectedConcept}
              disabled={loading}
              onChange={(e) => setSelectedConcept(e.target.value)}
              className="w-full text-sm font-medium px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {CONCEPTS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Live Generation Alert</p>
                <p className="mt-1 leading-relaxed">{error}</p>
                <p className="mt-2 text-red-700 font-medium">
                  Note: Pre-generated diagrams in your results.json are always preserved and active.
                </p>
              </div>
            </div>
          )}

          {/* Loading Progress State */}
          {loading && (
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-indigo-900">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Running generation pipeline...</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 pl-6 list-disc">
                <li className={currentStep >= 1 ? 'text-indigo-700 font-medium' : ''}>
                  Sending concept prompt to Gemini
                </li>
                <li className={currentStep >= 2 ? 'text-indigo-700 font-medium' : ''}>
                  Sanitizing SVG and running 5 automated checks
                </li>
                <li className={currentStep >= 3 ? 'text-indigo-700 font-medium' : ''}>
                  Automated feedback retry loop if any check fails
                </li>
                <li className={currentStep >= 4 ? 'text-emerald-700 font-bold' : ''}>
                  Finalizing metrics and updating dashboard
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Concept
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
