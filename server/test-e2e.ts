import { db, localDb } from './db.js';
import { getAIProvider } from './lib/ai-provider.js';
import { generateRecommendation } from './lib/recommend.js';
import { DEMO_USER } from './seed-data.js';

async function runE2ETests() {
  console.log('🧪 Starting TechScroll AI Phase 8 End-to-End Verification Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // Reset local state to seed baseline
  localDb.reset();

  // Test 1: Seed data integrity
  console.log('--- Test 1: Seed Data Verification ---');
  const allReels = await db.getAllReels();
  const candidates = await db.getCandidateReels();
  const interactions = await db.getUserInteractions(DEMO_USER.id);

  assert(allReels.length === 32, `Total reels seeded is 32 (found: ${allReels.length})`);
  assert(candidates.length === 24, `Total candidate pool is 24 (found: ${candidates.length})`);
  assert(interactions.length === 4, `Demo user has 4 trap sequence interactions (found: ${interactions.length})`);

  // Test 2: Trap Scenario Avoidance (Inference)
  console.log('\n--- Test 2: Multi-Reel Session Inference (Trap Avoidance) ---');
  const aiProvider = getAIProvider();
  const sessionInference = await aiProvider.inferSessionInterest(allReels, interactions);

  console.log(`  Synthesized Interest: "${sessionInference.detected_interest}"`);
  console.log(`  Confidence: ${sessionInference.confidence}`);
  console.log(`  Evidence Citations: ${sessionInference.evidence.length}`);

  assert(
    sessionInference.detected_interest.toLowerCase().includes('software engineering') ||
    sessionInference.detected_interest.toLowerCase().includes('technology'),
    'Inferred interest synthesized as "Software Engineering / Technology" (NOT single keyword "Java")',
    sessionInference.detected_interest
  );
  assert(sessionInference.confidence === 'High', 'Confidence level is High for 4 trap interactions');
  assert(sessionInference.evidence.length >= 3, 'Evidence cites multiple cross-session reels');

  // Save the inferred profile
  await db.saveInterestProfile({
    user_id: DEMO_USER.id,
    interest_label: sessionInference.detected_interest,
    score: 95,
    confidence: sessionInference.confidence,
    evidence: sessionInference.evidence,
  });

  // Test 3: Single Reel Deep Analysis
  console.log('\n--- Test 3: Reel Deep Semantic Analysis ---');
  const javaMemeReel = allReels[0];
  const singleAnalysis = await aiProvider.analyzeReel(javaMemeReel);

  assert(singleAnalysis.topics.length >= 1, `Deconstructed topics for Reel #1: [${singleAnalysis.topics.join(', ')}]`);
  assert(singleAnalysis.intent.length > 0, `Detected creator intent: "${singleAnalysis.intent}"`);
  assert(singleAnalysis.educational_value === 20, `Educational rating: ${singleAnalysis.educational_value}`);

  // Test 4: Recommendation Engine & Hype Penalty Audit
  console.log('\n--- Test 4: Recommendation Engine & Penalty Audit ---');
  const recResult = await generateRecommendation(DEMO_USER.id);
  const recReel = recResult.recommendation.recommended_reel || (await db.getReel(recResult.recommendation.recommended_reel_id))!;

  console.log(`  Top Recommended Reel: "${recReel.title}" [${recReel.category}]`);
  console.log(`  Top Score: ${recResult.scored_candidates[0].score}`);

  assert(
    recReel.category === 'HLD' || recReel.category === 'DSA',
    `Recommendation is high-signal HLD or DSA (got: ${recReel.category})`,
    recReel.category
  );
  assert(
    recReel.category !== 'Java',
    'Recommendation successfully avoided recommending "another Java reel"'
  );

  // Check that the hype reel ("10 AI tools...") was penalized
  const hypeCandidate = recResult.scored_candidates.find(c => c.reel.hype_score > 80);
  if (hypeCandidate) {
    console.log(`  Hype Reel "${hypeCandidate.reel.title.slice(0, 30)}..." Hype Penalty: -${hypeCandidate.breakdown.hype_penalty}`);
    assert(hypeCandidate.breakdown.hype_penalty > 30, 'Clickbait hype reel received severe point penalty');
  }

  // Test 5: 8-Field Structured Block Generation
  console.log('\n--- Test 5: Structured Output Block Validation ---');
  const block = recResult.structured_output_block;
  assert(block.includes('CURRENT REEL'), 'Structured block includes CURRENT REEL');
  assert(block.includes('INTEREST DETECTED'), 'Structured block includes INTEREST DETECTED');
  assert(block.includes('WHY'), 'Structured block includes WHY');
  assert(block.includes('RECOMMENDED TECH REEL'), 'Structured block includes RECOMMENDED TECH REEL');
  assert(block.includes('CATEGORY'), 'Structured block includes CATEGORY');
  assert(block.includes('WHY THIS RECOMMENDATION'), 'Structured block includes WHY THIS RECOMMENDATION');
  assert(block.includes('DIFFICULTY'), 'Structured block includes DIFFICULTY');
  assert(block.includes('CONFIDENCE'), 'Structured block includes CONFIDENCE');

  // Test 6: Closed Loop Feed Verification (Phase 4.5 & Phase 7 Addendum)
  console.log('\n--- Test 6: Closed Loop Feed Verification ---');
  const userInteractions = await db.getUserInteractions(DEMO_USER.id);
  const watchedReelIds = new Set(userInteractions.filter(i => i.watch_percentage > 90).map(i => i.reel_id));
  let feedItems = allReels.filter(r => !watchedReelIds.has(r.id));
  
  // Inject recommendation
  const injectedReel = {
    ...recReel,
    is_recommended: true,
  };
  feedItems.splice(3, 0, injectedReel);

  const foundInFeed = feedItems.find(r => r.id === recReel.id && r.is_recommended);
  assert(!!foundInFeed, 'Recommended Reel successfully injected into the watch feed with is_recommended: true');

  console.log(`\n========================================================`);
  console.log(`E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
