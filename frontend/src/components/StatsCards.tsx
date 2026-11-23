import React from 'react';
import { Layers, CheckCircle2, DollarSign, ThumbsUp } from 'lucide-react';
import { ConceptResult } from '../types';

interface Props {
  results: ConceptResult[];
}

export const StatsCards: React.FC<Props> = ({ results }) => {
  const total = results.length;
  const passedCount = results.filter((r) => r.validation_status === 'passed').length;
  const totalCost = results.reduce((acc, r) => acc + (r.usage?.estimated_cost_usd || 0), 0);
  const totalTokens = results.reduce((acc, r) => acc + (r.usage?.total_tokens || 0), 0);

  const approvedCount = results.filter((r) => r.review_status === 'approved').length;
  const rejectedCount = results.filter((r) => r.review_status === 'rejected').length;
  const pendingCount = results.filter((r) => r.review_status === 'pending').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* 1. Total Concepts */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Concepts
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{total} Diagrams</h3>
          <p className="text-xs text-slate-500">GCSE UK Curriculum</p>
        </div>
      </div>

      {/* 2. Automated Checks */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Code Verification
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
            {passedCount} / {total} Passed
          </h3>
          <p className="text-xs text-emerald-600 font-medium">5 Independent Checks</p>
        </div>
      </div>

      {/* 3. API Economics */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
          <DollarSign className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Estimated Cost
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
            ${totalCost.toFixed(5)}
          </h3>
          <p className="text-xs text-slate-500">{totalTokens.toLocaleString()} tokens used</p>
        </div>
      </div>

      {/* 4. Review Decisions */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
          <ThumbsUp className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Review Status
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
            {approvedCount} <span className="text-emerald-600 text-lg">Appr</span> /{' '}
            {rejectedCount} <span className="text-red-500 text-lg">Rej</span>
          </h3>
          <p className="text-xs text-slate-500">{pendingCount} pending reviewer action</p>
        </div>
      </div>
    </div>
  );
};
