# TechScroll AI — Complete Phased Build Plan (with Reels Feed Addendum)

How to use this: run one phase at a time as a separate Antigravity task/prompt,
in order. Don't skip ahead. Each phase ends with a "Definition of Done" —
don't start the next phase until that's true. This is what keeps the UI and
backend from drifting apart: the **data contract in Phase 1** is written once
and every later phase (frontend and backend) is told to import/reference it,
never to redefine its own version of the shape.

Feed each phase block below to Antigravity as its own prompt, in its own turn.

---

## Phase 0 — Inspect, don't build yet

**Goal:** Antigravity understands what already exists before touching anything.

**Prompt to give Antigravity:**
```
Inspect the current project structure. List all existing files, especially 
anything from the Stitch export (components, pages, styles, design tokens). 
Identify: 
1. What framework/routing the Stitch export uses
2. Where design tokens (colors, fonts from design.md) are defined
3. Which of the 5 screens (Dashboard, Reels Feed, Reel Analysis, AI Recommendation, 
   Interest Profile) already exist as components/pages
4. Whether Vite + React is already scaffolded, or needs setup

Do not modify or delete anything. Just produce a summary report and a list 
of file paths, so we can plan integration points without breaking existing UI.
```

**Definition of Done:** You have a written inventory of existing files/components before any code changes happen.

---

## Phase 1 — Data contract (the single source of truth)

**Goal:** Define the exact shape of every object once, in a shared types file. Everything downstream — Supabase schema, backend API responses, frontend components — reads from this file instead of re-inventing field names. This is the step that prevents UI/backend mismatch later.

**Prompt to give Antigravity:**
```
Create /shared/types.ts (or /src/types/index.ts if project structure prefers 
it) defining TypeScript interfaces for:

- Reel: id, title, description, transcript, category (enum: AI, DSA, Java, 
  HLD, Cybersecurity, Cloud, Hardware, Career, WebDev, DevOps), difficulty 
  (enum: Beginner, Intermediate, Advanced), thumbnail_url, source_url, 
  video_url (string — storage path or public URL), duration_seconds (number),
  format (enum: Meme, Vlog, Comparison, Explainer, News, Tutorial), 
  educational_value (0-100), hype_score (0-100), is_candidate (boolean — 
  true for the 20-30 recommendation pool, false for the 8 seeded 
  interaction reels), is_recommended (boolean, optional/transient for feed),
  created_at

- Interaction: id, user_id, reel_id, watch_percentage (0-100), liked 
  (boolean), saved (boolean), shared (boolean), timestamp

- InterestProfile: id, user_id, interest_label (string, e.g. "Software 
  Engineering / Technology"), score (0-100), confidence (enum: High, 
  Medium, Low), evidence (string[]), updated_at

- Recommendation: id, user_id, current_reel_id, interest_detected, why 
  (string), recommended_reel_id, category, why_this_recommendation 
  (string), difficulty, confidence (enum: High, Medium, Low), created_at

- AIAnalysisResult: the raw structured JSON shape the LLM must return — 
  topics (string[]), context (string), intent (string), tech_relevance 
  (0-100), educational_value (0-100), hype_level (0-100), reasoning (string)

- SessionInterestResult: the raw structured JSON shape for multi-reel 
  inference — detected_interest (string), confidence (High/Medium/Low), 
  evidence (string[]), reasoning (string)

Add JSDoc comments on each field. This file will be imported by both the 
backend API layer and the frontend — do not duplicate these types anywhere 
else in the codebase.
```

**Definition of Done:** One types file exists, nothing else references field names that aren't in it.

---

## Phase 2 — Supabase schema

**Goal:** Create tables matching Phase 1 types exactly, field-for-field.

**Prompt to give Antigravity:**
```
Using /shared/types.ts as the source of truth, create Supabase SQL migrations 
for these tables, with field names and types matching the TypeScript 
interfaces exactly (snake_case in SQL, matching the camelCase/field names 
already used in types.ts):

1. users — id (uuid, references auth.users), display_name, created_at
2. reels — matches the Reel interface (including video_url and duration_seconds),
   plus is_candidate boolean to distinguish the 8 seed interaction reels from 
   the 20-30 recommendation pool
3. interactions — matches Interaction interface, foreign keys to users 
   and reels, unique constraint on (user_id, reel_id) for upserting
4. interest_profiles — matches InterestProfile interface, foreign key to 
   users, evidence stored as text[] or jsonb array
5. recommendations — matches Recommendation interface, foreign keys to 
   users and reels (current_reel_id, recommended_reel_id both reference reels)
6. Storage bucket: reels-videos (public-read, write-restricted to service role)

Add Row Level Security: users can only read/write their own interactions, 
interest_profiles, and recommendations. The reels table is public-read, 
write-restricted to service role only (since it's seeded/managed server-side).

Output the .sql migration file(s) and confirm RLS policies are attached to 
each user-scoped table.
```

