import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Reel, Interaction, InterestProfile, Recommendation, User, Category, Format, Difficulty } from '../shared/types.js';
import { DEMO_USER, ALL_SEEDED_REELS, SEED_DEMO_INTERACTIONS } from './seed-data.js';
import { getContextClient } from './lib/context.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project'));

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

// Get the active client: request-scoped first, then global client
function getClient(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured.');
  return getContextClient() || supabase;
}

const VALID_CATEGORIES: Category[] = ['AI', 'DSA', 'Java', 'HLD', 'Cybersecurity', 'Cloud', 'Hardware', 'Career', 'WebDev', 'DevOps'];
const VALID_FORMATS: Format[] = ['Meme', 'Vlog', 'Comparison', 'Explainer', 'News', 'Tutorial'];
const VALID_DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

export const PRESET_USERS: User[] = [
  {
    id: DEMO_USER.id,
    display_name: 'Alex Chen (CS Student)',
    email: 'alex.chen@university.edu',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    created_at: new Date('2026-08-01T00:00:00Z').toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    display_name: 'Sarah Jenkins (DevOps Trainee)',
    email: 'sarah.j@techdev.io',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    created_at: new Date('2026-08-05T00:00:00Z').toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    display_name: 'Marcus Vance (AI Researcher)',
    email: 'marcus.vance@lab.ai',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    created_at: new Date('2026-08-10T00:00:00Z').toISOString(),
  }
];

class LocalDB {
  users: User[] = [...PRESET_USERS];
  reels: Reel[] = [...ALL_SEEDED_REELS];
  interactions: Interaction[] = [...SEED_DEMO_INTERACTIONS];
  interest_profiles: InterestProfile[] = [];
  recommendations: Recommendation[] = [];

  reset() {
    this.users = [...PRESET_USERS];
    this.reels = [...ALL_SEEDED_REELS];
    this.interactions = [...SEED_DEMO_INTERACTIONS];
    this.interest_profiles = [];
    this.recommendations = [];
  }
}

export const localDb = new LocalDB();

