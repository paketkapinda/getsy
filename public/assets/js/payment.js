// Entegre Payment Management - Cost calculation + Payment tracking
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';
import { formatCurrency, formatDate } from './helpers.js';

// ===== COST CALCULATION FUNCTIONS =====
export function calculateCost(basePrice, podCost, shipping, platformFeePercent = 0.15, paymentGatewayFeePercent = 0.03) {
  const platformFee = basePrice * platformFeePercent;
  const paymentFee = basePrice * paymentGatewayFeePercent;
  const totalCost = podCost + shipping + platformFee + paymentFee;
  const netPayout = basePrice - totalCost;
  
  return {
    basePrice,
    podCost,
    shipping,
    platformFee,
    paymentFee,
    totalCost,
    netPayout,
  };
}

export async function distributePayment(orderId, producerId) {
  try {
    showNotification('Calculating payment distribution...', 'info');
    
    // Önce order ve producer bilgilerini al
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total_amount, shipping_cost')
      .eq('id', orderId)
      .single();

    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .select('base_cost, shipping_cost')
      .eq('id', producerId)
      .single();

    if (orderError || producerError) throw new Error('Order or producer not found');

    // Maliyet hesapla
    const costData = calculateCost(
      order.total_amount,
      producer.base_cost,
      producer.shipping_cost || order.shipping_cost
    );

    // Payments tablosuna kaydet
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        user_id: (await supabase.auth.getUser()).data.user.id,
        producer_id: producerId,
        amount: costData.basePrice,
        producer_cost: costData.podCost,
        platform_fee: costData.platformFee,
        payment_gateway_fee: costData.paymentFee,
        net_payout: costData.netPayout,
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    showNotification('Payment distributed successfully', 'success');
    return payment;
  } catch (error) {
    console.error('Error distributing payment:', error);
    showNotification('Failed to distribute payment', 'error');
    return null;
  }
}

export function renderCostBreakdown(container, costData) {
  if (!container) return;
  
  container.innerHTML = `
    <div class="cost-breakdown-card">
      <h4 class="cost-breakdown-title">Cost Breakdown</h4>
      <div class="cost-items">
        <div class="cost-item">
          <span class="cost-label">Base Price</span>
          <span class="cost-value positive">${formatCurrency(costData.basePrice)}</span>
        </div>
        <div class="cost-item">
          <span class="cost-label">POD Cost</span>
          <span class="cost-value negative">-${formatCurrency(costData.podCost)}</span>
        </div>
        <div class="cost-item">
          <span class="cost-label">Shipping</span>
          <span class="cost-value negative">-${formatCurrency(costData.shipping)}</span>
        </div>
        <div class="cost-item">
          <span class="cost-label">Platform Fee (15%)</span>
          <span class="cost-value negative">-${formatCurrency(costData.platformFee)}</span>
        </div>
        <div class="cost-item">
          <span class="cost-label">Payment Gateway Fee (3%)</span>
          <span class="cost-value negative">-${formatCurrency(costData.paymentFee)}</span>
        </div>
        <div class="cost-divider"></div>
        <div class="cost-item total">
          <span class="cost-label">Net Payout</span>
          <span class="cost-value total-amount">${formatCurrency(costData.netPayout)}</span>
        </div>
      </div>
    </div>
  `;
}

// ===== PAYMENT SETTINGS & TRACKING FUNCTIONS =====
export async function loadPaymentSettings() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Ödeme ayarlarını yükle (varsa)
    const { data, error } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      const wiseInput = document.getElementById('wise-api-key');
      const payoneerInput = document.getElementById('payoneer-api-key');
      
      if (wiseInput) wiseInput.value = data.wise_api_key || '';
      if (payoneerInput) payoneerInput.value = data.payoneer_api_key || '';
    }
  } catch (error) {
    console.error('Error loading payment settings:', error);
  }
}

export function initPaymentSettings() {
  const form = document.getElementById('form-payment');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const wiseApiKey = document.getElementById('wise-api-key')?.value || '';
    const payoneerApiKey = document.getElementById('payoneer-api-key')?.value || '';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Ödeme ayarlarını kaydet
      const { error } = await supabase
        .from('payment_settings')
        .upsert({
          user_id: user.id,
          wise_api_key: wiseApiKey,
          payoneer_api_key: payoneerApiKey,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      showNotification('Payment settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving payment settings:', error);
      showNotification('Error saving payment settings', 'error');
    }
  });
}

