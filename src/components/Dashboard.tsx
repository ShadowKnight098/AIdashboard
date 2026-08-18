import React, { useEffect, useState, useCallback } from 'react';
import {
  Play, ArrowRight, TrendingUp, Eye, Heart, Bookmark,
  Zap, BarChart2, Brain, Flame, Clock, Target, Award, SkipForward, CheckCircle2, Circle
} from 'lucide-react';
import { DashboardData } from '../../shared/types.js';
import { SegmentedConfidence } from './SegmentedConfidence.js';
import { useAuth } from '../lib/AuthContext.js';
import { api } from '../api.js';

interface Productivity {
  educational_minutes: number;
  hype_minutes: number;
  total_minutes: number;
  focus_score: number;
  streak_days: number;
  deep_watch_count: number;
  skipped_count: number;
  liked_educational: number;
  milestones: Array<{ label: string; target: number; reached: boolean }>;
}

type DashboardFull = DashboardData & {
  stats?: {
    total_watched: number;
    total_liked: number;
    total_saved: number;
    avg_watch_pct: number;
    category_breakdown: Array<{ category: string; count: number; pct: number }>;
  };
  productivity?: Productivity;
};

interface DashboardProps {
  onNavigateToScreen: (screen: 'feed' | 'analysis' | 'recommendation' | 'profile', reelId?: string) => void;
}

// Category color palette
const CATEGORY_COLORS: Record<string, string> = {
  AI: '#3654FF', DSA: '#0F9C93', HLD: '#C98A2C', Java: '#E05252',
  Cloud: '#6B4EFF', Cybersecurity: '#1DB954', WebDev: '#F97316',
  Hardware: '#8B5CF6', Career: '#EC4899', DevOps: '#14B8A6',
  Timepass: '#D97706',
};

const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string;
}> = ({ icon, label, value, sub, accent = '#3654FF' }) => (
  <div className="flat-card p-4 sm:p-5 flex flex-col gap-2 shadow-sm">
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: `${accent}18` }}>
        <div style={{ color: accent }}>{icon}</div>
      </div>
    </div>
    <div className="text-2xl sm:text-3xl font-display font-bold text-[#12172B]">{value}</div>
    {sub && <span className="font-mono text-xs text-slate-500">{sub}</span>}
  </div>
);

