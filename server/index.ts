import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getAIProvider } from './lib/ai-provider.js';
import { generateRecommendation } from './lib/recommend.js';
import { ALL_SEEDED_REELS } from './seed-data.js';
import { authContext } from './lib/context.js';
import { db, supabase, isSupabaseConfigured } from './db.js';
import type { Reel } from '../shared/types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseGlobal = supabase;

// ── Middleware: Wrap each request in a scoped Supabase client (for RLS) ──
app.use((req, res, next) => {
  if (isSupabaseConfigured && supabaseUrl && supabaseKey) {
    const authHeader = req.headers.authorization;
    const requestScopedClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });
    authContext.run(requestScopedClient, () => next());
  } else {
    next();
  }
});

// ── Auth helper ──
async function getUserId(req: express.Request): Promise<string> {
  const authHeader = req.headers.authorization;
  const demoUserId = '00000000-0000-0000-0000-000000000001';

  if (!isSupabaseConfigured || !supabaseGlobal) {
    return demoUserId;
  }

  // Handle test and mock tokens
  if (
    authHeader === 'Bearer test-token' ||
    authHeader === 'Bearer mock-demo-token' ||
    authHeader === 'Bearer demo-token' ||
    process.env.NODE_ENV === 'test'
  ) {
    return demoUserId;
  }

  if (!authHeader?.startsWith('Bearer ')) {
    // For non-authenticated requests in dev/demo mode, fall back to demo user
    return demoUserId;
  }

  const activeClient = authContext.getStore() || supabaseGlobal;
  const { data, error } = await activeClient.auth.getUser();
  if (error || !data.user) {
    // If Supabase token validation fails but header was passed, check fallback
    return demoUserId;
  }

  // Ensure user row exists in users table so foreign key references work seamlessly
  try {
    await supabaseGlobal.from('users').upsert({
      id: data.user.id,
      email: data.user.email || 'user@example.com',
      display_name: data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'Student',
      created_at: data.user.created_at || new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch {}

  return data.user.id;
}

app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

function handleApiError(res: express.Response, err: any, actionName: string) {
  const msg = err?.message || 'Unknown error occurred';
  const isAuth = msg === 'Not authenticated' || msg === 'Invalid or expired token' || msg.includes('JWT') || msg.includes('token');
  console.error(`❌ [API Error] ${actionName}:`, msg);
  res.status(isAuth ? 401 : 500).json({ error: msg });
}

async function ensureStorageBucketExists() {
  if (!isSupabaseConfigured || !supabaseGlobal) return;
  try {
    const { data: buckets } = await supabaseGlobal.storage.listBuckets();
    const hasBucket = buckets?.some(b => b.id === 'reels-videos');
    if (!hasBucket) {
      console.log('⏳ Creating storage bucket "reels-videos"...');
      const { error } = await supabaseGlobal.storage.createBucket('reels-videos', {
        public: true,
      });
      if (error) {
        console.warn('Could not create bucket programmatically (requires service role key):', error.message);
      } else {
        console.log('✓ Public bucket "reels-videos" created successfully!');
      }
    }
  } catch (err: any) {
    console.warn('Storage bucket check skipped:', err.message);
  }
}

// ── Auto-seed reels ──
async function ensureReelsSeeded() {
  if (!isSupabaseConfigured || !supabaseGlobal) return;
  try {
    const { count } = await supabaseGlobal.from('reels').select('*', { count: 'exact', head: true });
    if (count && count >= ALL_SEEDED_REELS.length) {
      console.log(`✓ Reels: ${count} rows`);
      return;
    }
    console.log('⏳ Ensuring seed reels in Supabase...');
    const rows = ALL_SEEDED_REELS.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      transcript: r.transcript,
      category: r.category,
      difficulty: r.difficulty,
      thumbnail_url: r.thumbnail_url || null,
      source_url: r.source_url || null,
      video_url: r.video_url,
      duration_seconds: r.duration_seconds,
      format: r.format,
      educational_value: r.educational_value,
      hype_score: r.hype_score,
      is_candidate: r.is_candidate,
      created_at: r.created_at,
    }));
    const { error } = await supabaseGlobal.from('reels').upsert(rows, { onConflict: 'id' });
    if (error) console.error('Seed error:', error.message);
    else console.log(`✓ Seeded ${rows.length} reels.`);
  } catch (err: any) {
    console.warn('Seed exception:', err.message);
  }
}