export const db = {
  // USERS & AUTH
  async getUsers(): Promise<User[]> {
    if (supabase) {
      try {
        const { data } = await getClient().from('users').select('*');
        if (data && data.length > 0) return data as any[];
      } catch {}
    }
    return localDb.users;
  },

  async getUser(id: string): Promise<User | null> {
    if (supabase) {
      try {
        const { data } = await getClient().from('users').select('*').eq('id', id).maybeSingle();
        if (data) return data as any;
      } catch {}
    }
    return localDb.users.find(u => u.id === id) || null;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    if (supabase) {
      try {
        const { data } = await getClient().from('users').select('*').eq('email', email).maybeSingle();
        if (data) return data as any;
      } catch {}
    }
    return localDb.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async createUser(displayName: string, email: string): Promise<User> {
    const newUser: User = {
      id: crypto.randomUUID(),
      display_name: displayName,
      email: email,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await getClient().from('users').insert({
          id: newUser.id,
          email: newUser.email,
          display_name: newUser.display_name,
        }).select().single();
        if (!error && data) return data as any;
      } catch (err) {
        console.warn('Supabase user insert error:', err);
      }
    }

    localDb.users.push(newUser);
    return newUser;
  },

  // REELS
  async getReel(id: string): Promise<Reel | null> {
    if (supabase) {
      try {
        const { data } = await getClient().from('reels').select('*').eq('id', id).maybeSingle();
        if (data) return data as Reel;
      } catch (err) {
        console.warn('getReel fallback:', err);
      }
    }
    return localDb.reels.find(r => r.id === id) || ALL_SEEDED_REELS.find(r => r.id === id) || null;
  },

  async getAllReels(): Promise<Reel[]> {
    if (supabase) {
      try {
        const { data, error } = await getClient().from('reels').select('*');
        if (!error && data && data.length > 0) {
          // Merge Supabase reels with default seeded reels
          const dbReelIds = new Set(data.map((r: Reel) => r.id));
          const missingSeeds = ALL_SEEDED_REELS.filter(s => !dbReelIds.has(s.id));
          return [...(data as Reel[]), ...missingSeeds];
        }
      } catch (err) {
        console.warn('getAllReels fallback:', err);
      }
    }
    return localDb.reels;
  },

  async getCandidateReels(): Promise<Reel[]> {
    const all = await db.getAllReels();
    return all.filter(r => r.is_candidate);
  },

  async createReel(reel: Omit<Reel, 'id' | 'created_at'>, _uploadedBy?: string): Promise<Reel> {
    // Sanitize category & format to match database check constraints
    const safeCategory: Category = (VALID_CATEGORIES.includes(reel.category as Category)
      ? reel.category
      : 'WebDev') as Category;
    const safeFormat: Format = (VALID_FORMATS.includes(reel.format as Format)
      ? reel.format
      : 'Tutorial') as Format;
    const safeDifficulty: Difficulty = (VALID_DIFFICULTIES.includes(reel.difficulty as Difficulty)
      ? reel.difficulty
      : 'Intermediate') as Difficulty;

    const newReel: Reel = {
      id: crypto.randomUUID(),
      title: reel.title.trim(),
      description: (reel.description || reel.title).trim(),
      transcript: (reel.transcript || reel.description || reel.title).trim(),
      category: safeCategory,
      difficulty: safeDifficulty,
      format: safeFormat,
      educational_value: typeof reel.educational_value === 'number' ? Math.max(0, Math.min(100, reel.educational_value)) : 85,
      hype_score: typeof reel.hype_score === 'number' ? Math.max(0, Math.min(100, reel.hype_score)) : 15,
      video_url: reel.video_url,
      thumbnail_url: reel.thumbnail_url || undefined,
      source_url: reel.source_url || undefined,
      duration_seconds: typeof reel.duration_seconds === 'number' ? Math.max(5, reel.duration_seconds) : 45,
      is_candidate: reel.is_candidate ?? true,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      const client = getClient();
      const insertPayload = {
        id: newReel.id,
        title: newReel.title,
        description: newReel.description,
        transcript: newReel.transcript,
        category: newReel.category,
        difficulty: newReel.difficulty,
        format: newReel.format,
        educational_value: newReel.educational_value,
        hype_score: newReel.hype_score,
        video_url: newReel.video_url,
        thumbnail_url: newReel.thumbnail_url || null,
        source_url: newReel.source_url || null,
        duration_seconds: newReel.duration_seconds,
        is_candidate: newReel.is_candidate,
        created_at: newReel.created_at,
      };

      const { data, error } = await client
        .from('reels')
        .insert(insertPayload)
        .select()
        .single();

      if (!error && data) {
        localDb.reels.unshift(data as Reel);
        return data as Reel;
      }

      console.warn('Supabase createReel note:', error?.message);
      // Fallback: store in localDb so upload always succeeds gracefully
      localDb.reels.unshift(newReel);
      return newReel;
    }

    localDb.reels.unshift(newReel);
    return newReel;
  },

  // INTERACTIONS
  async getUserInteractions(userId: string): Promise<(Interaction & { reel: Reel })[]> {
    if (supabase) {
      try {
        const { data, error } = await getClient()
          .from('interactions')
          .select('*, reel:reels(*)')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false });
        if (!error && data && data.length > 0) {
          return (data as any[]).map(i => ({
            ...i,
            reel: i.reel || localDb.reels.find(r => r.id === i.reel_id) || ALL_SEEDED_REELS.find(r => r.id === i.reel_id),
          })).filter(i => !!i.reel);
        }
      } catch (err) {
        console.warn('getUserInteractions fallback:', err);
      }
    }
    return localDb.interactions
      .filter(i => i.user_id === userId)
      .map(i => ({
        ...i,
        reel: localDb.reels.find(r => r.id === i.reel_id) || ALL_SEEDED_REELS.find(r => r.id === i.reel_id)!,
      }))
      .filter(i => !!i.reel)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async upsertInteraction(interaction: Omit<Interaction, 'id' | 'timestamp'> & { timestamp?: string }): Promise<Interaction> {
    const now = interaction.timestamp || new Date().toISOString();
    if (supabase) {
      const { data, error } = await getClient()
        .from('interactions')
        .upsert(
          {
            user_id: interaction.user_id,
            reel_id: interaction.reel_id,
            watch_percentage: interaction.watch_percentage,
            liked: interaction.liked,
            saved: interaction.saved,
            shared: interaction.shared,
            timestamp: now,
          },
          { onConflict: 'user_id,reel_id' }
        )
        .select()
        .single();
      if (!error && data) {
        return data as Interaction;
      }
      if (error) console.warn('Supabase upsertInteraction warning:', error.message);
    }

    const existingIdx = localDb.interactions.findIndex(
      i => i.user_id === interaction.user_id && i.reel_id === interaction.reel_id
    );

    if (existingIdx >= 0) {
      const existing = localDb.interactions[existingIdx];
      const updated: Interaction = {
        ...existing,
        watch_percentage: Math.max(existing.watch_percentage, interaction.watch_percentage),
        liked: interaction.liked ?? existing.liked,
        saved: interaction.saved ?? existing.saved,
        shared: interaction.shared ?? existing.shared,
        timestamp: now,
      };
      localDb.interactions[existingIdx] = updated;
      return updated;
    } else {
      const newRecord: Interaction = {
        id: crypto.randomUUID(),
        user_id: interaction.user_id,
        reel_id: interaction.reel_id,
        watch_percentage: interaction.watch_percentage,
        liked: !!interaction.liked,
        saved: !!interaction.saved,
        shared: !!interaction.shared,
        timestamp: now,
      };
      localDb.interactions.push(newRecord);
      return newRecord;
    }
  },

  // INTEREST PROFILES
  async getUserInterestProfiles(userId: string): Promise<InterestProfile[]> {
    if (supabase) {
      try {
        const { data } = await getClient()
          .from('interest_profiles')
          .select('*')
          .eq('user_id', userId)
          .order('score', { ascending: false });
        if (data && data.length > 0) return data as InterestProfile[];
      } catch (err) {
        console.warn('getUserInterestProfiles fallback:', err);
      }
    }
    return localDb.interest_profiles
      .filter(p => p.user_id === userId)
      .sort((a, b) => b.score - a.score);
  },

  async saveInterestProfile(profile: Omit<InterestProfile, 'id' | 'updated_at'>): Promise<InterestProfile> {
    const now = new Date().toISOString();
    if (supabase) {
      const { data, error } = await getClient()
        .from('interest_profiles')
        .insert({
          user_id: profile.user_id,
          interest_label: profile.interest_label,
          score: profile.score,
          confidence: profile.confidence,
          evidence: profile.evidence,
          updated_at: now,
        })
        .select()
        .single();
      if (!error && data) return data as InterestProfile;
      if (error) console.warn('Supabase saveInterestProfile warning:', error.message);
    }

    const newProfile: InterestProfile = {
      id: crypto.randomUUID(),
      ...profile,
      updated_at: now,
    };
    localDb.interest_profiles.unshift(newProfile);
    return newProfile;
  },

  // RECOMMENDATIONS
  async getLatestRecommendation(userId: string): Promise<Recommendation | null> {
    if (supabase) {
      try {
        const { data } = await getClient()
          .from('recommendations')
          .select('*, recommended_reel:reels!recommendations_recommended_reel_id_fkey(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          return {
            ...data,
            recommended_reel: data.recommended_reel || localDb.reels.find(r => r.id === data.recommended_reel_id) || ALL_SEEDED_REELS.find(r => r.id === data.recommended_reel_id),
          } as any;
        }
      } catch (err) {
        console.warn('getLatestRecommendation fallback:', err);
      }
    }
    const rec = localDb.recommendations
      .filter(r => r.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (!rec) return null;
    return {
      ...rec,
      recommended_reel: localDb.reels.find(r => r.id === rec.recommended_reel_id) || ALL_SEEDED_REELS.find(r => r.id === rec.recommended_reel_id),
    };
  },

  async saveRecommendation(rec: Omit<Recommendation, 'id' | 'created_at'>): Promise<Recommendation> {
    const now = new Date().toISOString();
    if (supabase) {
      const { data, error } = await getClient()
        .from('recommendations')
        .insert({
          user_id: rec.user_id,
          current_reel_id: rec.current_reel_id || null,
          interest_detected: rec.interest_detected,
          why: rec.why,
          recommended_reel_id: rec.recommended_reel_id,
          category: rec.category,
          why_this_recommendation: rec.why_this_recommendation,
          difficulty: rec.difficulty,
          confidence: rec.confidence,
          created_at: now,
        })
        .select('*, recommended_reel:reels!recommendations_recommended_reel_id_fkey(*)')
        .single();
      if (!error && data) return data as any;
      if (error) console.warn('Supabase saveRecommendation warning:', error.message);
    }

    const newRec: Recommendation = {
      id: crypto.randomUUID(),
      ...rec,
      created_at: now,
      recommended_reel: localDb.reels.find(r => r.id === rec.recommended_reel_id) || ALL_SEEDED_REELS.find(r => r.id === rec.recommended_reel_id),
    };
    localDb.recommendations.unshift(newRec);
    return newRec;
  },

  async resetDemo(): Promise<void> {
    localDb.reset();
  }
};
