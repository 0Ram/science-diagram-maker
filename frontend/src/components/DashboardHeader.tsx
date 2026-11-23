import React from 'react';
import { Sparkles, Activity, ShieldCheck } from 'lucide-react';

interface Props {
  modelName: string;
  onOpenGenerate: () => void;
}

export const DashboardHeader: React.FC<Props> = ({ modelName, onOpenGenerate }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Udhi Technologies
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Model: {modelName}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              GCSE Science Diagram Maker
            </h1>
            <p className="text-sm text-slate-600">
              AI-generated animated science illustrations with 5-stage automated code validation & reviewer approval
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenGenerate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate Live Diagram
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
