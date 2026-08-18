import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Play, AlertCircle, Layers } from 'lucide-react';
import { Reel, AIAnalysisResult } from '../../shared/types.js';
import { SegmentedConfidence } from './SegmentedConfidence.js';
import { api } from '../api.js';

interface ReelAnalysisProps {
  initialReelId?: string;
  onBackToDashboard: () => void;
  onWatchInFeed: (reelId: string) => void;
}

const ScoreBar: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color = '#3654FF' }) => (
  <div className="flex items-center gap-2.5">
    <span className="font-mono text-[10px] text-slate-500 w-28 shrink-0">{label}</span>
    <div className="flex-1 h-4 bg-[#F5F7FA] rounded-[3px] overflow-hidden relative">
      <div
        className="h-full rounded-[3px] transition-all duration-700 flex items-center justify-end pr-1.5"
        style={{ width: `${Math.max(5, value)}%`, background: color }}
      >
        <span className="font-mono text-[9px] text-white font-semibold">{value}</span>
      </div>
    </div>
  </div>
);

export const ReelAnalysis: React.FC<ReelAnalysisProps> = ({ initialReelId, onBackToDashboard, onWatchInFeed }) => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [selectedReelId, setSelectedReelId] = useState(initialReelId || '');
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [currentReel, setCurrentReel] = useState<Reel | null>(null);
  const [similarReels, setSimilarReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAllReels().then(res => {
      setReels(res.reels);
      if (!selectedReelId && res.reels.length > 0) setSelectedReelId(res.reels[0].id);
    }).catch(console.error);
  }, []);

  const runAnalysis = useCallback(async (id: string) => {
    if (!id) return;
    try {
      setLoading(true); setError(null);
      const res = await api.analyzeReel(id);
      setCurrentReel(res.reel);
      setAnalysis(res.analysis);
      setSimilarReels((res as any).similar_reels || []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (selectedReelId) runAnalysis(selectedReelId); }, [selectedReelId, runAnalysis]);

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-[#E4E7EC]">
        <div className="flex items-center gap-3">
          <button onClick={onBackToDashboard} className="p-1.5 btn-secondary rounded-[6px] active:scale-95"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-lg sm:text-xl font-display font-bold text-[#12172B]">Reel Analysis</h1>
            <p className="text-xs text-slate-500 font-mono">Semantic deconstruction + similar content</p>
          </div>
        </div>
        <select value={selectedReelId} onChange={e => setSelectedReelId(e.target.value)} className="w-full sm:w-auto bg-white text-[#12172B] border border-[#E4E7EC] rounded-[6px] px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#3654FF]">
          {reels.map(r => <option key={r.id} value={r.id}>[{r.category}] {r.title.slice(0, 35)}…</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flat-card p-12 text-center"><div className="w-8 h-8 border-2 border-[#E4E7EC] border-t-[#3654FF] rounded-full animate-spin mx-auto mb-3" /><p className="font-mono text-xs text-slate-500">Analyzing...</p></div>
      ) : error || !currentReel || !analysis ? (
        <div className="flat-card p-6 text-center"><AlertCircle className="w-6 h-6 mx-auto mb-2 text-[#C98A2C]" /><p className="text-xs font-mono">{error || 'Analysis unavailable'}</p></div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-[#3654FF] font-mono text-[10px]">
            <div className="reasoning-thread-line w-8" /><span>Reasoning thread from session</span><div className="reasoning-thread-line flex-1" />
          </div>

          {/* Reel info card */}
          <div className="flat-card p-6">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-full sm:w-48 aspect-video rounded-[6px] overflow-hidden relative bg-slate-100 shrink-0 border border-[#E4E7EC]">
                <img src={currentReel.thumbnail_url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400'} alt={currentReel.title} className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-[4px] bg-[#12172B]/85 text-white font-mono text-[9px]">{currentReel.format}</span>
              </div>
              <div className="flex-1 space-y-2">
                <h2 className="text-base font-bold text-[#12172B] font-display">{currentReel.title}</h2>
                <p className="text-xs text-slate-600">{currentReel.description}</p>
                <div className="flex items-center gap-4 pt-2 font-mono text-xs text-slate-600 border-t border-[#E4E7EC]">
                  <span>Difficulty: <b className="text-[#12172B]">{currentReel.difficulty}</b></span>
                  <span>Category: <b className="text-[#12172B]">{currentReel.category}</b></span>
                  <button onClick={() => onWatchInFeed(currentReel.id)} className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#3654FF] hover:underline">
                    <Play className="w-3 h-3 fill-[#3654FF]" /> Watch
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis metrics */}
          <div className="flat-card p-6 space-y-4 border-l-4 border-l-[#3654FF]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-0.5">Detected Intent</span>
                <h3 className="text-lg font-bold text-[#12172B] font-display">{analysis.intent}</h3>
              </div>
              <SegmentedConfidence score={analysis.educational_value} showLabel={true} />
            </div>
            <div className="space-y-2.5">
              <ScoreBar label="Educational Value" value={analysis.educational_value} color="#0F9C93" />
              <ScoreBar label="Hype Level" value={analysis.hype_level} color="#C98A2C" />
              <ScoreBar label="Tech Relevance" value={analysis.tech_relevance} color="#3654FF" />
            </div>
            <div className="evidence-quote font-mono text-xs leading-relaxed">
              <span className="font-bold text-[#0F9C93] block mb-1">→ Reasoning:</span>
              {analysis.reasoning}
            </div>
          </div>

          {/* Topics */}
          <div className="flat-card p-5 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-600">Topics Detected</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.topics.map((t, i) => <span key={i} className="px-2.5 py-1 rounded-[4px] bg-[#F7F8FA] border border-[#E4E7EC] text-xs font-mono">#{t}</span>)}
            </div>
          </div>

          {/* Similar Reels */}
          {similarReels.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#12172B] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0F9C93]" />Similar {currentReel.category} Reels
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {similarReels.map(reel => (
                  <div
                    key={reel.id}
                    onClick={() => setSelectedReelId(reel.id)}
                    className="flat-card-interactive p-3 flex gap-3 items-start cursor-pointer group"
                  >
                    <div className="w-20 h-14 rounded-[6px] overflow-hidden bg-slate-100 shrink-0 border border-[#E4E7EC]">
                      <img src={reel.thumbnail_url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200'} alt={reel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-[#12172B] group-hover:text-[#3654FF] line-clamp-2">{reel.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-[3px]">{reel.difficulty}</span>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-[3px]">{reel.format}</span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); onWatchInFeed(reel.id); }}
                        className="text-[10px] font-mono text-[#3654FF] flex items-center gap-1 mt-1 hover:underline"
                      >
                        <Play className="w-2.5 h-2.5 fill-[#3654FF]" /> Watch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
