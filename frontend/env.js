// Environment variable injection for Vercel deployment
// Fetches Supabase credentials from Vercel serverless function and exposes as window globals

(function() {
  // Try to read from meta tags first (injected server-side)
  const urlMeta = document.querySelector('meta[name="supabase-url"]');
  const keyMeta = document.querySelector('meta[name="supabase-anon-key"]');
  
  if (urlMeta && keyMeta) {
    window.SUPABASE_URL = urlMeta.getAttribute('content');
    window.SUPABASE_ANON_KEY = keyMeta.getAttribute('content');
    window.__SUPABASE_ENV_LOADED__ = true;
    if (window.__SUPABASE_ENV_RESOLVE__) {
      window.__SUPABASE_ENV_RESOLVE__();
    }
    return;
  }

  // Create a promise that resolves when credentials are loaded
  window.__SUPABASE_ENV_PROMISE__ = new Promise((resolve, reject) => {
    window.__SUPABASE_ENV_RESOLVE__ = resolve;
    window.__SUPABASE_ENV_REJECT__ = reject;

    // Fetch from serverless function endpoint
    fetch('/api/env.js')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch env: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        window.SUPABASE_URL = data.SUPABASE_URL;
        window.SUPABASE_ANON_KEY = data.SUPABASE_ANON_KEY;
        window.__SUPABASE_ENV_LOADED__ = true;
        resolve();
      })
      .catch(err => {
        console.error('[env.js] Failed to load Supabase credentials:', err);
        console.warn(
          '[env.js] Make sure these are set in Vercel environment variables: ' +
          'SUPABASE_URL, SUPABASE_ANON_KEY (or VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)'
        );
        reject(err);
      });
  });
})();

