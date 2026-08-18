import { supabase, isSupabaseConfigured } from './db.js';
import { DEMO_USER, ALL_SEEDED_REELS, SEED_DEMO_INTERACTIONS } from './seed-data.js';

async function seed() {
  console.log('🚀 Starting TechScroll AI database seeding...');

  if (!isSupabaseConfigured || !supabase) {
    console.log('ℹ️ Supabase credentials not found or placeholder in .env. Local in-memory DB is initialized with 32 reels and demo interactions.');
    return;
  }

  console.log('📡 Connected to Supabase. Inserting seed data...');

  // 1. Seed Demo User
  const { error: userError } = await supabase
    .from('users')
    .upsert({ id: DEMO_USER.id, display_name: DEMO_USER.display_name }, { onConflict: 'id' });
  if (userError) console.error('User seed error:', userError);
  else console.log('✅ Demo user seeded.');

  // 2. Seed All Reels
  const { error: reelsError } = await supabase
    .from('reels')
    .upsert(ALL_SEEDED_REELS, { onConflict: 'id' });
  if (reelsError) console.error('Reels seed error:', reelsError);
  else console.log(`✅ ${ALL_SEEDED_REELS.length} reels seeded (8 interaction reels + ${ALL_SEEDED_REELS.length - 8} candidates).`);

  // 3. Seed Interactions
  const { error: interactionsError } = await supabase
    .from('interactions')
    .upsert(SEED_DEMO_INTERACTIONS, { onConflict: 'user_id,reel_id' });
  if (interactionsError) console.error('Interactions seed error:', interactionsError);
  else console.log('✅ 4 Trap sequence interactions seeded.');

  console.log('🎉 Seeding completed successfully!');
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