// Donut / ring gauge for focus score
const FocusRing: React.FC<{ score: number }> = ({ score }) => {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const wasteFill = ((100 - score) / 100) * circ;
  const color = score >= 70 ? '#0F9C93' : score >= 40 ? '#C98A2C' : '#E05252';
  const label = score >= 70 ? 'Productive' : score >= 40 ? 'Mixed' : 'Distracted';

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        {/* waste track */}
        <circle cx="48" cy="48" r={r} fill="none" stroke="#FEE2E2" strokeWidth="10" />
        {/* edu track */}
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="text-center -mt-[60px]" style={{ zIndex: 10, position: 'relative' }}>
        <div className="text-2xl font-display font-bold" style={{ color }}>{score}%</div>
        <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color }}>{label}</div>
      </div>
      <div className="mt-6" />
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToScreen }) => {
  const { displayName } = useAuth();
  const [data, setData] = useState<DashboardFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboard();
      setData(res as DashboardFull);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setAnalyzeMsg(null);
      const res = await api.inferInterest();
      const conf = (res as any).interest_profile?.confidence;
      if (conf === 'Low') {
        setAnalyzeMsg('Watch more reels to improve your interest profile!');
      } else {
        await loadDashboard();
        onNavigateToScreen('profile');
      }
    } catch (err: any) {
      setAnalyzeMsg(`Error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto py-16 px-4 text-center">
      <div className="w-8 h-8 border-2 border-[#E4E7EC] border-t-[#3654FF] rounded-full animate-spin mx-auto mb-3" />
      <p className="font-mono text-xs text-slate-500">Loading your session data...</p>
    </div>
  );

  if (error || !data) return (
    <div className="max-w-md mx-auto my-12 p-6 flat-card text-center">
      <p className="text-sm text-slate-700 mb-3">{error || 'Failed to load dashboard'}</p>
      <button onClick={loadDashboard} className="btn-primary px-4 py-2 text-xs">Retry</button>
    </div>
  );

  const stats = data.stats;
  const prod = data.productivity;
  const maxCat = stats?.category_breakdown?.[0]?.count || 1;
  const reached = prod?.milestones.filter(m => m.reached).length || 0;
  const total = prod?.milestones.length || 1;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E4E7EC]">
        <div>
          <span className="text-[11px] font-mono text-[#0F9C93] uppercase tracking-wider font-semibold block mb-1">
            Welcome back, {displayName}
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#12172B] tracking-tight">
            Your Learning Dashboard
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2.5 shrink-0">
            <button onClick={() => onNavigateToScreen('feed')} className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 fill-[#12172B]" /> Watch Feed
            </button>
            <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary px-4 py-2 text-xs">
              {analyzing ? 'Analyzing...' : 'Analyze My Activity'}
            </button>
          </div>
          {analyzeMsg && (
            <span className="font-mono text-[10px] text-[#C98A2C] text-right">{analyzeMsg}</span>
          )}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Eye className="w-3.5 h-3.5" />} label="Reels Watched" value={stats.total_watched} sub="total views" accent="#3654FF" />
          <StatCard icon={<Heart className="w-3.5 h-3.5" />} label="Liked" value={stats.total_liked} sub={`${Math.round((stats.total_liked / Math.max(stats.total_watched, 1)) * 100)}% like rate`} accent="#E05252" />
          <StatCard icon={<Bookmark className="w-3.5 h-3.5" />} label="Saved" value={stats.total_saved} sub="bookmarked" accent="#0F9C93" />
          <StatCard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Avg Retention" value={`${stats.avg_watch_pct}%`} sub="watch completion" accent="#C98A2C" />
        </div>
      )}

      {/* ── PRODUCTIVITY SECTION ── */}
      {prod && (
        <div className="space-y-4">
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#12172B] flex items-center gap-2">
            <Target className="w-4 h-4 text-[#3654FF]" />Productivity Report
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Focus Score ring */}
            <div className="flat-card p-5 flex flex-col items-center justify-center text-center gap-1 border-l-4" style={{ borderLeftColor: prod.focus_score >= 70 ? '#0F9C93' : prod.focus_score >= 40 ? '#C98A2C' : '#E05252' }}>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1">Focus Score</span>
              <FocusRing score={prod.focus_score} />
              <p className="font-mono text-[10px] text-slate-500 mt-1">
                {prod.focus_score >= 70 ? 'Great job! Most of your time is productive.' :
                  prod.focus_score >= 40 ? 'Good mix, but try to skip low-quality reels.' :
                    'Too much hype content. Seek high educational-value reels.'}
              </p>
            </div>

            {/* Time breakdown */}
            <div className="flat-card p-5 space-y-4">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Time Breakdown</span>

              {/* Edu bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="flex items-center gap-1.5 text-[#0F9C93] font-semibold"><Clock className="w-3 h-3" />Productive</span>
                  <span className="text-[#12172B] font-bold">{prod.educational_minutes} min</span>
                </div>
                <div className="w-full h-3 bg-[#F0FDF4] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0F9C93] rounded-full transition-all duration-700"
                    style={{ width: `${prod.total_minutes > 0 ? (prod.educational_minutes / prod.total_minutes) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Waste bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="flex items-center gap-1.5 text-[#E05252] font-semibold"><Zap className="w-3 h-3" />Time Wasted</span>
                  <span className="text-[#12172B] font-bold">{prod.hype_minutes} min</span>
                </div>
                <div className="w-full h-3 bg-[#FEF2F2] rounded-full overflow-hidden">
                  <div className="h-full bg-[#E05252] rounded-full transition-all duration-700"
                    style={{ width: `${prod.total_minutes > 0 ? (prod.hype_minutes / prod.total_minutes) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E4E7EC] grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-sm font-bold text-[#12172B]">{prod.streak_days}</div>
                  <div className="font-mono text-[9px] text-slate-400 flex items-center justify-center gap-0.5"><Flame className="w-2.5 h-2.5 text-orange-500" />Day Streak</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#12172B]">{prod.deep_watch_count}</div>
                  <div className="font-mono text-[9px] text-slate-400">Deep Watches</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#12172B]">{prod.skipped_count}</div>
                  <div className="font-mono text-[9px] text-slate-400 flex items-center justify-center gap-0.5"><SkipForward className="w-2.5 h-2.5 text-slate-400" />Skipped</div>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="flat-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Award className="w-3 h-3 text-[#C98A2C]" />Milestones</span>
                <span className="font-mono text-[10px] text-[#3654FF] font-semibold">{reached}/{total}</span>
              </div>
              {/* Progress bar across all milestones */}
              <div className="w-full h-1.5 bg-[#E4E7EC] rounded-full overflow-hidden">
                <div className="h-full bg-[#3654FF] rounded-full transition-all duration-700"
                  style={{ width: `${(reached / total) * 100}%` }} />
              </div>
              <div className="space-y-1.5 mt-1">
                {prod.milestones.map((m, i) => (
                  <div key={i} className={`flex items-center gap-2 py-1 ${m.reached ? '' : 'opacity-50'}`}>
                    {m.reached
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-[#0F9C93] shrink-0" />
                      : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                    <span className={`font-mono text-[11px] ${m.reached ? 'text-[#12172B] font-semibold' : 'text-slate-400'}`}>{m.label}</span>
                    {m.reached && <span className="ml-auto text-[9px] font-mono text-[#0F9C93]">✓ Done</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Productivity tip */}
          {prod.focus_score < 60 && prod.total_minutes > 0 && (
            <div className="flat-card px-4 py-3 flex items-start gap-3 border-l-4 border-l-[#C98A2C]">
              <Target className="w-4 h-4 text-[#C98A2C] mt-0.5 shrink-0" />
              <div>
                <span className="font-mono text-[11px] font-bold text-[#C98A2C] uppercase block">Productivity Tip</span>
                <p className="font-mono text-[11px] text-slate-600 mt-0.5">
                  You're spending <b>{prod.hype_minutes} min</b> on hype content vs <b>{prod.educational_minutes} min</b> on educational reels.
                  Try the <b>Inspect</b> button on reels to see which ones actually teach you something.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Category Breakdown ── */}
      {stats?.category_breakdown && stats.category_breakdown.length > 0 && (
        <div className="flat-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#12172B] flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#3654FF]" />Category Breakdown
            </h2>
            <span className="font-mono text-[10px] text-slate-400">{stats.total_watched} total</span>
          </div>
          <div className="space-y-2.5">
            {stats.category_breakdown.map(({ category, count, pct }) => (
              <div key={category} className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-slate-600 w-20 shrink-0">{category}</span>
                <div className="flex-1 h-5 bg-[#F5F7FA] rounded-[4px] overflow-hidden relative">
                  <div
                    className="h-full rounded-[4px] flex items-center justify-end pr-2 transition-all duration-700"
                    style={{ width: `${Math.max(8, (count / maxCat) * 100)}%`, background: CATEGORY_COLORS[category] || '#3654FF' }}
                  >
                    <span className="font-mono text-[9px] text-white font-semibold">{count}</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-slate-400 w-8 text-right">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Detected Interests ── */}
      {data.interest_profiles.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#12172B] flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#0F9C93]" />Detected Interest Profiles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.interest_profiles.slice(0, 4).map((p, idx) => (
              <div key={idx} onClick={() => onNavigateToScreen('profile')} className="flat-card-interactive p-4 cursor-pointer">
                <span className="text-xs font-semibold text-[#12172B] block mb-2">{p.interest_label}</span>
                <div className="pt-2 border-t border-[#E4E7EC]">
                  <SegmentedConfidence score={p.score} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Reasoning Thread ── */}
      {data.interest_profiles.length > 0 && (
        <div className="hidden md:flex items-center gap-2 text-[#3654FF] font-mono text-[10px]">
          <div className="reasoning-thread-line w-12" />
          <span>Reasoning thread anchors to your watch stream</span>
          <div className="reasoning-thread-line flex-1" />
        </div>
      )}

      {/* ── Recent Interactions ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#12172B] flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#C98A2C]" />Recent Reel Interactions
        </h2>
        {data.recent_interactions.length === 0 ? (
          <div className="flat-card p-8 text-center text-xs font-mono text-slate-500">
            No interactions yet. Open the Reels Feed and start watching!
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 pt-1">
            {data.recent_interactions.map((interaction) => {
              const reel = interaction.reel;
              if (!reel) return null;
              return (
                <div key={interaction.id} onClick={() => onNavigateToScreen('analysis', reel.id)} className="flat-card-interactive p-3 min-w-[220px] max-w-[240px] shrink-0 cursor-pointer group">
                  <div className="aspect-[16/10] w-full rounded-[6px] overflow-hidden relative bg-slate-100 mb-2.5">
                    <img src={reel.thumbnail_url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400'} alt={reel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-[4px] bg-[#12172B]/85 text-white font-mono text-[9px]">{reel.format}</span>
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-[4px] bg-white/90 text-[#12172B] font-mono text-[9px] border border-[#E4E7EC]">{reel.category}</span>
                  </div>
                  <h3 className="text-xs font-medium text-[#12172B] group-hover:text-[#3654FF] line-clamp-2 mb-3">{reel.title}</h3>
                  <div className="flex gap-2 mb-2.5">
                    {interaction.liked && <span className="text-[9px] font-mono px-1.5 py-0.5 bg-rose-50 text-rose-500 rounded-[4px]">♥ Liked</span>}
                    {interaction.saved && <span className="text-[9px] font-mono px-1.5 py-0.5 bg-teal-50 text-[#0F9C93] rounded-[4px]">🔖 Saved</span>}
                  </div>
                  <div className="pt-2 border-t border-[#E4E7EC]">
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-600 mb-1">
                      <span>Retention</span>
                      <span className="font-semibold text-[#12172B]">{interaction.watch_percentage}%</span>
                    </div>
                    <div className="w-full h-[2px] bg-[#E4E7EC] rounded-full overflow-hidden">
                      <div className="h-full bg-[#3654FF] rounded-full" style={{ width: `${interaction.watch_percentage}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Latest Recommendation ── */}
      {data.latest_recommendation?.recommended_reel && (
        <div className="flat-card p-5 border-l-4 border-l-[#3654FF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono text-[#3654FF] uppercase tracking-wider font-semibold block mb-1">AI Recommendation Ready</span>
            <h3 className="text-sm font-bold text-[#12172B] font-display">{data.latest_recommendation.recommended_reel.title}</h3>
            <p className="text-xs text-slate-600 mt-0.5">{data.latest_recommendation.why_this_recommendation}</p>
          </div>
          <button onClick={() => onNavigateToScreen('recommendation')} className="btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 shrink-0">
            View <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
