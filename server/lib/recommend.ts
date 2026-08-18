import { db } from '../db.js';
import { getAIProvider } from './ai-provider.js';
import { Reel, Recommendation, ConfidenceLevel } from '../../shared/types.js';
import { SEED_CANDIDATE_REELS, ALL_SEEDED_REELS } from '../seed-data.js';

export interface RecommendationEngineResult {
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
}

export async function generateRecommendation(userId: string): Promise<RecommendationEngineResult> {
  const aiProvider = getAIProvider();

  // 1. Fetch user interest profiles & recent interactions
  let profiles: any[] = [];
  try { profiles = await db.getUserInterestProfiles(userId); } catch {}
  let interactions: any[] = [];
  try { interactions = await db.getUserInteractions(userId); } catch {}
  let allReels: Reel[] = [];
  try { allReels = await db.getAllReels(); } catch {}
  if (!allReels || allReels.length === 0) allReels = ALL_SEEDED_REELS;

  let rawCandidates: Reel[] = [];
  try { rawCandidates = await db.getCandidateReels(); } catch {}
  const candidateReels = (rawCandidates && rawCandidates.length > 0)
    ? rawCandidates
    : (allReels && allReels.length > 0)
    ? allReels
    : SEED_CANDIDATE_REELS;

  // If no interest profile exists yet, trigger an automatic inference
  if (profiles.length === 0) {
    const inferred = await aiProvider.inferSessionInterest(allReels, interactions);
    try {
      const saved = await db.saveInterestProfile({
        user_id: userId,
        interest_label: inferred.detected_interest,
        score: 92,
        confidence: inferred.confidence,
        evidence: inferred.evidence,
      });
      profiles = [saved];
    } catch {
      profiles = [{
        id: 'default',
        user_id: userId,
        interest_label: inferred.detected_interest || 'Software Engineering / Technology',
        score: 92,
        confidence: inferred.confidence || 'High',
        evidence: inferred.evidence || ['Initial baseline calibration'],
        updated_at: new Date().toISOString(),
      }];
    }
  }

  const topProfile = profiles[0];
  const detectedInterest = topProfile.interest_label;
  const recentCategories = new Set(interactions.slice(0, 3).map(i => i.reel?.category));

  // 2. Score candidates using the weighted ranking formula
  const scoredCandidates = candidateReels.map(reel => {
    let semanticMatch = 50;

    // Domain mapping for broad categories
    if (detectedInterest.toLowerCase().includes('software engineering') || detectedInterest.toLowerCase().includes('technology')) {
      if (['HLD', 'DSA'].includes(reel.category)) semanticMatch = 98;
      else if (['Career', 'WebDev', 'DevOps'].includes(reel.category)) semanticMatch = 85;
      else if (['Cloud', 'Hardware', 'AI'].includes(reel.category)) semanticMatch = 75;
      else if (reel.category === 'Java') semanticMatch = 65; // Lower to avoid "another Java reel"
    } else if (detectedInterest.toLowerCase().includes(reel.category.toLowerCase())) {
      semanticMatch = 95;
    }

    // Educational value contribution (0-100 normalized to 40% weight)
    const educationalScore = reel.educational_value * 0.4;

    // Difficulty score (Target: Intermediate for general CS students)
    const difficultyScore = reel.difficulty === 'Intermediate' ? 20 : reel.difficulty === 'Advanced' ? 15 : 10;

    // Diversity bonus: penalize exact recent categories to avoid recommendation echo-chambers
    const diversityBonus = recentCategories.has(reel.category) ? -15 : 15;

    // Hype Penalty: severely subtract points if hype_score is high (> 60)
    // A clickbait reel with hype_score = 95 will get a -60 point penalty!
    let hypePenalty = 0;
    if (reel.hype_score > 60) {
      hypePenalty = (reel.hype_score - 50) * 1.5;
    } else {
      hypePenalty = reel.hype_score * 0.2;
    }

    // Final Weighted Score
    const totalScore = (semanticMatch * 0.4) + educationalScore + difficultyScore + diversityBonus - hypePenalty;

    return {
      reel,
      score: Math.round(totalScore * 10) / 10,
      breakdown: {
        semantic_match: semanticMatch,
        educational_score: Math.round(educationalScore),
        difficulty_score: difficultyScore,
        diversity_bonus: diversityBonus,
        hype_penalty: Math.round(hypePenalty),
      },
    };
  });

  // Sort descending by score
  scoredCandidates.sort((a, b) => b.score - a.score);

  const topPick = scoredCandidates[0]?.reel || candidateReels[0];
  const currentReel = interactions[0]?.reel;

  // 3. Generate Evidence-Citing Why and WhyThisRecommendation
  const whySession = `Observed pattern across ${interactions.length} watched reels points to ${detectedInterest}. Avoided narrow keyword capture (e.g. Java memes) in favor of macro engineering concepts.`;
  const whyThisRec = `Top-ranked candidate "${topPick.title}" selected (Score: ${scoredCandidates[0]?.score}). Delivers high academic/practical value (${topPick.educational_value}/100) and low sensationalism (${topPick.hype_score}/100) while advancing core ${topPick.category} competence.`;

  // 4. Construct Recommendation Record
  let newRecommendation: Recommendation;
  try {
    newRecommendation = await db.saveRecommendation({
      user_id: userId,
      current_reel_id: currentReel?.id,
      interest_detected: detectedInterest,
      why: whySession,
      recommended_reel_id: topPick.id,
      category: topPick.category,
      why_this_recommendation: whyThisRec,
      difficulty: topPick.difficulty,
      confidence: (topProfile.confidence as ConfidenceLevel) || 'High',
    });
  } catch (err) {
    console.warn('saveRecommendation fallback:', err);
    newRecommendation = {
      id: 'rec-' + Date.now(),
      user_id: userId,
      current_reel_id: currentReel?.id,
      interest_detected: detectedInterest,
      why: whySession,
      recommended_reel_id: topPick.id,
      category: topPick.category,
      why_this_recommendation: whyThisRec,
      difficulty: topPick.difficulty,
      confidence: (topProfile.confidence as ConfidenceLevel) || 'High',
      created_at: new Date().toISOString(),
      recommended_reel: topPick,
    };
  }

  if (!newRecommendation.recommended_reel) {
    newRecommendation.recommended_reel = topPick;
  }

  // 5. Generate the 8-field structured text block
  const structuredOutputBlock = `
================================================================================
                       TECHSCROLL AI RECOMMENDATION
================================================================================
CURRENT REEL              : ${currentReel ? `"${currentReel.title}" (${currentReel.category})` : 'Session Initial Point'}
INTEREST DETECTED         : ${detectedInterest}
WHY                       : ${whySession}
RECOMMENDED TECH REEL     : "${topPick.title}"
CATEGORY                  : ${topPick.category} [${topPick.format}]
WHY THIS RECOMMENDATION   : ${whyThisRec}
DIFFICULTY                : ${topPick.difficulty}
CONFIDENCE                : ${topProfile.confidence || 'High'}
================================================================================
`.trim();

  return {
    recommendation: newRecommendation,
    structured_output_block: structuredOutputBlock,
    scored_candidates: scoredCandidates.slice(0, 5),
  };
}
