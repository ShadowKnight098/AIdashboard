import { db } from './db.js';
import { getAIProvider } from './lib/ai-provider.js';
import { generateRecommendation } from './lib/recommend.js';
import { DEMO_USER } from './seed-data.js';

async function verifyInference() {
  console.log('================================================================');
  console.log('🔬 LIVE INFERENCE VERIFICATION (TRAP SCENARIO TEST)');
  console.log('================================================================\n');

  const aiProvider = getAIProvider();
  const allReels = await db.getAllReels();
  const interactions = await db.getUserInteractions(DEMO_USER.id);

  console.log(`1. Student Session History (${interactions.length} watched reels):`);
  interactions.forEach((inter, i) => {
    console.log(`   [#${i + 1}] "${inter.reel?.title}" | Format: ${inter.reel?.format} | Category: ${inter.reel?.category} | Watch %: ${inter.watch_percentage}%`);
  });

  console.log('\n2. Running Multi-Reel AI Inference Engine...');
  const sessionResult = await aiProvider.inferSessionInterest(allReels, interactions);

  console.log('\n--- RAW STRUCTURED INFERENCE OUTPUT ---');
  console.log(JSON.stringify(sessionResult, null, 2));

  console.log('\n3. Running Candidate Recommendation Engine (with Hype Penalty)...');
  const recResult = await generateRecommendation(DEMO_USER.id);

  console.log('\n--- 8-FIELD STRUCTURED TEXT OUTPUT ---');
  console.log(recResult.structured_output_block);

  console.log('\n--- CANDIDATE SCORING & HYPE PENALTY AUDIT ---');
  recResult.scored_candidates.forEach((c, idx) => {
    console.log(`   Rank #${idx + 1}: "${c.reel.title.slice(0, 45)}..."`);
    console.log(`      Category: ${c.reel.category} | Edu: ${c.reel.educational_value} | Hype: ${c.reel.hype_score}`);
    console.log(`      Formula: Semantic(${c.breakdown.semantic_match * 0.4}) + Edu(${c.breakdown.educational_score}) + Diff(${c.breakdown.difficulty_score}) + Div(${c.breakdown.diversity_bonus}) - HypePenalty(${c.breakdown.hype_penalty}) = FINAL SCORE: ${c.score}\n`);
  });
}

verifyInference().catch(console.error);