// Ödemeleri yükle (Dashboard ve Payments sayfası için)
export async function loadPayments() {
  const container = document.getElementById('payments-container');
  if (!container) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Payments tablosundan verileri çek (orders ve producers ile join)
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders (
          etsy_order_id,
          customer_name,
          total_amount,
          items
        ),
        producers (
          name,
          provider_type
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!payments || payments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
            </svg>
          </div>
          <h3 class="empty-title">No Payments Yet</h3>
          <p class="empty-description">Your payment records will appear here after orders are processed</p>
        </div>
      `;
      return;
    }

    // Payments grid'i oluştur
    container.innerHTML = `
      <div class="payments-stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Revenue</div>
          <div class="stat-value">${formatCurrency(calculateTotalRevenue(payments))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pending Payouts</div>
          <div class="stat-value">${formatCurrency(calculatePendingPayouts(payments))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Completed Payouts</div>
          <div class="stat-value">${formatCurrency(calculateCompletedPayouts(payments))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Profit Margin</div>
          <div class="stat-value">${calculateAverageMargin(payments)}%</div>
        </div>
      </div>

      <div class="payments-table-container">
        <table class="payments-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Net Payout</th>
              <th>Producer Cost</th>
              <th>Fees</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map(payment => `
              <tr>
                <td>
                  <div class="order-id">${payment.orders?.etsy_order_id || 'N/A'}</div>
                </td>
                <td>${payment.orders?.customer_name || 'Unknown'}</td>
                <td>
                  <div class="amount">${formatCurrency(payment.amount)}</div>
                  <div class="currency">${payment.currency}</div>
                </td>
                <td>
                  <div class="payout ${payment.net_payout > 0 ? 'positive' : ''}">
                    ${formatCurrency(payment.net_payout || 0)}
                  </div>
                </td>
                <td>
                  <div class="cost">${formatCurrency(payment.producer_cost || 0)}</div>
                </td>
                <td>
                  <div class="fees-breakdown">
                    ${payment.platform_fee ? `<div>Platform: ${formatCurrency(payment.platform_fee)}</div>` : ''}
                    ${payment.payment_gateway_fee ? `<div>Gateway: ${formatCurrency(payment.payment_gateway_fee)}</div>` : ''}
                  </div>
                </td>
                <td>
                  <span class="payment-status status-${payment.status}">
                    ${payment.status}
                  </span>
                </td>
                <td>
                  <div class="payment-date">
                    ${formatDate(payment.created_at)}
                  </div>
                </td>
                <td>
                  <div class="payment-actions">
                    ${payment.status === 'pending' ? `
                      <button class="btn btn-sm btn-primary" onclick="processPayout('${payment.id}')">
                        Process
                      </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline" onclick="viewPaymentDetails('${payment.id}')">
                      Details
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error('Error loading payments:', error);
    container.innerHTML = '<p class="error-message">Error loading payments</p>';
  }
}

// ===== DASHBOARD PAYMENTS =====
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

    const totalRevenue = calculateTotalRevenue(payments);
    const totalPayout = calculateCompletedPayouts(payments);
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
            <div class="stat-value">${formatCurrency(totalRevenue)}</div>
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
            <div class="stat-value">${formatCurrency(totalPayout)}</div>
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
                <div class="payment-amount">${formatCurrency(payment.amount)}</div>
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

// ===== HELPER FUNCTIONS =====
function calculateTotalRevenue(payments) {
  return payments.reduce((total, payment) => total + parseFloat(payment.amount || 0), 0);
}

function calculatePendingPayouts(payments) {
  return payments
    .filter(p => p.status === 'pending')
    .reduce((total, payment) => total + parseFloat(payment.net_payout || 0), 0);
}

function calculateCompletedPayouts(payments) {
  return payments
    .filter(p => p.status === 'completed')
    .reduce((total, payment) => total + parseFloat(payment.net_payout || 0), 0);
}

function calculateAverageMargin(payments) {
  const completedPayments = payments.filter(p => p.status === 'completed' && p.amount && p.producer_cost);
  if (completedPayments.length === 0) return 0;
  
  const totalMargin = completedPayments.reduce((total, payment) => {
    const margin = ((payment.amount - payment.producer_cost) / payment.amount) * 100;
    return total + margin;
  }, 0);
  
  return (totalMargin / completedPayments.length).toFixed(1);
}

// ===== GLOBAL FUNCTIONS =====
window.processPayout = async (paymentId) => {
  try {
    showNotification('Processing payout...', 'info');
    
    const { error } = await supabase
      .from('payments')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (error) throw error;

    // Simüle payout işlemi
    setTimeout(async () => {
      await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          settlement_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);
      
      showNotification('Payout completed successfully', 'success');
      loadPayments();
    }, 2000);

  } catch (error) {
    console.error('Error processing payout:', error);
    showNotification('Error processing payout', 'error');
  }
};

window.viewPaymentDetails = async (paymentId) => {
  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders (
          etsy_order_id,
          customer_name,
          customer_email,
          total_amount,
          items
        ),
        producers (
          name,
          provider_type
        )
      `)
      .eq('id', paymentId)
      .single();

    if (error) throw error;

    showPaymentDetailsModal(payment);
  } catch (error) {
    console.error('Error loading payment details:', error);
    showNotification('Error loading payment details', 'error');
  }
};

function showPaymentDetailsModal(payment) {
  const modalHTML = `
    <div class="modal-overlay">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="modal-title">Payment Details</h3>
          <button class="modal-close" onclick="closePaymentModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="payment-details-grid">
            <div class="detail-section">
              <h4>Order Information</h4>
              <div class="detail-item">
                <span class="detail-label">Order ID:</span>
                <span class="detail-value">${payment.orders?.etsy_order_id || 'N/A'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Customer:</span>
                <span class="detail-value">${payment.orders?.customer_name || 'Unknown'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Total Amount:</span>
                <span class="detail-value">${formatCurrency(payment.amount)} ${payment.currency}</span>
              </div>
            </div>

            <div class="detail-section">
              <h4>Cost Breakdown</h4>
              <div class="detail-item">
                <span class="detail-label">Producer Cost:</span>
                <span class="detail-value">${formatCurrency(payment.producer_cost || 0)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Platform Fee:</span>
                <span class="detail-value">${formatCurrency(payment.platform_fee || 0)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Gateway Fee:</span>
                <span class="detail-value">${formatCurrency(payment.payment_gateway_fee || 0)}</span>
              </div>
              <div class="detail-item total">
                <span class="detail-label">Net Payout:</span>
                <span class="detail-value">${formatCurrency(payment.net_payout || 0)}</span>
              </div>
            </div>

            <div class="detail-section">
              <h4>Payment Status</h4>
              <div class="detail-item">
                <span class="detail-label">Status:</span>
                <span class="payment-status status-${payment.status}">${payment.status}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Created:</span>
                <span class="detail-value">${formatDate(payment.created_at)}</span>
              </div>
              ${payment.settlement_date ? `
                <div class="detail-item">
                  <span class="detail-label">Settlement Date:</span>
                  <span class="detail-value">${formatDate(payment.settlement_date)}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);

  window.closePaymentModal = () => {
    document.body.removeChild(modalContainer);
  };
}

// ===== INITIALIZATION =====
if (document.getElementById('form-payment')) {
  loadPaymentSettings();
  initPaymentSettings();
}

if (document.getElementById('payments-container')) {
  loadPayments();
}

if (document.getElementById('dashboard-payments')) {
  loadDashboardPayments();
}

// Orders sayfasında cost breakdown gösterimi için
export function initOrderCostCalculation(orderId, totalAmount) {
  const costContainer = document.getElementById(`cost-breakdown-${orderId}`);
  if (!costContainer) return;

  // Varsayılan maliyetlerle hesaplama yap
  const podCost = totalAmount * 0.4; // %40 POD maliyeti
  const shipping = 5.00; // Varsayılan shipping
  
  const costData = calculateCost(totalAmount, podCost, shipping);
  renderCostBreakdown(costContainer, costData);
}