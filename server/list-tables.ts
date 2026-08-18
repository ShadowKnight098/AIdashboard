import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    // If RPC doesn't exist, try selecting from pg_class/pg_tables
    // Let's do a query using postgrest to list schemas
    console.log('RPC get_tables error:', error);
  } else {
    console.log('Tables:', data);
  }

  // Let's check if we can select from information_schema
  // Since Postgrest doesn't allow direct query of information_schema easily, let's try querying standard tables.
  const tables = ['users', 'reels', 'interactions', 'interest_profiles', 'recommendations', 'profiles'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`Table ${table}:`, error ? `Error: ${error.message}` : 'Exists');
  }
}

run();