**Definition of Done:** Migrations run cleanly against a Supabase project, RLS policies exist on the 3 user-scoped tables, and `reels-videos` storage bucket config is specified.

---

## Phase 3 — Seed data

**Goal:** Populate reels table with realistic fictional data, including the trap scenario and video paths.

**Prompt to give Antigravity:**
```
Write a seed script (SQL or a Node/TS seed script using the Supabase client) 
that inserts:

A) 8 "interaction" reels (is_candidate = false) — these represent what a 
   student has already watched. Include this exact trap sequence as reels 
   1-4:
   1. "POV: your code compiles on the first try" — format: Meme, category: 
      Java, low educational_value, low hype_score
   2. "A day in my life as a backend engineer at a fintech startup" — 
      format: Vlog, category: Career
   3. "Interviewer: reverse a linked list. Me:" — format: Meme, category: DSA
   4. "M3 MacBook Pro vs ThinkPad X1 for developers" — format: Comparison, 
      category: Hardware
   Add 4 more mixed reels (some entertainment/non-tech, to test the system 
   doesn't over-attribute interest from noise).

B) 20-30 "candidate" reels (is_candidate = true) spanning AI, DSA, Java, 
   HLD, Cybersecurity, Cloud, Hardware, Career, WebDev, DevOps. Vary 
   difficulty across all three levels. Critically, include:
   - At least 2-3 reels with HIGH hype_score and LOW educational_value 
     (e.g. "10 AI tools that will get you hired in 2026") — these exist 
     specifically to test that the ranking engine penalizes them
   - At least 2-3 solid HLD/System Design reels at Intermediate difficulty 
     — these should be the "correct" output for the trap scenario
   - Realistic transcripts/descriptions for each (2-4 sentences), not just 
     titles — the AI analysis pipeline needs real text to reason over
   - Realistic video_url paths and duration_seconds for all reels

For every reel, populate all fields from the Reel interface — don't leave 
educational_value or hype_score null, since the ranking engine depends on 
them as fallback/prior signals.

Also seed one demo user and 4 interactions (watching reels 1-4 from set A) 
so the trap scenario is immediately testable after seeding.
```

**Definition of Done:** Query `select count(*) from reels where is_candidate = true` returns 20-30, the trap sequence exists as seeded interactions for the demo user.

---

## Phase 4 — Backend API layer (keys stay server-side)

**Goal:** A minimal server (not the Vite frontend) that holds the LLM API key and exposes endpoints. Frontend never talks to the LLM directly.

**Prompt to give Antigravity:**
```
Create a backend API layer (Node/Express, or Vite's own API routes if using 
a meta-framework — otherwise a small standalone Express/Fastify server in 
/server) with these endpoints. Import types from /shared/types.ts — do not 
redefine request/response shapes locally.

- POST /api/analyze-reel — body: { reel_id }. Fetches reel content from 
  Supabase, calls the AI provider, returns AIAnalysisResult. 

- POST /api/infer-interest — body: { user_id }. Fetches the user's recent 
  interactions + associated reel content from Supabase, calls the AI 
  provider with the multi-reel session prompt, returns SessionInterestResult. 
  Writes the result into interest_profiles.

- POST /api/recommend — body: { user_id }. Runs the recommendation engine 
  (built in Phase 6) and returns a Recommendation object. Writes result into 
  recommendations table.

- GET /api/dashboard/:user_id — returns interest_profiles + recent 
  interactions for the Dashboard screen in one call (avoid the frontend 
  making 3 separate round trips).

Create /server/lib/ai-provider.ts as an abstraction: an interface 
AIProvider with methods analyzeReel() and inferSessionInterest(), and two 
implementations — OpenAIProvider and ClaudeProvider — selected via an 
env var (AI_PROVIDER=openai|claude). Every endpoint calls the abstraction, 
never a specific provider's SDK directly. This is what lets us swap 
providers later without touching the recommendation engine or endpoints.

Load API keys from environment variables only (.env, not committed). Add 
.env.example with placeholder keys. Confirm no API key string appears 
anywhere in /src (frontend) — grep for it if needed.
```

**Definition of Done:** Frontend build has zero references to `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`; all 4 endpoints respond with mock/stub data even before Phase 5 wires up real prompts.

---

## Phase 4.5 — Video storage + live interaction tracking

**Goal:** Live watchable reels feed backend support and interaction recording.

