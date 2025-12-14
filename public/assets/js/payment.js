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
   SYNC (EDGE)
================================ */
async function syncPayments() {
  try {
    console.log('🔄 Syncing payments (Edge)...');

    const { error } = await supabase.functions.invoke(
      'sync-marketplace-payments'
    );

    if (error) throw error;

    await loadPayments();

  } catch (err) {
    console.error('❌ Payment sync failed', err);
    alert('Payment sync failed');
  }
}

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
    container.innerHTML = `<p>No payments found.</p>`;
    return;
  }

  container.innerHTML = `
  <div class="payments-table-container">
    <table class="payments-table">
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
            <td>
              <span class="order-id">${p.order_id || '-'}</span>
            </td>
            <td class="amount">
              ${Number(p.amount).toFixed(2)} ${p.currency}
            </td>
            <td>
              <span class="payment-status status-${p.status}">
                ${p.status}
              </span>
            </td>
            <td class="payment-date">
              ${new Date(p.payment_date).toLocaleString()}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;

