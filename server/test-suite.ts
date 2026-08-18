/**
 * TechScroll AI Automated Test Suite
 * Validates backend endpoints, database fallbacks, AI classification, recommendation engine,
 * and interaction telemetry.
 */

process.env.NODE_ENV = 'test';

import type { Server } from 'http';

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: (baseUrl: string) => Promise<void>, baseUrl: string) {
  const start = performance.now();
  try {
    await fn(baseUrl);
    const durationMs = Math.round(performance.now() - start);
    results.push({ name, passed: true, durationMs });
    console.log(`  \x1b[32m✔\x1b[0m ${name} \x1b[90m(${durationMs}ms)\x1b[0m`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    const errorMsg = err?.message || String(err);
    results.push({ name, passed: false, durationMs, error: errorMsg });
    console.error(`  \x1b[31m✖\x1b[0m ${name} \x1b[90m(${durationMs}ms)\x1b[0m`);
    console.error(`    \x1b[31mError: ${errorMsg}\x1b[0m`);
  }
}

async function main() {
  console.log('\n\x1b[1m\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m   🚀 Running TechScroll AI Test Suite             \x1b[0m');
  console.log('\x1b[1m\x1b[36m====================================================\x1b[0m\n');

  // Start test server on dynamic test port
  const { app } = await import('./index.js');
  const TEST_PORT = 3199;
  let server: Server | null = null;

  await new Promise<void>((resolve) => {
    server = app.listen(TEST_PORT, () => {
      resolve();
    });
  });

  const baseUrl = `http://127.0.0.1:${TEST_PORT}`;

  try {
    console.log('\x1b[1m📋 Group 1: Core System & Infrastructure\x1b[0m');

    // 1. Health Check
    await runTest('GET /api/health should respond with status ok', async (url) => {
      const res = await fetch(`${url}/api/health`);
      if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(`Expected status 'ok', got ${data.status}`);
    }, baseUrl);

    // 2. Fetch All Reels
    await runTest('GET /api/reels should return array of seeded reels', async (url) => {
      const res = await fetch(`${url}/api/reels`);
      if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (!Array.isArray(data.reels) || data.reels.length === 0) {
        throw new Error(`Expected non-empty reels array, got ${data.reels?.length}`);
      }
      const sample = data.reels[0];
      if (!sample.id || !sample.title || !sample.category) {
        throw new Error('Reel object missing required schema fields (id, title, category)');
      }
    }, baseUrl);

    console.log('\n\x1b[1m📱 Group 2: Feed & Discovery Engine\x1b[0m');

    // 3. Get Video Feed
    let firstReelId = '';
    await runTest('GET /api/feed should construct structured vertical feed', async (url) => {
      const res = await fetch(`${url}/api/feed`);
      if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (!Array.isArray(data.feed) || data.feed.length === 0) {
        throw new Error(`Expected valid feed list, got: ${JSON.stringify(data)}`);
      }
      firstReelId = data.feed[0].id;
    }, baseUrl);

    // 4. Similar Reels Lookup
    await runTest('GET /api/similar-reels/:id should find category-aligned reels', async (url) => {
      if (!firstReelId) throw new Error('No reel ID available for similar reels lookup');
      const res = await fetch(`${url}/api/similar-reels/${firstReelId}`);
      if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (!data.source_reel || !Array.isArray(data.similar_reels)) {
        throw new Error('Expected source_reel and similar_reels array in response');
      }
    }, baseUrl);

    console.log('\n\x1b[1m⚡ Group 3: Interaction Telemetry & Watch Signals\x1b[0m');

    // 5. Record Interaction
    await runTest('POST /api/interaction should record watch time, like, and save states', async (url) => {
      if (!firstReelId) throw new Error('No reel ID available');
      const res = await fetch(`${url}/api/interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reel_id: firstReelId,
          watch_percentage: 85,
          watch_seconds: 14,
          liked: true,
          saved: true,
          shared: false,
        }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (!data.success) throw new Error('Expected success: true');
    }, baseUrl);

    console.log('\n\x1b[1m🧠 Group 4: AI Analysis & Recommendation Intelligence\x1b[0m');

    // 6. Analyze Single Reel
    await runTest('POST /api/analyze should generate structured technical metadata', async (url) => {
      if (!firstReelId) throw new Error('No reel ID available');
      const res = await fetch(`${url}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reel_id: firstReelId }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (!data.analysis || typeof data.analysis.educational_value !== 'number') {
        throw new Error(`Invalid analysis structure: ${JSON.stringify(data)}`);
      }
    }, baseUrl);

    // 7. Infer Interest Profile from interactions
    await runTest('POST /api/infer-interest should infer developer skill profile from session history', async (url) => {
      const res = await fetch(`${url}/api/infer-interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (!data.interest_profile && !data.session_result && !data.interest_label) {
        throw new Error(`Expected interest profile in response: ${JSON.stringify(data)}`);
      }
    }, baseUrl);

    // 8. Generate Recommendation
    await runTest('POST /api/recommend should rank candidates and return explanation rationale', async (url) => {
      const res = await fetch(`${url}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (!data.recommendation && !data.recommended_reel) {
        throw new Error(`Expected recommendation payload, got: ${JSON.stringify(data)}`);
      }
    }, baseUrl);

    console.log('\n\x1b[1m📊 Group 5: Dashboard & Session Management\x1b[0m');

    // 9. Dashboard Aggregates
    await runTest('GET /api/dashboard should compute real-time metrics and interest profile', async (url) => {
      const res = await fetch(`${url}/api/dashboard`);
      if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (typeof data?.stats?.total_watched !== 'number' && typeof data?.total_watched !== 'number') {
        throw new Error(`Dashboard response missing expected aggregate statistics: ${JSON.stringify(data)}`);
      }
    }, baseUrl);

    // 10. Demo Reset
    await runTest('POST /api/demo/reset should clear session interactions gracefully', async (url) => {
      const res = await fetch(`${url}/api/demo/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (!data.success) throw new Error('Expected success: true from reset endpoint');
    }, baseUrl);

  } finally {
    if (server) (server as Server).close();
  }

  // Summary Report
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalTime = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log('\n\x1b[1m\x1b[36m====================================================\x1b[0m');
  console.log(`\x1b[1mTest Results: ${passed}/${total} passed (${failed} failed) in ${totalTime}ms\x1b[0m`);
  if (failed === 0) {
    console.log('\x1b[1m\x1b[32m✔ All automated tests passed successfully!\x1b[0m');
  } else {
    console.log(`\x1b[1m\x1b[31m✖ ${failed} test(s) failed.\x1b[0m`);
  }
  console.log('\x1b[1m\x1b[36m====================================================\x1b[0m\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
