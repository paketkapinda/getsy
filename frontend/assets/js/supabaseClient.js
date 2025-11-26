// Supabase client initialisation for browser
// Uses anon key and URL from environment-style globals injected via script tags

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const supabaseUrl = window.SUPABASE_URL || window.env?.SUPABASE_URL;
const supabaseAnonKey = window.SUPABASE_ANON_KEY || window.env?.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabaseClient] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Login and API calls will fail.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});


