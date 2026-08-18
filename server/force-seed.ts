import { createClient } from '@supabase/supabase-js';
import { ALL_SEEDED_REELS } from './seed-data.js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Database URL:', supabaseUrl);
  console.log('Seeding reels...');

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
    uploaded_by: null,
    created_at: r.created_at,
  }));

  const { error } = await supabase.from('reels').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('Seed error:', error.message);
  } else {
    console.log(`✓ Successfully seeded/upserted ${rows.length} reels!`);
  }
}

run();
