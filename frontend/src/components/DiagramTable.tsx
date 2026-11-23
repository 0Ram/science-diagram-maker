import React from 'react';
import { ThumbsUp, ThumbsDown, Clock, CheckCircle2, XCircle, Download, RefreshCw } from 'lucide-react';
import { ConceptResult, ReviewDecision } from '../types';
import { DiagramPreview } from './DiagramPreview';
import { ValidationBadges } from './ValidationBadges';
import { downloadAnimatedSvg } from '../lib/svgHelper';

interface Props {
  results: ConceptResult[];
  onReview: (conceptId: string, decision: ReviewDecision, note: string) => void;
  onInspect: (result: ConceptResult) => void;
  onReverify?: (conceptId: string) => void;
}

export const DiagramTable: React.FC<Props> = ({ results, onReview, onInspect, onReverify }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Curriculum Science Concepts</h2>
          <p className="text-xs text-slate-500">
            Automated quality checks & expert reviewer workflow (decisions persist across page refreshes)
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
          {results.length} Concepts
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-6 py-3.5">
                Concept & Subject
              </th>
              <th scope="col" className="px-6 py-3.5">
                Animated Diagram
              </th>
              <th scope="col" className="px-6 py-3.5">
                Automated Checks
              </th>
              <th scope="col" className="px-6 py-3.5">
                Cost & Retries
              </th>
              <th scope="col" className="px-6 py-3.5 w-72">
                Review Decision & Note
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {results.map((r) => {
              const subjectColor =
                r.subject === 'Maths'
                  ? 'bg-blue-100 text-blue-800'
                  : r.subject === 'Physics'
                  ? 'bg-purple-100 text-purple-800'
                  : r.subject === 'Biology'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800';

              const isApproved = r.review_status === 'approved';
              const isRejected = r.review_status === 'rejected';

              return (
                <tr key={r.id} className="hover:bg-slate-50/75 transition-colors">
                  {/* Column 1: Concept & Subject */}
                  <td className="px-6 py-4 align-top">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-1 ${subjectColor}`}>
                      {r.subject}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">{r.concept}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">ID: {r.id}</p>
                    <div className="mt-2 text-xs flex flex-col items-start gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          r.validation_status === 'passed' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {r.validation_status === 'passed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        Verification: {r.validation_status.toUpperCase()}
                      </span>

                      {r.validation_status !== 'passed' && (
                        <button
                          type="button"
                          onClick={() => onReverify?.(r.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                          title="Re-run verification with updated geometric and scientific engine"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Re-verify & Fix
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Column 2: Animated Diagram Preview */}
                  <td className="px-6 py-4 align-top">
                    <DiagramPreview
                      svgContent={r.svg}
                      title={r.concept}
                      onExpand={() => onInspect(r)}
                    />
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => downloadAnimatedSvg(r.svg, r.concept)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-medium border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer"
                        title="Download standalone animated SVG (preserves all CSS and SMIL animations)"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        Download Animated SVG
                      </button>
                    </div>
                  </td>

                  {/* Column 3: Automated Checks */}
                  <td className="px-6 py-4 align-top max-w-xs">
                    <div className="mb-2">
                      <ValidationBadges checks={r.checks} />
                    </div>
                    <p className="text-xs text-slate-500 leading-snug">
                      Hover badges for check messages. Validated via geometric & scientific parser.
                    </p>
                  </td>

                  {/* Column 4: Cost & Retries */}
                  <td className="px-6 py-4 align-top whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900">
                      ${r.usage.estimated_cost_usd.toFixed(6)}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {r.usage.total_tokens.toLocaleString()} tokens
                    </div>
                    <div className="text-xs text-slate-400">
                      ({r.usage.input_tokens} in / {r.usage.output_tokens} out)
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Retries:{' '}
                        <strong className="text-slate-900">
                          {r.retries.validation} val
                        </strong>
                        , {r.retries.api} api
                      </span>
                    </div>
                  </td>

                  {/* Column 5: Review Decision & Note */}
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-2.5">
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onReview(r.id, 'approved', r.review_note)}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                            isApproved
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() => onReview(r.id, 'rejected', r.review_note)}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                            isRejected
                              ? 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-300'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>

                      {/* Current Status Badge */}
                      <div className="text-xs flex items-center justify-between">
                        <span className="text-slate-500">Status:</span>
                        <span
                          className={`font-semibold capitalize px-2 py-0.5 rounded text-xs ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRejected
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r.review_status}
                        </span>
                      </div>

                      {/* Note Box */}
                      <div>
                        <textarea
                          rows={2}
                          value={r.review_note || ''}
                          placeholder="Add reviewer notes..."
                          onChange={(e) => onReview(r.id, r.review_status, e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white placeholder-slate-400"
                        />
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Saved in localStorage automatically
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
