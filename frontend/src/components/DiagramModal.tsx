import React, { useState } from 'react';
import { X, Copy, Check, Code, Eye, Download } from 'lucide-react';
import { ConceptResult } from '../types';
import { ValidationBadges } from './ValidationBadges';
import { downloadAnimatedSvg } from '../lib/svgHelper';

interface Props {
  result: ConceptResult | null;
  onClose: () => void;
}

export const DiagramModal: React.FC<Props> = ({ result, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'preview' | 'code'>('preview');

  if (!result) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                {result.subject}
              </span>
              <h2 className="text-xl font-bold text-slate-900">{result.concept}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Model: {result.model} • Cost: ${result.usage.estimated_cost_usd.toFixed(6)} • Retries: {result.retries.validation} val, {result.retries.api} api
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setTab('preview')}
                className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  tab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </button>
              <button
                onClick={() => setTab('code')}
                className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  tab === 'code' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                SVG Source
              </button>
            </div>

            <button
              onClick={() => downloadAnimatedSvg(result.svg, result.concept)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Download standalone animated SVG (preserves all CSS and SMIL animations)"
            >
              <Download className="w-3.5 h-3.5" />
              Download Animated SVG
            </button>

            <button
              onClick={handleCopy}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Copy SVG"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 flex items-center justify-center">
          {tab === 'preview' ? (
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-inner border border-slate-200 p-4 aspect-[8/5] flex items-center justify-center">
              <div
                className="w-full h-full flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: result.svg }}
              />
            </div>
          ) : (
            <pre className="w-full max-w-4xl bg-slate-900 text-slate-100 p-5 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px]">
              <code>{result.svg}</code>
            </pre>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Code Verification:</span>
            <ValidationBadges checks={result.checks} />
          </div>
          <div className="text-slate-500">
            Tokens: {result.usage.input_tokens} in / {result.usage.output_tokens} out ({result.usage.total_tokens} total)
          </div>
        </div>
      </div>
    </div>
  );
};
