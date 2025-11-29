// dashboard-payments.js
import { supabase } from './supabaseClient.js';
import { formatCurrency, formatDate } from './helpers.js';

export async function loadDashboardPayments() {
  await loadPaymentStats();
  await loadRecentPayments();
}

async function loadPaymentStats() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Son 30 günün ödemeleri
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: payments, error } = await supabase
      .from('payments')
      .select('amount, net_payout, status')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const pendingPayouts = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + parseFloat(p.net_payout || 0), 0);
    const completedPayouts = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.net_payout || 0), 0);

    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('pending-payouts').textContent = formatCurrency(pendingPayouts);
    document.getElementById('completed-payouts').textContent = formatCurrency(completedPayouts);
  } catch (error) {
    console.error('Error loading payment stats:', error);
  }
}

async function loadRecentPayments() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders (
          etsy_order_id,
          customer_name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    const container = document.getElementById('recent-payments-list');
    if (!container) return;

    if (!payments || payments.length === 0) {
      container.innerHTML = `
        <div class="empty-payments">
          <p>No payments yet</p>
          <small>Payments will appear here after orders are processed</small>
        </div>
      `;
      return;
    }

    container.innerHTML = payments.map(payment => `
      <div class="payment-item">
        <div class="payment-info">
          <div class="payment-order">Order #${payment.orders?.etsy_order_id?.slice(-8) || 'N/A'}</div>
          <div class="payment-customer">${payment.orders?.customer_name || 'Unknown'}</div>
        </div>
        <div class="payment-details">
          <div class="payment-amount">${formatCurrency(payment.amount)}</div>
          <div class="payment-status status-${payment.status}">${payment.status}</div>
          <div class="payment-date">${formatDate(payment.created_at)}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading recent payments:', error);
  }
}