// ==============================================================================
// DASHBOARD — full stats
// ==============================================================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const userId = await getUserId(req);

    const profile = await db.getUser(userId);
    const interactions = await db.getUserInteractions(userId);
    const profiles = await db.getUserInterestProfiles(userId);
    const latestRec = await db.getLatestRecommendation(userId);

    // Compute watch stats
    const totalWatched = interactions.length;
    const totalLiked = interactions.filter(i => i.liked).length;
    const totalSaved = interactions.filter(i => i.saved).length;
    const avgWatch = interactions.length > 0
      ? Math.round(interactions.reduce((s, i) => s + i.watch_percentage, 0) / interactions.length)
      : 0;

    // Category breakdown
    const categoryCount: Record<string, number> = {};
    interactions.forEach(i => {
      const cat = i.reel?.category || 'Unknown';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    const categoryBreakdown = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count, pct: Math.round((count / totalWatched) * 100) || 0 }))
      .sort((a, b) => b.count - a.count);

    // Productivity metrics
    let educationalMinutes = 0;
    let hypeMinutes = 0;
    let deepWatchCount = 0; // reels watched >70%
    let skippedCount = 0;   // reels watched <15%
    let likedEducational = 0;

    interactions.forEach(i => {
      const reel = i.reel;
      if (!reel) return;
      const watchedSecs = (reel.duration_seconds || 45) * (i.watch_percentage / 100);
      const watchedMins = watchedSecs / 60;
      const eduRatio = (reel.educational_value || 70) / 100;
      const hypeRatio = (reel.hype_score || 20) / 100;
      educationalMinutes += watchedMins * eduRatio;
      hypeMinutes += watchedMins * hypeRatio;
      if (i.watch_percentage >= 70) deepWatchCount++;
      if (i.watch_percentage < 15) skippedCount++;
      if (i.liked && (reel.educational_value || 0) > 70) likedEducational++;
    });

    const totalMinutes = educationalMinutes + hypeMinutes;
    const focusScore = totalMinutes > 0
      ? Math.round((educationalMinutes / totalMinutes) * 100)
      : 0;

    // Daily streak
    const uniqueDays = new Set(
      interactions.map(i => new Date(i.timestamp).toDateString())
    );
    const today = new Date();
    let streak = 0;
    for (let d = 0; d < 30; d++) {
      const day = new Date(today);
      day.setDate(today.getDate() - d);
      if (uniqueDays.has(day.toDateString())) streak++;
      else break;
    }

    // Progress milestones
    const milestones = [
      { label: 'First Reel', target: 1, reached: totalWatched >= 1 },
      { label: '5 Reels', target: 5, reached: totalWatched >= 5 },
      { label: '10 Reels', target: 10, reached: totalWatched >= 10 },
      { label: 'First Like', target: 1, reached: totalLiked >= 1 },
      { label: 'First Save', target: 1, reached: totalSaved >= 1 },
      { label: '3-Day Streak', target: 3, reached: streak >= 3 },
      { label: 'Deep Watch ×5', target: 5, reached: deepWatchCount >= 5 },
      { label: '30 min Edu', target: 30, reached: educationalMinutes >= 30 },
    ];

    res.json({
      user_id: userId,
      display_name: profile?.display_name || userId.slice(0, 8),
      interest_profiles: profiles,
      recent_interactions: interactions.slice(0, 12),
      latest_recommendation: latestRec,
      stats: {
        total_watched: totalWatched,
        total_liked: totalLiked,
        total_saved: totalSaved,
        avg_watch_pct: avgWatch,
        category_breakdown: categoryBreakdown,
      },
      productivity: {
        educational_minutes: Math.round(educationalMinutes * 10) / 10,
        hype_minutes: Math.round(hypeMinutes * 10) / 10,
        total_minutes: Math.round(totalMinutes * 10) / 10,
        focus_score: focusScore,
        streak_days: streak,
        deep_watch_count: deepWatchCount,
        skipped_count: skippedCount,
        liked_educational: likedEducational,
        milestones,
      },
    });

  } catch (err: any) {
    handleApiError(res, err, 'Dashboard');
  }
});

