import React from 'react';
import { Maximize2, Download } from 'lucide-react';
import { downloadAnimatedSvg } from '../lib/svgHelper';

interface Props {
  svgContent: string;
  title: string;
  onExpand: () => void;
}

export const DiagramPreview: React.FC<Props> = ({ svgContent, title, onExpand }) => {
  return (
    <div className="relative group bg-slate-50 border border-slate-200 rounded-lg overflow-hidden w-64 h-40 flex items-center justify-center shrink-0">
      {/* SVG Container */}
      <div
        className="w-full h-full p-2 flex items-center justify-center select-none"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {/* Hover Overlay with Action Buttons */}
      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
        <button
          onClick={onExpand}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-slate-800 rounded-md text-xs font-semibold shadow-md hover:bg-slate-100 transition-transform active:scale-95 cursor-pointer"
          title="Inspect full-size diagram and view source"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Inspect
        </button>

        <button
          onClick={() => downloadAnimatedSvg(svgContent, title)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold shadow-md hover:bg-indigo-700 transition-transform active:scale-95 cursor-pointer"
          title="Download standalone animated SVG (preserves CSS & SMIL animations)"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      </div>
    </div>
  );
};