**Prompt to give Antigravity:**
```
Extend the backend and schema to support a real, watchable Reels feed:

1. Add video_url and duration_seconds to the reels table (per schema addition). 
   Update the seed script to reference actual video file paths in Supabase Storage.

2. Build GET /api/feed/:user_id — returns an ordered list of Reels for the 
   feed. Composition logic:
   - Default: a mix of candidate reels the user hasn't interacted with yet
   - If a recommendation exists for this user in the recommendations table 
     (from a prior /api/recommend call), inject that recommended reel into 
     the feed at a natural position (e.g. 4th-5th position, not first — 
     feels earned, not forced) and flag it with is_recommended: true in the 
     response so the frontend can show the "Recommended for you" label
   - Don't repeat a reel the user has already fully watched (watch_percentage 
     > 90) in the same session

3. Build POST /api/interactions — body: { user_id, reel_id, watch_percentage, 
   liked, saved, shared }. Called by the frontend video player:
   - On pause, on scroll-away (swipe to next), or on unmount — whichever 
     happens first — send the current playback position as watch_percentage 
     (position_seconds / duration_seconds * 100)
   - Like/Save/Share buttons trigger immediate writes (don't wait for 
     scroll-away) so those signals aren't lost if the user backs out fast
   - Upsert on (user_id, reel_id) — if the user rewatches a reel, update the 
     existing interaction row rather than creating duplicates, keeping the 
     MAX watch_percentage seen across plays

4. Confirm this endpoint writes to the same interactions table that 
   /api/infer-interest (Phase 5) reads from — no schema drift, reuse the 
   Interaction type from shared/types.ts.

Test: watch reel 1-4 in the feed (or simulate via direct POST calls with 
the trap sequence's watch percentages), then call /api/infer-interest and 
confirm it now works from real interaction rows instead of only seed data.
```

**Definition of Done:** `GET /api/feed/:user_id` delivers ranked/interspersed feed reels with recommendation flags; `POST /api/interactions` accurately upserts playback and action metrics.

---

## Phase 5 — AI analysis pipeline (prompts + validation)

**Goal:** Real prompts, structured JSON output, validated before storage.

**Prompt to give Antigravity:**
```
Implement the two AI calls inside ai-provider.ts:

1. analyzeReel(reel) — single-reel semantic analysis. System prompt should 
   instruct the model to return ONLY JSON matching AIAnalysisResult: 
   topics, context, intent, tech_relevance, educational_value, hype_level, 
   reasoning. Explicitly instruct: do not keyword-match, infer the 
   underlying subject even if the format is a joke/meme/vlog.

2. inferSessionInterest(reels[], interactions[]) — multi-reel inference. 
   System prompt must include the trap-avoidance instruction: reason 
   across ALL reels in the session as a pattern, not the most recent or 
   most frequent keyword. Include the worked example from our earlier 
   prompt design (Java meme + SWE vlog + interview joke + laptop 
   comparison → "Software Engineering / Technology", not "Java") as a 
   calibration example in the system prompt. Must return ONLY JSON 
   matching SessionInterestResult.

For both, after receiving the response:
- Strip markdown code fences if present before JSON.parse
- Validate the parsed object against the expected shape (use zod or a 
  manual type guard) — if validation fails, retry once with a stricter 
  "return ONLY valid JSON, no other text" instruction, then throw a typed 
  error if it fails again
- Never store or return unvalidated AI output

Wire these into the /api/analyze-reel and /api/infer-interest endpoints 
from Phase 4, replacing the stub responses.
```

**Definition of Done:** Calling `/api/infer-interest` on the seeded demo user (trap scenario) returns `detected_interest` close to "Software Engineering / Technology" — not "Java" — with evidence citing multiple reels, not just one.

---

## Phase 6 — Recommendation engine

**Goal:** Retrieve + rank candidate reels, penalize hype, produce the structured output block.