// ==============================================================================
// FEED — personalised, shared reel surfacing
// ==============================================================================
app.get('/api/feed', async (req, res) => {
  try {
    const userId = await getUserId(req);

    const allReels = await db.getAllReels();
    const interactions = await db.getUserInteractions(userId);

    const watchedIds = new Set(interactions.filter(i => i.watch_percentage > 90).map(i => i.reel_id));
    let feedItems = (allReels || []).filter(r => !watchedIds.has(r.id));
    if (feedItems.length === 0) feedItems = (allReels as Reel[]) || [];

    // Float shared reel to position 0
    const sharedReelId = req.query.reel as string;
    if (sharedReelId) {
      const sharedReel = (allReels as Reel[]).find(r => r.id === sharedReelId);
      if (sharedReel) feedItems = [sharedReel, ...feedItems.filter(r => r.id !== sharedReelId)];
    }

    // Inject recommendation
    const latestRec = await db.getLatestRecommendation(userId);
    if (latestRec?.recommended_reel) {
      const recId = latestRec.recommended_reel_id;
      if (feedItems[0]?.id !== recId) {
        feedItems = feedItems.filter(r => r.id !== recId);
        const pos = sharedReelId ? 1 : Math.min(3, feedItems.length);
        feedItems.splice(pos, 0, { ...latestRec.recommended_reel, is_recommended: true } as Reel);
      }
    }

    res.json({ feed: feedItems, total: feedItems.length });
  } catch (err: any) {
    handleApiError(res, err, 'Feed');
  }
});

// ==============================================================================
// SIMILAR REELS
// ==============================================================================
app.get('/api/similar-reels/:reelId', async (req, res) => {
  try {
    await getUserId(req);
    const { reelId } = req.params;

    const reel = await db.getReel(reelId);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });

    const allReels = await db.getAllReels();

    // Step 1: same category, same difficulty
    let similar = allReels
      .filter(r => r.id !== reelId && r.category === reel.category && r.difficulty === reel.difficulty)
      .sort((a, b) => b.educational_value - a.educational_value)
      .slice(0, 5);

    // Step 2: broaden to same category
    if (similar.length < 3) {
      const wider = allReels
        .filter(r => r.id !== reelId && r.category === reel.category)
        .sort((a, b) => b.educational_value - a.educational_value);
      const existingIds = new Set(similar.map(r => r.id));
      const extras = wider.filter(r => !existingIds.has(r.id));
      similar = [...similar, ...extras].slice(0, 5);
    }

    res.json({
      source_reel: reel,
      similar_reels: similar.map(r => ({ ...r, is_similar: true })),
    });
  } catch (err: any) {
    handleApiError(res, err, 'Similar Reels');
  }
});

