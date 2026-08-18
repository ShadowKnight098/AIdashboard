import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Reel, Interaction, InterestProfile, Recommendation, User } from '../shared/types.js';
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
      const { data } = await getClient().from('profiles').select('*');
      return (data as any[]) || localDb.users;
    }
    return localDb.users;
  },

  async getUser(id: string): Promise<User | null> {
    if (supabase) {
      const { data } = await getClient().from('profiles').select('*').eq('id', id).single();
      return (data as any) || null;
    }
    return localDb.users.find(u => u.id === id) || null;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    if (supabase) {
      const { data } = await getClient().from('profiles').select('*').eq('email', email).maybeSingle();
      return (data as any) || null;
    }
    return localDb.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async createUser(displayName: string, email: string): Promise<User> {
    const newUser: User = {
      id: `00000000-0000-0000-0000-${String(localDb.users.length + 1).padStart(12, '0')}`,
      display_name: displayName,
      email: email,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await getClient().from('profiles').insert({
        id: newUser.id,
        display_name: newUser.display_name,
      }).select().single();
      if (error) console.error('Supabase user insert error:', error);
      return data || newUser;
    }

    localDb.users.push(newUser);
    return newUser;
  },

  // REELS
  async getReel(id: string): Promise<Reel | null> {
    if (supabase) {
      const { data } = await getClient().from('reels').select('*').eq('id', id).single();
      return data as Reel | null;
    }
    return localDb.reels.find(r => r.id === id) || null;
  },

  async getAllReels(): Promise<Reel[]> {
    if (supabase) {
      const { data } = await getClient().from('reels').select('*');
      return (data as Reel[]) || [];
    }
    return localDb.reels;
  },

  async getCandidateReels(): Promise<Reel[]> {
    if (supabase) {
      const { data } = await getClient().from('reels').select('*').eq('is_candidate', true);
      return (data as Reel[]) || [];
    }
    return localDb.reels.filter(r => r.is_candidate);
  },

  async createReel(reel: Omit<Reel, 'id' | 'created_at'>): Promise<Reel> {
    const newReel: Reel = {
      id: `30000000-0000-0000-0000-${String(localDb.reels.length + 1).padStart(12, '0')}`,
      ...reel,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await getClient().from('reels').insert(newReel).select().single();
      if (error) throw error;
      return data as Reel;
    }

    localDb.reels.unshift(newReel);
    return newReel;
  },

  // INTERACTIONS
  async getUserInteractions(userId: string): Promise<(Interaction & { reel: Reel })[]> {
    if (supabase) {
      const { data } = await getClient()
        .from('interactions')
        .select('*, reel:reels(*)')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });
      return (data as any) || [];
    }
    return localDb.interactions
      .filter(i => i.user_id === userId)
      .map(i => ({
        ...i,
        reel: localDb.reels.find(r => r.id === i.reel_id)!,
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
      if (error) throw error;
      return data as Interaction;
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
        id: `20000000-0000-0000-0000-${String(localDb.interactions.length + 1).padStart(12, '0')}`,
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
      const { data } = await getClient()
        .from('interest_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('score', { ascending: false });
      return (data as InterestProfile[]) || [];
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
      if (error) throw error;
      return data as InterestProfile;
    }

    const newProfile: InterestProfile = {
      id: `40000000-0000-0000-0000-${String(localDb.interest_profiles.length + 1).padStart(12, '0')}`,
      ...profile,
      updated_at: now,
    };
    localDb.interest_profiles.unshift(newProfile);
    return newProfile;
  },

  // RECOMMENDATIONS
  async getLatestRecommendation(userId: string): Promise<Recommendation | null> {
    if (supabase) {
      const { data } = await getClient()
        .from('recommendations')
        .select('*, recommended_reel:reels!recommendations_recommended_reel_id_fkey(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as any) || null;
    }
    const rec = localDb.recommendations
      .filter(r => r.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (!rec) return null;
    return {
      ...rec,
      recommended_reel: localDb.reels.find(r => r.id === rec.recommended_reel_id),
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
      if (error) throw error;
      return data as any;
    }

    const newRec: Recommendation = {
      id: `50000000-0000-0000-0000-${String(localDb.recommendations.length + 1).padStart(12, '0')}`,
      ...rec,
      created_at: now,
      recommended_reel: localDb.reels.find(r => r.id === rec.recommended_reel_id),
    };
    localDb.recommendations.unshift(newRec);
    return newRec;
  },
};
