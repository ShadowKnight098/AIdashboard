import React, { useEffect, useState, useCallback } from 'react';
import { Play, Copy, Check, AlertCircle, Trophy, Layers, RefreshCw, Compass } from 'lucide-react';
import { Recommendation, Reel } from '../../shared/types.js';
import { SegmentedConfidence } from './SegmentedConfidence.js';
import { api } from '../api.js';

interface ScoredCandidate {
  reel: Reel;
  score: number;
  breakdown: {
    semantic_match: number;
    educational_score: number;
    difficulty_score: number;
    diversity_bonus: number;
    hype_penalty: number;
  };
}

interface AIRecommendationProps {
  onWatchInFeed: (reelId: string) => void;
}

const MiniBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => (
  <div className="flex-1 h-2 bg-[#F5F7FA] rounded-full overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }}
    />
  </div>
);

export const AIRecommendation: React.FC<AIRecommendationProps> = ({ onWatchInFeed }) => {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [structuredBlock, setStructuredBlock] = useState('');
  const [scoredCandidates, setScoredCandidates] = useState<ScoredCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRec = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getRecommendation();
      setRecommendation(res.recommendation);
      setStructuredBlock(res.structured_output_block);
      setScoredCandidates(res.scored_candidates || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRec(); }, [fetchRec]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <div className="w-8 h-8 border-2 border-[#E4E7EC] border-t-[#3654FF] rounded-full animate-spin mx-auto mb-3" />
        <p className="font-mono text-xs text-slate-500">Ranking candidates with AI engine...</p>
      </div>
    );
  }

  const recReel = recommendation?.recommended_reel || scoredCandidates[0]?.reel;

  if (error || !recReel) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 flat-card text-center space-y-3">
        <AlertCircle className="w-6 h-6 mx-auto text-[#C98A2C]" />
        <h3 className="text-sm font-bold text-[#12172B]">No Recommendation Generated Yet</h3>
        <p className="text-xs font-mono text-slate-500">
          {error || 'Watch a few reels in the feed so the AI can rank candidates for your trajectory.'}
        </p>
        <button onClick={fetchRec} className="btn-primary px-4 py-2 text-xs">
          Generate Baseline Recommendation
        </button>
      </div>
    );
  }

  const diffs = ['Beginner', 'Intermediate', 'Advanced'];
  const maxScore = scoredCandidates[0]?.score || 100;
  const currentDiff = recommendation?.difficulty || recReel.difficulty || 'Intermediate';
  const category = recommendation?.category || recReel.category;
  const whyRec = recommendation?.why_this_recommendation || `Ranked as top recommended candidate delivering high pedagogical value and low sensationalism.`;

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-[#E4E7EC]">
        <div>
          <span className="text-[11px] font-mono text-[#3654FF] uppercase tracking-wider font-semibold block mb-1">
            Recommendation Engine
          </span>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#12172B]">AI Curated Next Step</h1>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={fetchRec} className="btn-secondary px-3 py-1.5 text-xs font-mono flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Re-run
          </button>
          {structuredBlock && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(structuredBlock);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="btn-secondary px-3 py-1.5 text-xs font-mono flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#0F9C93]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Block'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[#3654FF] font-mono text-[10px]">
        <div className="reasoning-thread-line w-8" />
        <span>Thread terminates at optimal pedagogical candidate</span>
        <div className="reasoning-thread-line flex-1" />
      </div>

      {/* Winner Card */}
      <div className="flat-card p-6 sm:p-8 space-y-6">
        <div className="aspect-[16/9] w-full rounded-[6px] overflow-hidden relative bg-slate-100 border border-[#E4E7EC]">
          <img
            src={recReel.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'}
            alt={recReel.title}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-[4px] bg-[#3654FF] text-white font-mono text-[10px]">
            {category}
          </span>
          {scoredCandidates[0] && (
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-[4px] bg-[#C98A2C] text-white font-mono text-[10px] flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Score: {scoredCandidates[0].score}
            </span>
          )}
        </div>
        <h2 className="text-xl font-display font-bold text-[#12172B]">{recReel.title}</h2>
        <p className="text-xs text-slate-600">{recReel.description}</p>

        <div className="evidence-quote font-mono text-xs leading-relaxed">
          <span className="font-bold text-[#0F9C93] block mb-1">→ Why this recommendation:</span>
          {whyRec}
        </div>

        <div className="pt-2 border-t border-[#E4E7EC] space-y-2">
          <span className="text-[11px] font-mono text-slate-500 uppercase">Difficulty Target</span>
          <div className="flex gap-2">
            {diffs.map(d => (
              <div
                key={d}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-mono font-medium ${
                  d === currentDiff ? 'bg-[#12172B] text-white' : 'bg-[#F7F8FA] text-slate-400 border border-[#E4E7EC]'
                }`}
              >
                {d}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#E4E7EC]">
          <span className="text-[11px] font-mono text-slate-500 uppercase">Confidence</span>
          <SegmentedConfidence confidence={recommendation?.confidence || 'High'} showLabel={true} />
        </div>

        <button
          onClick={() => onWatchInFeed(recReel.id)}
          className="btn-primary w-full sm:w-auto px-6 py-2.5 text-xs flex items-center justify-center gap-2"
        >
          <Play className="w-3.5 h-3.5 fill-white" /> Watch This Reel
        </button>
      </div>

      {/* Scored Candidates */}
      {scoredCandidates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#12172B] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#3654FF]" />Candidate Score Breakdown
          </h2>
          <div className="space-y-2.5">
            {scoredCandidates.map((c, idx) => (
              <div
                key={c.reel.id}
                className={`flat-card p-4 cursor-pointer transition-all ${
                  idx === 0 ? 'border-l-4 border-l-[#3654FF]' : 'opacity-80 hover:opacity-100'
                }`}
                onClick={() => onWatchInFeed(c.reel.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      {idx === 0 && <Trophy className="w-3 h-3 text-[#C98A2C] shrink-0" />}
                      <span className="text-xs font-semibold text-[#12172B] line-clamp-1">{c.reel.title}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">
                      [{c.reel.category}] {c.reel.difficulty} • {c.reel.format}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <MiniBar value={c.score} max={maxScore} color={idx === 0 ? '#3654FF' : '#94A3B8'} />
                    <span className="font-mono text-xs font-bold text-[#12172B] w-8 text-right">{c.score}</span>
                  </div>
                </div>
                <div className="space-y-1.5 border-t border-[#F0F2F5] pt-2.5">
                  {[
                    { label: 'Semantic', val: c.breakdown.semantic_match, color: '#0F9C93' },
                    { label: 'Education', val: c.breakdown.educational_score, color: '#3654FF' },
                    { label: 'Difficulty', val: c.breakdown.difficulty_score, color: '#C98A2C' },
                    { label: 'Diversity+', val: Math.max(0, c.breakdown.diversity_bonus), color: '#1DB954' },
                    { label: 'Hype −', val: c.breakdown.hype_penalty, color: '#E05252' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-slate-400 w-16 shrink-0">{label}</span>
                      <MiniBar value={val} max={100} color={color} />
                      <span className="font-mono text-[9px] text-slate-500 w-6 text-right">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Structured block */}
      {structuredBlock && (
        <div className="flat-card p-5 relative">
          <div className="absolute top-3 right-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(structuredBlock);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-[10px] font-mono text-slate-400 hover:text-[#3654FF] flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}Copy
            </button>
          </div>
          <pre className="font-mono text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {structuredBlock}
          </pre>
        </div>
      )}
    </div>
  );
};
