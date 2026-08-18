import { AsyncLocalStorage } from 'async_hooks';
import { SupabaseClient } from '@supabase/supabase-js';

// Create a context storage for request-scoped Supabase clients
export const authContext = new AsyncLocalStorage<SupabaseClient>();

/**
 * Returns the request-scoped Supabase client if inside an active request,
 * otherwise returns null.
 */
export function getContextClient(): SupabaseClient | null {
  return authContext.getStore() || null;
}
