import React, { useState } from 'react';
import { Sparkles, X, AlertCircle, Loader2, BookOpen, PenTool } from 'lucide-react';
import { generateConceptLive } from '../lib/api';
import { ConceptResult } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newResult: ConceptResult) => void;
}

const PREDEFINED_CONCEPTS = [
  { id: 'pythagoras', title: "Pythagoras' theorem (Maths)" },
  { id: 'circle', title: 'Parts of a circle (Maths)' },
  { id: 'circuit', title: 'Series circuit (Physics)' },
  { id: 'photosynthesis', title: 'Photosynthesis (Biology)' },
  { id: 'matter', title: 'States of matter (Chemistry)' },
];

export const GenerateDialog: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'predefined' | 'custom'>('predefined');
  const [selectedConcept, setSelectedConcept] = useState('pythagoras');

  // Custom concept fields
  const [customName, setCustomName] = useState('');
  const [customSubject, setCustomSubject] = useState('Physics');
  const [customDescription, setCustomDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (mode === 'custom' && (!customName.trim() || !customDescription.trim())) {
      setError('Please provide both a concept name and a brief description.');
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentStep(1); // Calling Gemini

    const stepTimer1 = setTimeout(() => setCurrentStep(2), 2000); // Running validation
    const stepTimer2 = setTimeout(() => setCurrentStep(3), 3500); // Self-correcting / finalizing

    try {
      const payload =
        mode === 'predefined'
          ? { conceptId: selectedConcept }
          : {
              conceptId: `custom_${customName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
              isCustom: true,
              customName: customName.trim(),
              customSubject: customSubject.trim(),
              customDescription: customDescription.trim(),
            };

      const response = await generateConceptLive(payload);
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
      }, 800);
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-6 pt-4 pb-0">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              disabled={loading}
              onClick={() => { setMode('predefined'); setError(null); }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'predefined'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Predefined Concept (5)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => { setMode('custom'); setError(null); }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'custom'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Custom Concept (Any Topic)
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {mode === 'predefined' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Select GCSE Science Concept
              </label>
              <select
                value={selectedConcept}
                disabled={loading}
                onChange={(e) => setSelectedConcept(e.target.value)}
                className="w-full text-sm font-medium px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {PREDEFINED_CONCEPTS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1.5">
                Re-generates one of the 5 official curriculum diagrams with live Gemini API calls.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Concept Name
                </label>
                <input
                  type="text"
                  disabled={loading}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Newton's Laws of Motion"
                  className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Subject
                </label>
                <select
                  disabled={loading}
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Maths">Maths</option>
                  <option value="Astronomy">Astronomy</option>
                  <option value="General Science">General Science</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Key Rules for Diagram
                </label>
                <textarea
                  rows={3}
                  disabled={loading}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="e.g. Newton's three laws explain the relationship between force, mass, and acceleration (F = ma) with action and reaction forces."
                  className="w-full text-sm p-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>
          )}

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
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
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
                Generate Diagram
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
