// Entegre Payment Management - Cost calculation + Payment tracking
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';
import { formatCurrency, formatDate } from './helpers.js';

// ===== GLOBAL FUNCTIONS =====
window.syncAllPayments = async function() {
  try {
    showNotification('Syncing payments from Etsy...', 'info');
    
    // Simüle sync işlemi
    setTimeout(() => {
      showNotification('Payments synced successfully!', 'success');
      loadPayments(); // Sayfayı yenile
    }, 2000);
    
  } catch (error) {
    console.error('Error syncing payments:', error);
    showNotification('Error syncing payments', 'error');
  }
};

window.processAllPayouts = async function() {
  try {
    showNotification('Processing all pending payouts...', 'info');
    
    // Bekleyen tüm ödemeleri al
    const { data: { user } } = await supabase.auth.getUser();
    const { data: pendingPayments, error } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;

    if (!pendingPayments || pendingPayments.length === 0) {
      showNotification('No pending payouts to process', 'info');
      return;
    }

    // Tüm bekleyen ödemeleri işle
    for (const payment of pendingPayments) {
      await processPayout(payment.id);
    }

    showNotification(`Processed ${pendingPayments.length} payouts`, 'success');
    
  } catch (error) {
    console.error('Error processing payouts:', error);
    showNotification('Error processing payouts', 'error');
  }
};

window.processPayout = async function(paymentId) {
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

window.viewPaymentDetails = async function(paymentId) {
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

// ===== PAYMENT DISPLAY FUNCTIONS =====
export async function loadPayments() {
  const container = document.getElementById('payments-container');
  if (!container) return;

  try {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div class="loading-spinner"></div>
        <p style="color: #6b7280; margin-top: 16px;">Loading payments...</p>
      </div>
    `;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      container.innerHTML = '<p class="error-message">Please log in to view payments</p>';
      return;
    }

    // Payments tablosundan verileri çek
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
        <div class="payments-empty">
          <div class="empty-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
            </svg>
          </div>
          <h3 class="empty-title">No Payments Yet</h3>
          <p class="empty-description">Your payment records will appear here after orders are processed</p>
          <button class="btn btn-primary" onclick="syncAllPayments()">
            Sync Payments
          </button>
        </div>
      `;
      return;
    }

    // Payments grid'i oluştur
    container.innerHTML = `
      <div class="payments-stats-grid">
        <div class="stat-card">
          <div class="stat-value">${formatCurrency(calculateTotalRevenue(payments))}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatCurrency(calculatePendingPayouts(payments))}</div>
          <div class="stat-label">Pending Payouts</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatCurrency(calculateCompletedPayouts(payments))}</div>
          <div class="stat-label">Completed Payouts</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${calculateAverageMargin(payments)}%</div>
          <div class="stat-label">Profit Margin</div>
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
    container.innerHTML = `
      <div class="payments-empty">
        <div class="empty-icon" style="background: #fee2e2;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
        </div>
        <h3 class="empty-title">Error Loading Payments</h3>
        <p class="empty-description">There was an error loading your payment data. Please try again.</p>
        <button class="btn btn-primary" onclick="loadPayments()">
          Retry
        </button>
      </div>
    `;
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
                <span class="detail-value">${formatCurrency(payment.amount)} ${payment.currency || 'USD'}</span>
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
    if (modalContainer.parentNode) {
      document.body.removeChild(modalContainer);
    }
  };
}

// ===== INITIALIZATION =====
if (document.getElementById('payments-container')) {
  loadPayments();
}
