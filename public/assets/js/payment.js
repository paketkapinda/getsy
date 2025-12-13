import { supabase } from './supabaseClient.js';

/* ======================================================
   PROVIDER HANDLERS (TEK NOKTA)
====================================================== */

const PAYMENT_PROVIDERS = {
  etsy: fetchEtsyPayments,
  amazon: fetchAmazonPayments,
  shopify: fetchShopifyPayments
  // yeni kanal = buraya 1 satır
};

/* ======================================================
   TOKEN HELPERS (ETSY ÖRNEĞİ)
====================================================== */

async function refreshEtsyTokenIfNeeded(integration) {
  if (new Date(integration.expires_at) > new Date()) {
    return integration.access_token;
  }

  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: integration.client_id,
      refresh_token: integration.refresh_token
    })
  });

  if (!res.ok) throw new Error('ETSY_TOKEN_REFRESH_FAILED');

  const data = await res.json();

  await supabase.from('integrations')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000)
    })
    .eq('id', integration.id);

  return data.access_token;
}

/* ======================================================
   PROVIDER IMPLEMENTATIONS
====================================================== */

async function fetchEtsyPayments(integration) {
  const token = await refreshEtsyTokenIfNeeded(integration);
  let all = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const res = await fetch(
      `https://api.etsy.com/v3/application/shops/${integration.shop_id}/payments?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) break;

    const json = await res.json();
    if (!json.results?.length) break;

    all.push(...json.results);

    if (json.results.length < limit) break;
    offset += limit;
  }

  return all;
}

/* ---------- PLACEHOLDERS (NO CRASH) ---------- */

async function fetchAmazonPayments(integration) {
  console.warn('Amazon Payments not implemented yet');
  return [];
}

async function fetchShopifyPayments(integration) {
  console.warn('Shopify Payments not implemented yet');
  return [];
}

/* ======================================================
   SAVE PAYMENTS
====================================================== */

async function savePayments(integration, payments) {
  for (const p of payments) {
    await supabase.from('payments_raw').upsert({
      integration_id: integration.id,
      external_payment_id: p.payment_id || p.id,
      raw: p
    });

    await supabase.from('payments').upsert({
      integration_id: integration.id,
      external_payment_id: p.payment_id || p.id,
      order_id: p.order_id || p.order?.id,
      amount: p.amount?.value || p.amount || 0,
      currency: p.amount?.currency || p.currency || 'USD',
      status: p.status || 'paid',
      payment_date: p.create_date || p.created_at,
      provider: integration.provider
    });
  }
}

/* ======================================================
   MAIN SYNC (AUTO SCAN ACTIVE CHANNELS)
====================================================== */

async function syncPayments() {
  const { data: integrations } = await supabase
    .from('integrations')
    .select('*')
    .eq('is_active', true);

  for (const integration of integrations) {
    const handler = PAYMENT_PROVIDERS[integration.provider];

    if (!handler) {
      console.warn(`No payment handler for ${integration.provider}`);
      continue;
    }

    try {
      const payments = await handler(integration);
      await savePayments(integration, payments);
    } catch (err) {
      console.error(
        `Payment sync failed: ${integration.provider}`,
        err
      );
    }
  }

  await renderPayments();
}

/* ======================================================
   UI RENDER
====================================================== */

async function renderPayments() {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false });

  const tbody = document.getElementById('paymentsTable');
  tbody.innerHTML = '';

  data.forEach(p => {
    tbody.innerHTML += `
      <tr>
        <td>${p.provider}</td>
        <td>${p.order_id || '-'}</td>
        <td>${p.amount} ${p.currency}</td>
        <td>${p.status}</td>
        <td>${new Date(p.payment_date).toLocaleString()}</td>
      </tr>
    `;
  });
}

/* ======================================================
   EVENTS
====================================================== */

document.getElementById('syncPayments')
  ?.addEventListener('click', syncPayments);

renderPayments();
