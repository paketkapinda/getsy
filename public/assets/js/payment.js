import { supabase } from './supabaseClient.js';

/* ================================
   INIT
================================ */
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

/* ================================
   LOAD PAYMENTS
================================ */
async function loadPayments() {
  const container = document.getElementById('payments-container');
  if (!container) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', user.id)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Payments load error:', error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p>No payments found</p>`;
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
            <td>${Number(p.amount).toFixed(2)} ${p.currency}</td>
            <td>${p.status}</td>
            <td>${new Date(p.payment_date).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/* ================================
   SYNC
================================ */
async function syncPayments() {
  try {
    const { error } = await supabase.functions.invoke(
      'sync-marketplace-payments'
    );
    if (error) throw error;
    await loadPayments();
  } catch (err) {
    console.error(err);
    alert('Payment sync failed');
  }
}
