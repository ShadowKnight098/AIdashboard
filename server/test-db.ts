import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('URL:', supabaseUrl);
  
  // Query reels
  const { data: reels, error: reelsErr } = await supabase.from('reels').select('*').limit(2);
  console.log('Reels query error:', reelsErr);
  console.log('Reels count:', reels?.length);
  
  // Query profiles
  const { data: profiles, error: profsErr } = await supabase.from('profiles').select('*').limit(2);
  console.log('Profiles query error:', profsErr);
  console.log('Profiles count:', profiles?.length);

  // Query users (if exists)
  const { data: users, error: usersErr } = await supabase.from('users').select('*').limit(2);
  console.log('Users query error:', usersErr);
  console.log('Users count:', users?.length);
}

run();