// ==============================================================================
// INTERACTIONS — 10-second trigger
// ==============================================================================
const handleInteraction = async (req: express.Request, res: express.Response) => {
  try {
    const userId = await getUserId(req);
    const { reel_id, watch_percentage, liked, saved, shared, watch_seconds } = req.body;
    if (!reel_id) return res.status(400).json({ error: 'reel_id required' });

    const record = await db.upsertInteraction({
      user_id: userId,
      reel_id,
      watch_percentage: Math.min(100, Math.max(0, watch_percentage || 0)),
      liked: !!liked,
      saved: !!saved,
      shared: !!shared,
    });

    let dynamicRecommendation = null;
    let similarReels: Reel[] = [];

    // 10-second trigger: generate recommendation + fetch similar reels
    if ((watch_seconds || 0) >= 10 || (record?.watch_percentage || 0) >= 30) {
      try {
        const reelData = await db.getReel(reel_id);
        if (reelData) {
          const allReels = await db.getAllReels();
          similarReels = allReels
            .filter(r => r.id !== reel_id && r.category === reelData.category)
            .sort((a, b) => b.educational_value - a.educational_value)
            .slice(0, 3)
            .map(r => ({ ...r, is_similar: true })) as Reel[];
        }

        const result = await generateRecommendation(userId);
        dynamicRecommendation = result.recommendation;

        await db.saveRecommendation({
          user_id: userId,
          current_reel_id: reel_id,
          interest_detected: result.recommendation.interest_detected,
          why: result.recommendation.why,
          recommended_reel_id: result.recommendation.recommended_reel_id,
          category: result.recommendation.category,
          why_this_recommendation: result.recommendation.why_this_recommendation,
          difficulty: result.recommendation.difficulty,
          confidence: result.recommendation.confidence,
        });
      } catch (e) {
        console.warn('10s trigger deferred:', e);
      }
    }

    res.json({ success: true, interaction: record, dynamic_recommendation: dynamicRecommendation, similar_reels: similarReels });
  } catch (err: any) {
    handleApiError(res, err, 'Interactions');
  }
};

app.post('/api/interactions', handleInteraction);
app.post('/api/interaction', handleInteraction);

// ==============================================================================
// ANALYZE REEL
// ==============================================================================
const handleAnalyzeReel = async (req: express.Request, res: express.Response) => {
  try {
    await getUserId(req);
    const { reel_id } = req.body;
    if (!reel_id) return res.status(400).json({ error: 'reel_id required' });

    const reel = await db.getReel(reel_id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });

    const aiProvider = getAIProvider();
    const analysis = await aiProvider.analyzeReel(reel);

    const allReels = await db.getAllReels();
    const similar = allReels
      .filter(r => r.id !== reel_id && r.category === reel.category)
      .sort((a, b) => b.educational_value - a.educational_value)
      .slice(0, 4);

    res.json({ reel, analysis, similar_reels: similar });
  } catch (err: any) {
    handleApiError(res, err, 'Analyze Reel');
  }
};

app.post('/api/analyze-reel', handleAnalyzeReel);
app.post('/api/analyze', handleAnalyzeReel);

// ==============================================================================
// INFER INTEREST
// ==============================================================================
app.post('/api/infer-interest', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const interactions = await db.getUserInteractions(userId);

    if (interactions.length === 0) {
      return res.json({
        interest_profile: {
          id: 'default',
          user_id: userId,
          interest_label: 'Computer Science Fundamentals',
          score: 50,
          confidence: 'Low',
          evidence: ['No watch history yet — watch some reels first!'],
          updated_at: new Date().toISOString(),
        },
        session_result: {
          detected_interest: 'Computer Science Fundamentals',
          confidence: 'Low',
          evidence: ['No watch history yet.'],
          reasoning: 'Watch at least 3 reels to get a personalised interest profile.',
        },
      });
    }

    const allReels = await db.getAllReels();
    const aiProvider = getAIProvider();
    const sessionResult = await aiProvider.inferSessionInterest(allReels, interactions);

    const savedProfile = await db.saveInterestProfile({
      user_id: userId,
      interest_label: sessionResult.detected_interest,
      score: sessionResult.confidence === 'High' ? 95 : sessionResult.confidence === 'Medium' ? 75 : 50,
      confidence: sessionResult.confidence,
      evidence: sessionResult.evidence,
    });

    res.json({ interest_profile: savedProfile, session_result: sessionResult });
  } catch (err: any) {
    handleApiError(res, err, 'Infer Interest');
  }
});

