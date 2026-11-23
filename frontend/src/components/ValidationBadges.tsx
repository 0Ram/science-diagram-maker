import React, { useState } from 'react';
import { Check, X, Info } from 'lucide-react';
import { CheckItem } from '../types';

interface Props {
  checks: Record<string, CheckItem>;
}

const CHECK_TITLES: Record<string, string> = {
  valid_svg: 'XML Parse',
  viewbox_bounds: 'ViewBox Bounds',
  title_and_labels: 'Title & Labels',
  animation: 'Animation',
  scientific_content: 'Science Content'
};

export const ValidationBadges: React.FC<Props> = ({ checks }) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const checkKeys = [
    'valid_svg',
    'viewbox_bounds',
    'title_and_labels',
    'animation',
    'scientific_content'
  ];

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {checkKeys.map((key) => {
        const item = checks[key] || { passed: false, message: 'Check pending' };
        const isPassed = item.passed;
        const displayName = CHECK_TITLES[key] || key;

        return (
          <div key={key} className="relative inline-block">
            <button
              type="button"
              onMouseEnter={() => setActiveTooltip(key)}
              onMouseLeave={() => setActiveTooltip(null)}
              onClick={() => setActiveTooltip(activeTooltip === key ? null : key)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                isPassed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
              }`}
            >
              {isPassed ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <X className="w-3 h-3 text-red-600" />
              )}
              <span>{displayName}</span>
            </button>

            {/* Hover Tooltip */}
            {activeTooltip === key && (
              <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none transition-all">
                <div className="font-semibold text-slate-200 flex items-center justify-between pb-1 border-b border-slate-700 mb-1.5">
                  <span>{displayName}</span>
                  <span className={isPassed ? 'text-emerald-400' : 'text-red-400'}>
                    {isPassed ? 'Passed' : 'Failed'}
                  </span>
                </div>
                <p className="text-slate-300 leading-snug">{item.message}</p>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
