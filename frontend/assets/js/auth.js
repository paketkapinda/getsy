// auth.js
// Helpers for Supabase Auth flows and requiring login on pages.

import { supabase } from './supabaseClient.js';

export async function requireLogin() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/frontend/login.html';
    return;
  }
  return session;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/frontend/login.html';
}

/**
 * Load connected Etsy shops into a <select> element.
 * Relies on `etsy_accounts` table and RLS from ETSY PLATFORM.MD.
 */
export async function loadShopsIntoSelect(selectEl) {
  if (!selectEl) return;
  const { data, error } = await supabase.from('etsy_accounts').select('*').order('created_at');
  if (error) {
    console.warn('Failed to load etsy_accounts', error);
    return;
  }
  selectEl.innerHTML = '';
  for (const acc of data) {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = acc.shop_name || acc.shop_id || `Shop ${acc.id}`;
    selectEl.appendChild(opt);
  }
}


