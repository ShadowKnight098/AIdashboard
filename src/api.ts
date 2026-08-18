import { supabase } from './lib/supabase.js';
import type {
  Reel, Interaction, InterestProfile, Recommendation,
  AIAnalysisResult, SessionInterestResult, DashboardData,
} from '../shared/types.js';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export const api = {
  // Dashboard (uses logged-in user from token)
  async getDashboard(): Promise<DashboardData & {
    stats?: {
      total_watched: number;
      total_liked: number;
      total_saved: number;
      avg_watch_pct: number;
      category_breakdown: Array<{ category: string; count: number; pct: number }>;
    };
  }> {
    const res = await fetch(`${API_BASE}/dashboard`, { headers: await authHeaders() });
    if (!res.ok) throw new Error(`Dashboard: ${res.statusText}`);
    return res.json();
  },

  // Feed
  async getFeed(): Promise<{ feed: Reel[]; total: number }> {
    const params = new URLSearchParams(window.location.search);
    const sharedReelId = params.get('reel');
    const url = sharedReelId ? `${API_BASE}/feed?reel=${sharedReelId}` : `${API_BASE}/feed`;
    const res = await fetch(url, { headers: await authHeaders() });
    if (!res.ok) throw new Error(`Feed: ${res.statusText}`);
    return res.json();
  },

  // Record interaction (with watch_seconds for 10-second trigger)
  async recordInteraction(data: {
    reel_id: string;
    watch_percentage: number;
    watch_seconds?: number;
    liked?: boolean;
    saved?: boolean;
    shared?: boolean;
  }): Promise<{ success: boolean; interaction: Interaction; dynamic_recommendation?: Recommendation; similar_reels?: Reel[] }> {
    const res = await fetch(`${API_BASE}/interactions`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Interaction: ${res.statusText}`);
    return res.json();
  },

  // Get similar reels by category/difficulty
  async getSimilarReels(reelId: string): Promise<{ source_reel: Reel; similar_reels: Reel[] }> {
    const res = await fetch(`${API_BASE}/similar-reels/${reelId}`, { headers: await authHeaders() });
    if (!res.ok) throw new Error(`Similar: ${res.statusText}`);
    return res.json();
  },

  // Analyze a reel
  async analyzeReel(reelId: string): Promise<{ reel: Reel; analysis: AIAnalysisResult }> {
    const res = await fetch(`${API_BASE}/analyze-reel`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ reel_id: reelId }),
    });
    if (!res.ok) throw new Error(`Analyze: ${res.statusText}`);
    return res.json();
  },

  // Infer interest from session
  async inferInterest(): Promise<{ interest_profile: InterestProfile; session_result: SessionInterestResult }> {
    const res = await fetch(`${API_BASE}/infer-interest`, {
      method: 'POST',
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`Infer: ${res.statusText}`);
    return res.json();
  },

  // Get recommendation
  async getRecommendation(): Promise<{
    recommendation: Recommendation;
    structured_output_block: string;
    scored_candidates: Array<{
      reel: Reel;
      score: number;
      breakdown: {
        semantic_match: number;
        educational_score: number;
        difficulty_score: number;
        diversity_bonus: number;
        hype_penalty: number;
      };
    }>;
  }> {
    const res = await fetch(`${API_BASE}/recommend`, {
      method: 'POST',
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`Recommend: ${res.statusText}`);
    return res.json();
  },

  // Get all reels
  async getAllReels(): Promise<{ reels: Reel[] }> {
    const res = await fetch(`${API_BASE}/reels`, { headers: await authHeaders() });
    if (!res.ok) throw new Error(`Reels: ${res.statusText}`);
    return res.json();
  },

  // Upload a new reel (metadata — video file uploaded separately to Supabase Storage)
  async uploadReel(data: {
    title: string;
    description?: string;
    transcript?: string;
    category: string;
    difficulty: string;
    format: string;
    educational_value?: number;
    hype_score?: number;
    video_url: string;
    thumbnail_url?: string;
    duration_seconds?: number;
  }): Promise<{ success: boolean; reel: Reel }> {
    const res = await fetch(`${API_BASE}/reels/upload`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Upload: ${res.statusText}`);
    return res.json();
  },

  // Reset demo (dev only)
  async resetDemo(): Promise<void> {
    await fetch(`${API_BASE}/demo/reset`, { method: 'POST', headers: await authHeaders() });
  },
};
