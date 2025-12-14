import { supabase } from './supabaseClient.js';

/* ======================================================
   UI EVENTS
====================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('payments-container');
  if (!container) return;

  document
    .getElementById('btn-sync-payments')
    ?.addEventListener('click', syncPayments);

  document
    .getElementById('btn-process-payouts')
    ?.addEventListener('click', () => {
      alert('Payout processing will be handled in Orders module');
    });

  loadPayments();
});

/* ======================================================
   SYNC (EDGE FUNCTION CALL)
====================================================== */
async function syncPayments() {
  try {
    console.log('🔄 Syncing payments (Edge)...');

    const { data, error } = await supabase.functions.invoke(
      'sync-marketplace-payments'
    );

    if (error) throw error;

    console.log('✅ Payments synced', data);
    await loadPayments();

  } catch (err) {
    console.error('❌ Payment sync failed', err);
    alert('Payment sync failed');
  }
}

/* ======================================================
   LOAD PAYMENTS (USER BASED)
====================================================== */
async function loadPayments() {
  const container = document.getElementById('payments-container');
  if (!container) return;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', user.id)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error(error);
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
}