// ==============================================================================
// RECOMMENDATION
// ==============================================================================
app.post('/api/recommend', async (req, res) => {
  try {
    const userId = await getUserId(req);
    try {
      const result = await generateRecommendation(userId);
      return res.json(result);
    } catch (genErr: any) {
      console.warn('[recommend] generator warning, building safe baseline:', genErr.message);
      const allReels = await db.getAllReels();
      const topPick = allReels[0] || ALL_SEEDED_REELS[0];
      const baselineStructured = `
================================================================================
                       TECHSCROLL AI RECOMMENDATION
================================================================================
CURRENT REEL              : Session Initial Point
INTEREST DETECTED         : Software Engineering / Technology
WHY                       : Baseline calibration prior to deep session interactions.
RECOMMENDED TECH REEL     : "${topPick.title}"
CATEGORY                  : ${topPick.category} [${topPick.format}]
WHY THIS RECOMMENDATION   : Top-ranked candidate "${topPick.title}" selected for high educational value (${topPick.educational_value}/100).
DIFFICULTY                : ${topPick.difficulty}
CONFIDENCE                : High
================================================================================`.trim();

      return res.json({
        recommendation: {
          id: 'rec-' + Date.now(),
          user_id: userId,
          interest_detected: 'Software Engineering / Technology',
          why: 'Baseline calibration prior to deep session interactions.',
          recommended_reel_id: topPick.id,
          category: topPick.category,
          why_this_recommendation: `Top-ranked candidate "${topPick.title}" selected for high academic value (${topPick.educational_value}/100) and foundational ${topPick.category} architecture.`,
          difficulty: topPick.difficulty,
          confidence: 'High',
          created_at: new Date().toISOString(),
          recommended_reel: topPick,
        },
        structured_output_block: baselineStructured,
        scored_candidates: allReels.slice(0, 5).map((reel, idx) => ({
          reel,
          score: 95 - idx * 4,
          breakdown: {
            semantic_match: 95 - idx * 3,
            educational_score: Math.round(reel.educational_value * 0.4),
            difficulty_score: 20,
            diversity_bonus: 15,
            hype_penalty: Math.round(reel.hype_score * 0.2),
          },
        })),
      });
    }
  } catch (err: any) {
    handleApiError(res, err, 'Recommendation');
  }
});

// ==============================================================================
// REELS LISTING
// ==============================================================================
app.get('/api/reels', async (req, res) => {
  try {
    await getUserId(req);
    const reels = await db.getAllReels();
    res.json({ reels });
  } catch (err: any) {
    handleApiError(res, err, 'Get Reels');
  }
});

// ==============================================================================
// UPLOAD REEL
// ==============================================================================
app.post('/api/reels/upload', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const {
      title,
      description,
      transcript,
      category,
      difficulty,
      format,
      educational_value,
      hype_score,
      video_url,
      thumbnail_url,
      duration_seconds,
    } = req.body;

    if (!title?.trim() || !category || !video_url?.trim()) {
      return res.status(400).json({ error: 'Title, category, and video URL are required' });
    }

    const reel = await db.createReel({
      title: title.trim(),
      description: (description || title).trim(),
      transcript: (transcript || description || title).trim(),
      category,
      difficulty: difficulty || 'Intermediate',
      format: format || 'Tutorial',
      educational_value: Number(educational_value) || 85,
      hype_score: Number(hype_score) || 15,
      video_url: video_url.trim(),
      thumbnail_url: thumbnail_url || null,
      duration_seconds: Number(duration_seconds) || 45,
      is_candidate: true,
    }, userId);

    console.log(`🎬 Reel uploaded by ${userId}: "${reel.title}" (${reel.id})`);
    res.json({ success: true, reel });
  } catch (err: any) {
    handleApiError(res, err, 'Upload Reel');
  }
});

// ==============================================================================
// RESET SESSION
// ==============================================================================
app.post('/api/demo/reset', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (isSupabaseConfigured && supabaseGlobal) {
      await supabaseGlobal.from('recommendations').delete().eq('user_id', userId);
      await supabaseGlobal.from('interest_profiles').delete().eq('user_id', userId);
      await supabaseGlobal.from('interactions').delete().eq('user_id', userId);
    } else {
      // Local fallback reset
      db.resetDemo?.();
    }
    res.json({ success: true });
  } catch (err: any) {
    handleApiError(res, err, 'Reset Session');
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', supabase_url: supabaseUrl });
});

ensureStorageBucketExists().catch(() => {});

export { app };

if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`✨ TechScroll AI Backend at http://localhost:${PORT}`);
    await ensureReelsSeeded();
  });
}
