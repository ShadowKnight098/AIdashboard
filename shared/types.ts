/**
 * TechScroll AI — Shared Data Contract (Single Source of Truth)
 */

export type Category =
  | 'AI'
  | 'DSA'
  | 'Java'
  | 'HLD'
  | 'Cybersecurity'
  | 'Cloud'
  | 'Hardware'
  | 'Career'
  | 'WebDev'
  | 'DevOps';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type Format =
  | 'Meme'
  | 'Vlog'
  | 'Comparison'
  | 'Explainer'
  | 'News'
  | 'Tutorial'
  | 'Timepass'
  | 'Study'
  | 'Building';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface User {
  id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

/**
 * Represents a video reel in the platform.
 */
export interface Reel {
  id: string;
  title: string;
  description: string;
  transcript: string;
  category: Category;
  difficulty: Difficulty;
  thumbnail_url?: string;
  source_url?: string;
  video_url: string;
  duration_seconds: number;
  format: Format;
  educational_value: number;
  hype_score: number;
  is_candidate: boolean;
  is_recommended?: boolean;
  created_at: string;
}

/**
 * User engagement and playback tracking record for a reel.
 */
export interface Interaction {
  id: string;
  user_id: string;
  reel_id: string;
  watch_percentage: number;
  liked: boolean;
  saved: boolean;
  shared: boolean;
  timestamp: string;
  reel?: Reel;
}

/**
 * Inferred student interest profile synthesized by the AI engine.
 */
export interface InterestProfile {
  id: string;
  user_id: string;
  interest_label: string;
  score: number;
  confidence: ConfidenceLevel;
  evidence: string[];
  updated_at: string;
}

/**
 * AI-generated recommendation with structured explanation.
 */
export interface Recommendation {
  id: string;
  user_id: string;
  current_reel_id?: string;
  interest_detected: string;
  why: string;
  recommended_reel_id: string;
  category: Category;
  why_this_recommendation: string;
  difficulty: Difficulty;
  confidence: ConfidenceLevel;
  created_at: string;
  recommended_reel?: Reel;
}

export interface AIAnalysisResult {
  topics: string[];
  context: string;
  intent: string;
  tech_relevance: number;
  educational_value: number;
  hype_level: number;
  reasoning: string;
}

export interface SessionInterestResult {
  detected_interest: string;
  confidence: ConfidenceLevel;
  evidence: string[];
  reasoning: string;
}

export interface DashboardData {
  user_id: string;
  display_name: string;
  email?: string;
  interest_profiles: InterestProfile[];
  recent_interactions: (Interaction & { reel: Reel })[];
  latest_recommendation?: Recommendation;
}
