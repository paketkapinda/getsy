// Supabase client initialisation for browser
// Uses anon key and URL from window globals injected by env.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

// Wait for env.js to load credentials if needed
async function waitForCredentials() {
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    return;
  }
  
  if (window.__SUPABASE_ENV_PROMISE__) {
    await window.__SUPABASE_ENV_PROMISE__;
  } else {
    // Wait a short time for env.js to load
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

await waitForCredentials();

const supabaseUrl = window.SUPABASE_URL;
const supabaseAnonKey = window.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabaseClient] Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
    'Make sure env.js is loaded before supabaseClient.js. ' +
    'Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment variables.'
  );
  throw new Error('Supabase credentials not loaded');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});


