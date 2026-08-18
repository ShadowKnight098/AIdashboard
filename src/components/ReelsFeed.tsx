import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Bookmark, Share2, Volume2, VolumeX, ChevronDown, ChevronUp, Play, Binary, AlertCircle, Sparkles, Layers } from 'lucide-react';
import { Reel } from '../../shared/types.js';
import { api } from '../api.js';

interface ReelsFeedProps {
  onInspectReel: (reelId: string) => void;
}

export const ReelsFeed: React.FC<ReelsFeedProps> = ({ onInspectReel }) => {
  const [feed, setFeed] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [watchProgress, setWatchProgress] = useState(0);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [userActions, setUserActions] = useState<Record<string, { liked: boolean; saved: boolean; shared: boolean }>>({});
  const [loopNotif, setLoopNotif] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const fiveSecTriggered = useRef<Record<string, boolean>>({});
  const touchStartY = useRef(0);

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getFeed();
      setFeed(data.feed);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const currentReel = feed[currentIndex];

  const recordPlayback = useCallback(async (
    pct: number,
    secs: number,
    overrides?: { liked?: boolean; saved?: boolean; shared?: boolean }
  ) => {
    if (!currentReel) return;
    const acts = userActions[currentReel.id] || { liked: false, saved: false, shared: false };
    try {
      const res = await api.recordInteraction({
        reel_id: currentReel.id,
        watch_percentage: Math.round(pct),
        watch_seconds: Math.round(secs),
        liked: overrides?.liked ?? acts.liked,
        saved: overrides?.saved ?? acts.saved,
        shared: overrides?.shared ?? acts.shared,
      });

      // Inject similar reels into feed right after the current index
      if (res.similar_reels && res.similar_reels.length > 0) {
        setFeed(prev => {
          const alreadyInjected = prev.some(r => (r as any).is_similar);
          if (alreadyInjected) return prev;
          const updated = [...prev];
          // Insert similar reels after currentIndex + 1
          const insertAt = Math.min(currentIndex + 1, updated.length);
          updated.splice(insertAt, 0, ...res.similar_reels!);
          return updated;
        });
        setLoopNotif(`${res.similar_reels.length} similar ${currentReel.category} reels added`);
        setTimeout(() => setLoopNotif(null), 4000);
      }

      // Show recommendation toast too
      if (res.dynamic_recommendation?.recommended_reel) {
        const recReel = res.dynamic_recommendation.recommended_reel;
        setFeed(prev => {
          if (prev.some(r => r.id === recReel.id && r.is_recommended)) return prev;
          const updated = [...prev];
          updated.splice(Math.min(currentIndex + 4, updated.length), 0, { ...recReel, is_recommended: true });
          return updated;
        });
      }
    } catch {}
  }, [currentReel, userActions, currentIndex]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || !currentReel) return;
    const dur = videoRef.current.duration || currentReel.duration_seconds || 30;
    const pct = Math.min(100, (videoRef.current.currentTime / dur) * 100);
    const secs = videoRef.current.currentTime;
    setWatchProgress(pct);
    setWatchSeconds(secs);

    // 10-second trigger — fires once per reel
    if (secs >= 10 && !fiveSecTriggered.current[currentReel.id]) {
      fiveSecTriggered.current[currentReel.id] = true;
      recordPlayback(pct, secs);
    }
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const target = e.target as HTMLVideoElement;
    const err = target.error;
    let message = 'Failed to load video.';
    if (err) {
      if (err.code === 1) message = 'Playback aborted.';
      else if (err.code === 2) message = 'Network error: Could not download the video.';
      else if (err.code === 3) message = 'Codec Error: Unsupported format (use H.264 MP4 or WebM).';
      else if (err.code === 4) message = 'Access Error: Video file not found or blocked (403). Check Supabase bucket policy.';
    }
    setVideoError(message);
  };

  const goToIndex = (i: number) => {
    if (i < 0 || i >= feed.length) return;
    if (watchProgress > 5) recordPlayback(watchProgress, watchSeconds);
    setWatchProgress(0);
    setWatchSeconds(0);
    setVideoError(null);
    setCurrentIndex(i);
    setIsPlaying(true);
  };

  // Keyboard
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); goToIndex(currentIndex + 1); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); goToIndex(currentIndex - 1); }
      else if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [currentIndex, feed.length, watchProgress, watchSeconds]);

  // Mouse wheel
  useEffect(() => {
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - last < 800) return;
      if (e.deltaY > 30) { goToIndex(currentIndex + 1); last = now; }
      else if (e.deltaY < -30) { goToIndex(currentIndex - 1); last = now; }
    };
    const el = videoContainerRef.current;
    if (el) el.addEventListener('wheel', onWheel, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', onWheel); };
  }, [currentIndex, feed.length, watchProgress, watchSeconds]);

  // Play/pause sync
  useEffect(() => {
    if (videoRef.current) {
      isPlaying ? videoRef.current.play().catch(() => setIsPlaying(false)) : videoRef.current.pause();
    }
  }, [isPlaying, currentIndex]);

  // Mute sync (bypasses React muted attribute quirk)
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) { diff > 0 ? goToIndex(currentIndex + 1) : goToIndex(currentIndex - 1); }
  };

  const toggle = (field: 'liked' | 'saved' | 'shared') => {
    if (!currentReel) return;
    const cur = userActions[currentReel.id] || { liked: false, saved: false, shared: false };

    if (field === 'shared') {
      const shareUrl = `${window.location.origin}?reel=${currentReel.id}`;
      navigator.clipboard?.writeText(shareUrl);
      setLoopNotif('📋 Shareable link copied!');
      setTimeout(() => setLoopNotif(null), 3000);
      const next = { ...cur, shared: true };
      setUserActions(p => ({ ...p, [currentReel.id]: next }));
      recordPlayback(watchProgress, watchSeconds, { shared: true });
      return;
    }

    const next = { ...cur, [field]: !cur[field] };
    setUserActions(p => ({ ...p, [currentReel.id]: next }));
    recordPlayback(watchProgress, watchSeconds, { [field]: next[field] });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[75vh]"><div className="w-8 h-8 border-2 border-[#E4E7EC] border-t-[#3654FF] rounded-full animate-spin" /></div>;
  if (error || !currentReel) return <div className="flex items-center justify-center min-h-[65vh]"><div className="flat-card p-6 text-center"><AlertCircle className="w-6 h-6 mx-auto mb-2 text-[#C98A2C]" /><p className="text-xs font-mono">{error || 'No reels'}</p><button onClick={loadFeed} className="btn-primary px-3 py-1.5 text-xs mt-3">Retry</button></div></div>;

  const acts = userActions[currentReel.id] || { liked: false, saved: false, shared: false };
  const isSimilar = (currentReel as any).is_similar;

  return (
    <div className="w-full max-w-sm mx-auto py-1 sm:py-2 relative flex flex-col items-center select-none">

      {/* Toast notification */}
      {loopNotif && (
        <div className="fixed sm:absolute top-16 sm:-top-10 z-50 flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#12172B] text-white text-[11px] font-mono border border-[#3654FF] shadow-2xl whitespace-nowrap animate-bounce">
          <Sparkles className="w-4 h-4 text-[#3654FF] shrink-0" />
          <span>{loopNotif}</span>
        </div>
      )}

      {/* 10-second hint bar */}
      {watchSeconds > 0 && watchSeconds < 10 && !fiveSecTriggered.current[currentReel.id] && (
        <div className="w-full mb-1.5 px-1.5">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mb-0.5">
            <span>Watch 10s → unlock similar reels</span>
            <span className="font-bold text-[#0F9C93]">{Math.floor(watchSeconds)}s / 10s</span>
          </div>
          <div className="w-full h-[2.5px] bg-[#E4E7EC] rounded-full overflow-hidden">
            <div className="h-full bg-[#0F9C93] transition-all duration-300" style={{ width: `${Math.min(100, (watchSeconds / 10) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Similar / Recommended badge above player */}
      {(isSimilar || currentReel.is_recommended) && (
        <div className={`w-full mb-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-xs font-mono font-semibold ${
          currentReel.is_recommended ? 'bg-[#3654FF]/10 text-[#3654FF] border border-[#3654FF]/20' : 'bg-[#0F9C93]/10 text-[#0F9C93] border border-[#0F9C93]/20'
        }`}>
          <Layers className="w-3.5 h-3.5 shrink-0" />
          {currentReel.is_recommended ? 'AI Recommended for You' : `Similar ${currentReel.category} Reel`}
        </div>
      )}

      {/* Video player */}
      <div
        ref={videoContainerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full aspect-[9/16] h-[68vh] sm:h-[75vh] max-h-[80vh] bg-black rounded-[10px] sm:rounded-[12px] overflow-hidden relative border border-[#E4E7EC] shadow-md"
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-black/40 z-30">
          <div className="h-full bg-[#3654FF] transition-all duration-150" style={{ width: `${watchProgress}%` }} />
        </div>

        <div onClick={() => setIsPlaying(p => !p)} className="absolute inset-0 cursor-pointer bg-black">
          <video
            ref={videoRef}
            src={currentReel.video_url}
            poster={currentReel.thumbnail_url}
            className="w-full h-full object-cover"
            playsInline
            loop={false}
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onError={handleVideoError}
            onEnded={() => { recordPlayback(100, watchSeconds); goToIndex(currentIndex + 1); }}
            autoPlay
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

          {/* Error overlay */}
          {videoError && (
            <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/85 z-40 text-center pointer-events-auto">
              <div className="space-y-3">
                <AlertCircle className="w-8 h-8 text-[#C98A2C] mx-auto" />
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Playback Diagnostic</h3>
                <p className="text-[11px] font-mono text-slate-300 leading-relaxed bg-slate-900 p-2.5 rounded border border-slate-800">{videoError}</p>
                <div className="text-[10px] text-slate-500 font-mono select-text bg-slate-950 p-2 rounded break-all">URL: {currentReel.video_url}</div>
              </div>
            </div>
          )}

          {!isPlaying && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white border border-white/20">
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Top bar */}
        <div className="relative z-20 p-3.5 flex items-center justify-between pointer-events-auto">
          <span className="text-xs font-mono font-semibold text-white/90 bg-black/50 px-2.5 py-1 rounded-[4px] border border-white/10">
            {currentIndex + 1} / {feed.length}
          </span>
          <button onClick={e => { e.stopPropagation(); setIsMuted(p => !p); }} className="w-8 h-8 rounded-[6px] bg-black/50 border border-white/20 flex items-center justify-center text-white active:scale-90">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Bottom overlay: title + actions */}
        <div className="relative z-20 p-4 sm:p-5 flex items-end justify-between gap-3 pointer-events-auto mt-auto">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="px-2.5 py-0.5 rounded-[4px] bg-[#12172B]/90 text-white font-mono text-xs font-semibold">{currentReel.category}</span>
              <span className="px-2 py-0.5 rounded-[4px] bg-white/95 text-[#12172B] font-mono text-xs font-semibold">{currentReel.format}</span>
              <span className="px-2 py-0.5 rounded-[4px] bg-black/60 text-white font-mono text-xs">{currentReel.difficulty}</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white leading-snug drop-shadow-md mb-2.5 font-display line-clamp-2">{currentReel.title}</h2>
            <button
              onClick={e => { e.stopPropagation(); onInspectReel(currentReel.id); }}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-white bg-black/60 hover:bg-black/80 active:scale-95 px-3 py-1.5 rounded-[6px] border border-white/25 shadow-sm"
            >
              <Binary className="w-3.5 h-3.5 text-[#0F9C93]" /> Inspect
            </button>
          </div>
          <div className="flex flex-col items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => toggle('liked')}
              className={`w-10 h-10 rounded-[8px] border flex items-center justify-center transition-transform active:scale-90 ${
                acts.liked ? 'bg-rose-600 border-rose-600 text-white shadow-sm' : 'bg-black/50 backdrop-blur-sm border-white/25 text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${acts.liked ? 'fill-white' : ''}`} />
            </button>
            <button
              onClick={() => toggle('saved')}
              className={`w-10 h-10 rounded-[8px] border flex items-center justify-center transition-transform active:scale-90 ${
                acts.saved ? 'bg-[#0F9C93] border-[#0F9C93] text-white shadow-sm' : 'bg-black/50 backdrop-blur-sm border-white/25 text-white'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${acts.saved ? 'fill-white' : ''}`} />
            </button>
            <button
              onClick={() => toggle('shared')}
              className={`w-10 h-10 rounded-[8px] border flex items-center justify-center transition-transform active:scale-90 ${
                acts.shared ? 'bg-[#3654FF] border-[#3654FF] text-white shadow-sm' : 'bg-black/50 backdrop-blur-sm border-white/25 text-white'
              }`}
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between w-full mt-2.5 px-1">
        <div className="flex items-center gap-2">
          <button onClick={() => goToIndex(currentIndex - 1)} disabled={currentIndex === 0} title="Previous (↑)" className="p-1.5 rounded-[4px] btn-secondary disabled:opacity-30">
            <ChevronUp className="w-4 h-4" />
          </button>
          <span className="font-mono text-[11px] text-slate-500">Reel {currentIndex + 1} of {feed.length}</span>
          <button onClick={() => goToIndex(currentIndex + 1)} disabled={currentIndex === feed.length - 1} title="Next (↓)" className="p-1.5 rounded-[4px] btn-secondary disabled:opacity-30">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider hidden sm:inline">[↑ / ↓] or scroll</span>
      </div>
    </div>
  );
};
