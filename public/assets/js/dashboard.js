// dashboard.js'e bu kodu ekleyin
export async function loadDashboardPayments() {
  const container = document.getElementById('dashboard-payments');
  if (!container) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Son 30 günün ödemelerini getir
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        amount,
        net_payout,
        status,
        created_at
      `)
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalPayout = payments.reduce((sum, p) => sum + parseFloat(p.net_payout || 0), 0);
    const pendingCount = payments.filter(p => p.status === 'pending').length;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon revenue">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">$${totalRevenue.toFixed(2)}</div>
            <div class="stat-label">30-Day Revenue</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon payout">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">$${totalPayout.toFixed(2)}</div>
            <div class="stat-label">Net Payout</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon pending">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">${pendingCount}</div>
            <div class="stat-label">Pending Payouts</div>
          </div>
        </div>
      </div>
      
      ${payments.length > 0 ? `
        <div class="recent-payments">
          <h3>Recent Payments</h3>
          <div class="payments-list">
            ${payments.slice(0, 5).map(payment => `
              <div class="payment-item">
                <div class="payment-amount">$${payment.amount}</div>
                <div class="payment-status status-${payment.status}">${payment.status}</div>
                <div class="payment-date">${formatDate(payment.created_at)}</div>
              </div>
            `).join('')}
          </div>
          <a href="/payments.html" class="view-all-link">View All Payments →</a>
        </div>
      ` : ''}
    `;
  } catch (error) {
    console.error('Error loading dashboard payments:', error);
    container.innerHTML = '<p>Error loading payment data</p>';
  }
}