**Prompt to give Antigravity:**
```
Implement the recommendation engine in /server/lib/recommend.ts:

1. Retrieval: query candidate reels (is_candidate = true) whose category or 
   topics semantically relate to the user's current top interest_profiles 
   entry. Start broad (don't filter only to the exact category string — 
   "Software Engineering / Technology" should retrieve DSA, HLD, Java, 
   Career, WebDev candidates, not just an exact "Software Engineering" tag).

2. Ranking: score each candidate using a weighted formula combining:
   - semantic interest match (how well it relates to detected interest — 
     can reuse the AI provider for a lightweight relevance score, or use 
     category/topic overlap as a first pass)
   - educational_value (from seed data)
   - technical relevance
   - difficulty suitability (match user's inferred level; default 
     Intermediate if unknown)
   - diversity bonus (penalize recommending the same category as reels 
     already in the user's recent interaction history — this is what 
     stops "another Java reel")
   - hype penalty (subtract score proportional to hype_score; a reel with 
     hype_score > 70 should almost never rank first even if categorically 
     relevant)

3. Output: build the Recommendation object and also return the required 
   structured text block:
   CURRENT REEL / INTEREST DETECTED / WHY / RECOMMENDED TECH REEL / 
   CATEGORY / WHY THIS RECOMMENDATION / DIFFICULTY / CONFIDENCE
   
   WHY and WHY THIS RECOMMENDATION should be generated by the AI provider 
   (short, evidence-citing, in the product's mono/evidence voice per 
   design.md), not hardcoded templates.

Wire into /api/recommend. Write the result to the recommendations table.

Test against the seeded trap scenario and confirm the top-ranked result is 
an HLD/System Design or DSA reel — not another Java reel, and not the 
seeded hype reel ("10 AI tools that will get you hired in 2026") even 
though it's career-adjacent.
```

**Definition of Done:** Running the trap scenario end-to-end returns a non-Java, non-hype recommendation with a populated 8-field structured output.

---

## Phase 7 — Frontend integration (UI stays as-is, just wire it up)

**Goal:** Connect existing Stitch components to real endpoints. No redesign.

**Prompt to give Antigravity:**
```
Using the existing Stitch-generated components identified in Phase 0, wire 
each screen to its backend endpoint. Do not change layout, colors, type, or 
component structure from the Stitch design — only add data-fetching, 
loading states, error states, and empty states.

- Dashboard: call GET /api/dashboard/:user_id on mount. Show interest cards 
  and recent interactions from real data. "Analyze My Activity" button 
  calls POST /api/infer-interest, then refetches dashboard data.

- Reels Feed: call GET /api/feed/:user_id on mount. Render full-bleed 
  swipeable/scrollable video player with minimalist UI chrome.
  - Wire onTimeUpdate/onPause/onEnded and swipe-to-next events to POST /api/interactions
  - Like/Save/Share buttons call POST /api/interactions immediately
  - Show "Recommended for you" label when is_recommended is true
  - After new recommendation is generated, refetch feed to surface the recommended reel

- Reel Analysis: on selecting a reel from Dashboard, call POST 
  /api/analyze-reel for that reel, render topic/context/evidence/confidence 
  into the existing evidence-styled components (mono/teal per design.md).

- AI Recommendation: call POST /api/recommend, render the 8-field 
  structured output into the existing recommendation screen components. 
  "Watch This Reel" opens source_url or jumps to the Reel in the feed.

- Interest Profile: render interest_profiles data into the existing grid 
  cards with the mono confidence score + bar indicator.

For every screen: add a loading state (skeleton or spinner matching 
existing design tokens, not a generic spinner), an error state (plain-
language message, retry action), and an empty state (e.g. "no interactions 
yet" before first analysis — matching the interface's voice, not a generic 
"no data" message).

Confirm responsive behavior is unchanged from the original Stitch export at 
mobile/tablet/desktop breakpoints after wiring in real data (real data can 
be longer/shorter than mock data — check text overflow in evidence blocks 
especially).
```

**Definition of Done:** All 5 screens render real Supabase-backed data through the unmodified Stitch visual design; loading/error/empty states exist on each.

---

## Phase 8 — End-to-end demo + QA pass

**Goal:** Confirm the closed-loop trap scenario works as a scripted demo, and do a final pass.

**Prompt to give Antigravity:**
```
Run through this exact demo script and confirm each step works:
1. Log in as the seeded demo user
2. Open Reels Feed — scroll through and actually watch reels 1-4 (Java 
   meme, SWE vlog, interview joke, laptop comparison) — real watch % is 
   captured as you go
3. Go to Dashboard — "Analyze My Activity" now runs against real watched 
   data, not seed rows
4. Interest Profile updates to show "Software Engineering / Technology" as 
   the top interest
5. AI Recommendation screen surfaces the HLD/System Design reel, not 
   another Java reel, not the hype reel
6. Return to Reels Feed — the recommended reel now appears in the feed with 
   the "Recommended for you" label — the loop is visibly closed

Then do a final QA pass:
- Test on empty state (new user, zero interactions)
- Test error state (temporarily break the AI provider call, confirm the UI 
  shows a real error, not a blank screen or crash)
- Confirm no console errors, no API keys in network tab requests from the 
  browser, no unhandled promise rejections
- Confirm mobile layout at 375px width for all 5 screens

Report back a pass/fail on each of the above.
```

**Definition of Done:** The closed-loop trap scenario demo runs cleanly end-to-end, QA checklist passes.
