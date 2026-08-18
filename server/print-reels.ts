import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: reels, error } = await supabase.from('reels').select('*');
  if (error) {
    console.error('Reels query error:', error.message);
  } else {
    console.log('Reels rows in DB:');
    reels.forEach(r => {
      console.log(`- ID: ${r.id}`);
      console.log(`  Title: ${r.title}`);
      console.log(`  Video URL: ${r.video_url}`);
      console.log(`  Category: ${r.category}`);
      console.log(`  Format: ${r.format}`);
    });
  }
}

run();
