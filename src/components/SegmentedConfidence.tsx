import React from 'react';
import { ConfidenceLevel } from '../../shared/types.js';

interface SegmentedConfidenceProps {
  confidence?: ConfidenceLevel | string;
  score?: number;
  totalBlocks?: number;
  showLabel?: boolean;
}

export const SegmentedConfidence: React.FC<SegmentedConfidenceProps> = ({
  confidence = 'High',
  score,
  totalBlocks = 5,
  showLabel = true,
}) => {
  // Determine filled count (1-5)
  let filled = 4;
  if (score !== undefined) {
    filled = Math.max(1, Math.min(totalBlocks, Math.round((score / 100) * totalBlocks)));
  } else if (confidence === 'High') {
    filled = 4;
  } else if (confidence === 'Medium') {
    filled = 3;
  } else {
    filled = 2;
  }

  return (
    <div className="inline-flex items-center gap-2 font-mono text-xs text-ink">
      <div className="flex items-center gap-1">
        {Array.from({ length: totalBlocks }).map((_, idx) => {
          const isFilled = idx < filled;
          return (
            <div
              key={idx}
              className={`w-2.5 h-3.5 rounded-[2px] transition-colors ${
                isFilled ? 'bg-[#3654FF]' : 'bg-[#E4E7EC]'
              }`}
            />
          );
        })}
      </div>
      {showLabel && (
        <span className="text-[11px] font-mono text-slate-600">
          {score !== undefined ? `${score}% match` : `${confidence} confidence`}
        </span>
      )}
    </div>
  );
};
