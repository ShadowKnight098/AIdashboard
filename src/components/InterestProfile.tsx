import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, BookOpen, Hammer, Popcorn, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';
import { Reel } from '../../shared/types.js';

type PillarTab = 'All' | 'Study' | 'Building' | 'Timepass';

export const InterestProfile: React.FC = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<PillarTab>('All');
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const dash = await api.getDashboard();
      setProfiles(dash.interest_profiles || []);
      setInteractions(dash.recent_interactions || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReanalyze = async () => {
    try {
      setReanalyzing(true);
      setErrorMsg(null);
      await api.inferInterest();
      await load();
    } catch (err: any) {
      setErrorMsg(`Inference notice: ${err.message}`);
    } finally {
      setReanalyzing(false);
    }
  };

  // Compute breakdown percentages into Study, Building, and Timepass
  let studyCount = 0;
  let buildingCount = 0;
  let timepassCount = 0;

  interactions.forEach(item => {
    const reel = item.reel as Reel | undefined;
    if (!reel) return;
    const fmt = (reel.format || '').toLowerCase();
    const cat = reel.category;
    const isHighEdu = (reel.educational_value || 0) >= 70;
    const isHype = (reel.hype_score || 0) >= 60;

    if (fmt === 'timepass' || fmt === 'meme' || fmt === 'vlog' || (isHype && !isHighEdu)) {
      timepassCount++;
    } else if (fmt === 'building' || fmt === 'tutorial' || ['WebDev', 'DevOps', 'Cloud'].includes(cat)) {
      buildingCount++;
    } else {
      studyCount++;
    }
  });

  const totalTagged = Math.max(1, studyCount + buildingCount + timepassCount);
  const studyPct = Math.round((studyCount / totalTagged) * 100);
  const buildingPct = Math.round((buildingCount / totalTagged) * 100);
  const timepassPct = Math.round((timepassCount / totalTagged) * 100);

  // Filter interaction reels by active tab
  const filteredInteractions = interactions.filter(item => {
    if (activeTab === 'All') return true;
    const reel = item.reel as Reel | undefined;
    if (!reel) return false;
    const fmt = (reel.format || '').toLowerCase();
    const cat = reel.category;
    const isHighEdu = (reel.educational_value || 0) >= 70;
    const isHype = (reel.hype_score || 0) >= 60;

    if (activeTab === 'Timepass') {
      return fmt === 'timepass' || fmt === 'meme' || fmt === 'vlog' || (isHype && !isHighEdu);
    }
    if (activeTab === 'Building') {
      return fmt === 'building' || fmt === 'tutorial' || ['WebDev', 'DevOps', 'Cloud'].includes(cat);
    }
    if (activeTab === 'Study') {
      return !(fmt === 'timepass' || fmt === 'meme' || fmt === 'vlog' || (isHype && !isHighEdu)) &&
             !(fmt === 'building' || fmt === 'tutorial' || ['WebDev', 'DevOps', 'Cloud'].includes(cat));
    }
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-8 h-8 border-2 border-[#E4E7EC] border-t-[#3654FF] rounded-full animate-spin mx-auto mb-3" />
        <p className="font-mono text-xs text-slate-500">Loading your interest profiles...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E7EC]">
        <div>
          <span className="text-[11px] font-mono text-[#0F9C93] uppercase tracking-wider font-semibold block mb-1">
            Interest & Intent Synthesis
          </span>
          <h1 className="text-2xl font-display font-bold text-[#12172B]">Interest Profile</h1>
          <p className="text-xs text-slate-600 mt-1">
            Categorized across <span className="text-[#0F9C93] font-semibold">Study</span>, <span className="text-[#3654FF] font-semibold">Building</span>, and <span className="text-[#C98A2C] font-semibold">Timepass</span>.
          </p>
        </div>
        <button
          onClick={handleReanalyze}
          disabled={reanalyzing}
          className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reanalyzing ? 'animate-spin' : ''}`} />
          {reanalyzing ? 'Synthesizing...' : 'Re-run Inference'}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-[6px] bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* ── 3 PILLARS SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Study */}
        <div
          onClick={() => setActiveTab('Study')}
          className={`flat-card p-4.5 cursor-pointer border-t-4 transition-all ${
            activeTab === 'Study' ? 'ring-2 ring-[#0F9C93] shadow-md' : 'hover:border-slate-300'
          }`}
          style={{ borderTopColor: '#0F9C93' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#0F9C93] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Study / Concepts
            </span>
            <span className="text-xs font-mono font-bold text-[#12172B]">{studyPct}%</span>
          </div>
          <div className="w-full h-2 bg-[#F0FDF4] rounded-full overflow-hidden mb-2">
            <div className="h-full bg-[#0F9C93] rounded-full transition-all duration-700" style={{ width: `${studyPct}%` }} />
          </div>
          <p className="font-mono text-[10px] text-slate-500">DSA, Architecture, Systems, Core CS</p>
        </div>

        {/* Building */}
        <div
          onClick={() => setActiveTab('Building')}
          className={`flat-card p-4.5 cursor-pointer border-t-4 transition-all ${
            activeTab === 'Building' ? 'ring-2 ring-[#3654FF] shadow-md' : 'hover:border-slate-300'
          }`}
          style={{ borderTopColor: '#3654FF' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#3654FF] flex items-center gap-1.5">
              <Hammer className="w-3.5 h-3.5" /> Building / Projects
            </span>
            <span className="text-xs font-mono font-bold text-[#12172B]">{buildingPct}%</span>
          </div>
          <div className="w-full h-2 bg-[#EEF2FF] rounded-full overflow-hidden mb-2">
            <div className="h-full bg-[#3654FF] rounded-full transition-all duration-700" style={{ width: `${buildingPct}%` }} />
          </div>
          <p className="font-mono text-[10px] text-slate-500">WebDev, DevOps, Cloud, AI Tooling</p>
        </div>

        {/* Timepass */}
        <div
          onClick={() => setActiveTab('Timepass')}
          className={`flat-card p-4.5 cursor-pointer border-t-4 transition-all ${
            activeTab === 'Timepass' ? 'ring-2 ring-[#C98A2C] shadow-md' : 'hover:border-slate-300'
          }`}
          style={{ borderTopColor: '#C98A2C' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#C98A2C] flex items-center gap-1.5">
              <Popcorn className="w-3.5 h-3.5" /> Timepass / Memes
            </span>
            <span className="text-xs font-mono font-bold text-[#12172B]">{timepassPct}%</span>
          </div>
          <div className="w-full h-2 bg-[#FFFBEB] rounded-full overflow-hidden mb-2">
            <div className="h-full bg-[#C98A2C] rounded-full transition-all duration-700" style={{ width: `${timepassPct}%` }} />
          </div>
          <p className="font-mono text-[10px] text-slate-500">Tech Memes, Vlogs, Setups, Humor</p>
        </div>
      </div>

      {/* ── Detected AI Interest Profiles ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#12172B] flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#3654FF]" /> Synthesized Interest Vectors
        </h2>

        {profiles.length === 0 ? (
          <div className="flat-card p-8 text-center">
            <p className="text-sm text-slate-600 mb-2">No interest profiles synthesized yet.</p>
            <p className="text-xs text-slate-500 font-mono">Watch at least 3 reels in the feed to calibrate your profile.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p, idx) => {
              const barsFilled = Math.max(1, Math.min(5, Math.round((p.score / 100) * 5)));
              return (
                <div key={p.id || idx} className="flat-card p-5 flex flex-col justify-between space-y-3 border-l-4 border-l-[#3654FF]">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block mb-1">Vector #{idx + 1}</span>
                    <h3 className="text-xs font-bold text-[#12172B]">{p.interest_label}</h3>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[#E4E7EC]">
                    <span className="font-mono text-xs font-semibold text-slate-800">{p.score}% match</span>
                    <div className="flex items-end gap-[3px] h-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-[4px] rounded-[1px] ${['h-2', 'h-2.5', 'h-3', 'h-3.5', 'h-4'][i]} ${
                            i < barsFilled ? 'bg-[#3654FF]' : 'bg-[#E4E7EC]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {p.evidence && p.evidence.length > 0 && (
                    <div className="evidence-quote font-mono text-[10px] leading-relaxed mt-2 space-y-1">
                      {p.evidence.slice(0, 2).map((ev: string, i: number) => (
                        <div key={i} className="flex items-start gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-[#0F9C93] shrink-0 mt-0.5" />
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FILTERABLE REEL STREAM ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#12172B] flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" /> Activity Breakdown by Section
          </h2>
          <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 rounded-[6px] border border-[#E4E7EC]">
            {(['All', 'Study', 'Building', 'Timepass'] as PillarTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs font-mono rounded-[4px] transition-all ${
                  activeTab === tab
                    ? 'bg-white text-[#12172B] font-bold shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filteredInteractions.length === 0 ? (
          <div className="flat-card p-6 text-center text-xs font-mono text-slate-500">
            No reels recorded in the <b className="text-[#12172B]">{activeTab}</b> section yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredInteractions.map(item => {
              const reel = item.reel as Reel | undefined;
              if (!reel) return null;
              return (
                <div key={item.id} className="flat-card p-3 flex gap-3 items-start">
                  <div className="w-16 h-16 rounded-[4px] overflow-hidden bg-slate-100 shrink-0 border border-[#E4E7EC]">
                    <img
                      src={reel.thumbnail_url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200'}
                      alt={reel.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-[3px] bg-[#12172B]/85 text-white inline-block mb-1">
                      {reel.category}
                    </span>
                    <h4 className="text-xs font-semibold text-[#12172B] line-clamp-1">{reel.title}</h4>
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mt-1.5">
                      <span>Retention: {item.watch_percentage}%</span>
                      {item.liked && <span className="text-rose-500">♥</span>}
                      {item.saved && <span className="text-[#0F9C93]">🔖</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
