// env.js - DÜZELTİLMİŞ VERSİYON
(function() {
  console.log('🔄 Environment variables yükleniyor...');

  // Doğrudan hardcoded değerleri kullan (zaten kodun içinde var)
  window.SUPABASE_URL = "https://pywffpqbbrjfcpzigepa.supabase.co";
  window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d2ZmcHFiYnJqZmNwemlnZXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxOTEzNDIsImV4cCI6MjA3OTc2NzM0Mn0.ivqA2wj3nS20i8AcKZSec_paQ99qqcw6YaeTZeVV2vo";
  window.__SUPABASE_ENV_LOADED__ = true;

  // Promise'i hemen resolve et
  if (window.__SUPABASE_ENV_RESOLVE__) {
    window.__SUPABASE_ENV_RESOLVE__();
  }

  console.log('✅ Environment variables başarıyla yüklendi!');
})();
