import { supabase } from './supabaseClient.js';

/* ======================================================
   PROVIDER HANDLER MAP
====================================================== */
const PAYMENT_PROVIDERS = {
  etsy: fetchEtsyPayments,
  amazon: fetchAmazonPayments,
  shopify: fetchShopifyPayments
};

/* ======================================================
   TOKEN HELPERS (ETSY)
====================================================== */
async function refreshEtsyTokenIfNeeded(integration) {
  if (integration.expires_at && new Date(integration.expires_at) > new Date()) {
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

  await supabase
    .from('integrations')
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

  let payments = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const res = await fetch(
      `https://api.etsy.com/v3/application/shops/${integration.shop_id}/payments?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) break;

    const json = await res.json();
    if (!json.results || json.results.length === 0) break;

    payments.push(...json.results);

    if (json.results.length < limit) break;
    offset += limit;
  }

  return payments;
}

async function fetchAmazonPayments() {
  console.warn('Amazon payments not implemented yet');
  return [];
}

async function fetchShopifyPayments() {
  console.warn('Shopify payments not implemented yet');
  return [];
}

/* ======================================================
   SAVE PAYMENTS
====================================================== */
async function savePayments(integration, payments) {
  for (const p of payments) {
    await supabase.from('payments').upsert({
      integration_id: integration.id,
      external_payment_id: p.payment_id || p.id,
      order_id: p.order_id || null,
      amount: p.amount?.value || p.amount || 0,
      currency: p.amount?.currency || 'USD',
      status: p.status || 'paid',
      payment_date: p.create_date || new Date().toISOString(),
      provider: integration.provider
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {

  // Payments sayfası değilse çık
  const paymentsContainer = document.getElementById('payments-container');
  if (!paymentsContainer) return;

  // Sync Payments
  const syncBtn = document.getElementById('btn-sync-payments');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.disabled = true;
      syncBtn.innerText = 'Syncing...';

      try {
        await window.syncAllPayments();
      } finally {
        syncBtn.disabled = false;
        syncBtn.innerText = 'Sync Payments';
      }
    });
  }

  // Process Payouts
  const processBtn = document.getElementById('btn-process-payouts');
  if (processBtn) {
    processBtn.addEventListener('click', () => {
      window.processAllPayouts();
    });
  }

  // İlk yüklemede tabloyu getir
  window.loadPayments();
});


/* ======================================================
   GLOBAL FUNCTIONS (HTML TARAFINDAN ÇAĞRILIR)
====================================================== */
window.syncAllPayments = async function () {
  console.log('🔄 Syncing payments...');

  const { data: integrations, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Integration fetch error', error);
    return;
  }

  for (const integration of integrations) {
    const handler = PAYMENT_PROVIDERS[integration.provider];
    if (!handler) continue;

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

  await window.loadPayments();
};

window.loadPayments = async function () {
  const container = document.getElementById('payments-container');

  // 🔐 EN KRİTİK SATIR – SAYFA PAYMENTS DEĞİLSE ÇIK
  if (!container) return;

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Payments load error', error);
    return;
  }

  container.innerHTML = `
    <table class="table payments-table">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Order</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(p => `
          <tr>
            <td>${p.provider}</td>
            <td>${p.order_id || '-'}</td>
            <td>${p.amount} ${p.currency}</td>
            <td>${p.status}</td>
            <td>${new Date(p.payment_date).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

window.processAllPayouts = function () {
  alert('Payout processing will be implemented next');
};


/* ======================================================
   AUTO LOAD (SADECE UYGUN SAYFADA)
====================================================== */
document.addEventListener('DOMContentLoaded', () => {
  window.loadPayments();
});
