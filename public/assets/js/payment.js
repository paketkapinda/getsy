// payment.js - Entegre Payment Management (Cost calculation + Payment tracking + Settings)
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';
import { formatCurrency, formatDate } from './helpers.js';

// ===== PAYMENT SETTINGS FUNCTIONS =====
export async function loadPaymentSettings() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      document.getElementById('wise-api-key').value = data.wise_api_key_encrypted || '';
      document.getElementById('payoneer-api-key').value = data.payoneer_api_key_encrypted || '';
      document.getElementById('bank-name').value = data.bank_name || '';
      document.getElementById('iban').value = data.iban || '';
      document.getElementById('swift-code').value = data.swift_code || '';
      document.getElementById('account-holder').value = data.account_holder_name || '';
    }
  } catch (error) {
    console.error('Error loading payment settings:', error);
    showNotification('Error loading payment settings', 'error');
  }
}

export function initPaymentSettings() {
  const form = document.getElementById('form-payment');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await savePaymentSettings();
  });
}

async function savePaymentSettings() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const wiseApiKey = document.getElementById('wise-api-key').value;
    const payoneerApiKey = document.getElementById('payoneer-api-key').value;
    const bankName = document.getElementById('bank-name').value;
    const iban = document.getElementById('iban').value;
    const swiftCode = document.getElementById('swift-code').value;
    const accountHolder = document.getElementById('account-holder').value;

    const { data, error } = await supabase
      .from('payment_settings')
      .upsert({
        user_id: user.id,
        wise_api_key_encrypted: wiseApiKey,
        payoneer_api_key_encrypted: payoneerApiKey,
        bank_name: bankName,
        iban: iban,
        swift_code: swiftCode,
        account_holder_name: accountHolder,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;

    showNotification('Payment settings saved successfully', 'success');
  } catch (error) {
    console.error('Error saving payment settings:', error);
    showNotification('Error saving payment settings', 'error');
  }
}



// ===== PAYMENT MANAGEMENT FUNCTIONS =====
window.syncAllPayments = async function() {
  try {
    showNotification('Syncing payments from Etsy...', 'info');
    
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/sync-etsy-payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Sync failed');
    
    const result = await response.json();
    showNotification(`Synced ${result.synced} payments from Etsy`, 'success');
    loadPayments();
    
  } catch (error) {
    console.error('Error syncing payments:', error);
    showNotification('Error syncing payments', 'error');
  }
};

window.processAllPayouts = async function() {
  try {
    showNotification('Processing all pending payouts...', 'info');
    
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

    // Gerçek payout işlemi burada yapılacak
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

// payments.js - Düzeltilmiş versiyon
async function fetchEtsyPayments() {
    try {
        const { data: etsyShop, error: shopError } = await supabase
            .from('etsy_shops')
            .select('api_key, shared_secret, shop_id')
            .eq('user_id', (await supabase.auth.getUser()).data.user.id)
            .single();

        if (shopError || !etsyShop) {
            showNotification('Etsy mağaza bilgileriniz bulunamadı.', 'error');
            return;
        }

        // Etsy API'den ödeme bilgilerini çek
        const response = await fetch('/api/etsy/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: etsyShop.api_key,
                shared_secret: etsyShop.shared_secret,
                shop_id: etsyShop.shop_id,
                limit: 50,
                offset: 0
            })
        });

        if (!response.ok) {
            throw new Error('Etsy API bağlantı hatası');
        }

        const paymentsData = await response.json();
        
        if (paymentsData.results && paymentsData.results.length > 0) {
            await processEtsyPayments(paymentsData.results);
            showNotification('Ödemeler başarıyla senkronize edildi.', 'success');
        } else {
            showNotification('Yeni ödeme bulunamadı.', 'info');
        }
    } catch (error) {
        console.error('Ödeme çekme hatası:', error);
        showNotification(`Ödeme çekme hatası: ${error.message}`, 'error');
    }
}

async function processEtsyPayments(etsyPayments) {
      for (const payment of etsyPayments) {
        // Ödeme zaten var mı kontrol et
        const { data: existing } = await supabase
            .from('payments')
            .select('id')
            .eq('etsy_payment_id', payment.payment_id)
            .single();

        if (!existing) {
            // Siparişi bul
            const { data: order } = await supabase
                .from('orders')
                .select('id, user_id, producer_id, total_amount')
                .eq('etsy_order_id', payment.receipt_id)
                .single();

            if (order) {
                // Ödemeyi kaydet
                await supabase.from('payments').insert({
                    user_id: order.user_id,
                    order_id: order.id,
                    producer_id: order.producer_id,
                    amount: payment.amount_gross.value,
                    producer_cost: payment.amount_fees.value,
                    platform_fee: calculatePlatformFee(payment.amount_gross.value),
                    payment_gateway_fee: payment.amount_fees.value,
                    net_payout: calculateNetPayout(payment),
                    status: payment.is_refund ? 'refunded' : 'completed',
                    settlement_date: new Date(payment.created_timestamp * 1000).toISOString(),
                    etsy_payment_id: payment.payment_id,
                    metadata: payment
                });
            }
        }
    }
}

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

    const costData = calculateCost(
      order.total_amount,
      producer.base_cost,
      producer.shipping_cost || order.shipping_cost
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        user_id: user.id,
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
        <div class="spinner" style="width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top: 3px solid #ea580c; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <p style="color: #6b7280; margin-top: 16px;">Loading payments...</p>
      </div>
    `;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      container.innerHTML = '<p style="color: #ef4444; text-align: center;">Please log in to view payments</p>';
      return;
    }

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
        <div style="text-align: center; padding: 3rem;">
          <div style="width: 64px; height: 64px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
            </svg>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 600; color: #111827; margin-bottom: 0.5rem;">No Payments Yet</h3>
          <p style="color: #6b7280; margin-bottom: 1.5rem;">Your payment records will appear here after orders are processed</p>
          <button class="settings-btn settings-btn-primary" onclick="syncAllPayments()">
            Sync Payments
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #111827;">${formatCurrency(calculateTotalRevenue(payments))}</div>
          <div style="font-size: 0.875rem; color: #6b7280;">Total Revenue</div>
        </div>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #ea580c;">${formatCurrency(calculatePendingPayouts(payments))}</div>
          <div style="font-size: 0.875rem; color: #6b7280;">Pending Payouts</div>
        </div>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">${formatCurrency(calculateCompletedPayouts(payments))}</div>
          <div style="font-size: 0.875rem; color: #6b7280;">Completed Payouts</div>
        </div>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #8b5cf6;">${calculateAverageMargin(payments)}%</div>
          <div style="font-size: 0.875rem; color: #6b7280;">Profit Margin</div>
        </div>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead style="background: #f9fafb;">
            <tr>
              <th style="padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Order ID</th>
              <th style="padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Customer</th>
              <th style="padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Amount</th>
              <th style="padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Net Payout</th>
              <th style="padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Status</th>
              <th style="padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Date</th>
              <th style="padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map(payment => `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 0.75rem 1rem;">
                  <div style="font-size: 0.875rem; font-weight: 500; color: #111827;">${payment.orders?.etsy_order_id || 'N/A'}</div>
                </td>
                <td style="padding: 0.75rem 1rem;">
                  <div style="font-size: 0.875rem; color: #374151;">${payment.orders?.customer_name || 'Unknown'}</div>
                </td>
                <td style="padding: 0.75rem 1rem;">
                  <div style="font-size: 0.875rem; font-weight: 600; color: #111827;">${formatCurrency(payment.amount)}</div>
                </td>
                <td style="padding: 0.75rem 1rem;">
                  <div style="font-size: 0.875rem; font-weight: 600; color: ${payment.net_payout > 0 ? '#10b981' : '#ef4444'};">${formatCurrency(payment.net_payout || 0)}</div>
                </td>
                <td style="padding: 0.75rem 1rem;">
                  <span style="display: inline-flex; align-items: center; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; 
                    ${payment.status === 'completed' ? 'background: #dcfce7; color: #166534;' : ''}
                    ${payment.status === 'pending' ? 'background: #fef3c7; color: #92400e;' : ''}
                    ${payment.status === 'processing' ? 'background: #dbeafe; color: #1e40af;' : ''}
                    ${payment.status === 'failed' ? 'background: #fee2e2; color: #991b1b;' : ''}">
                    ${payment.status}
                  </span>
                </td>
                <td style="padding: 0.75rem 1rem;">
                  <div style="font-size: 0.75rem; color: #6b7280;">${formatDate(payment.created_at)}</div>
                </td>
                <td style="padding: 0.75rem 1rem;">
                  <div style="display: flex; gap: 0.5rem;">
                    ${payment.status === 'pending' ? `
                      <button class="settings-btn settings-btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="processPayout('${payment.id}')">
                        Process
                      </button>
                    ` : ''}
                    <button class="settings-btn settings-btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="viewPaymentDetails('${payment.id}')">
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
      <div style="text-align: center; padding: 3rem;">
        <div style="width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 600; color: #111827; margin-bottom: 0.5rem;">Error Loading Payments</h3>
        <p style="color: #6b7280; margin-bottom: 1.5rem;">There was an error loading your payment data. Please try again.</p>
        <button class="settings-btn settings-btn-primary" onclick="loadPayments()">
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
    <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div class="modal-content" style="background: white; border-radius: 12px; padding: 0; min-width: 500px; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
        <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center;">
          <h3 class="modal-title" style="font-size: 1.25rem; font-weight: 600; color: #111827; margin: 0;">Payment Details</h3>
          <button class="modal-close" onclick="closePaymentModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <div style="display: grid; gap: 1.5rem;">
            <div>
              <h4 style="font-size: 1rem; font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Order Information</h4>
              <div style="display: grid; gap: 0.5rem;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.875rem; color: #6b7280;">Order ID:</span>
                  <span style="font-size: 0.875rem; font-weight: 500;">${payment.orders?.etsy_order_id || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.875rem; color: #6b7280;">Customer:</span>
                  <span style="font-size: 0.875rem; font-weight: 500;">${payment.orders?.customer_name || 'Unknown'}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.875rem; color: #6b7280;">Total Amount:</span>
                  <span style="font-size: 0.875rem; font-weight: 500;">${formatCurrency(payment.amount)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 style="font-size: 1rem; font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Cost Breakdown</h4>
              <div style="display: grid; gap: 0.5rem;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.875rem; color: #6b7280;">Producer Cost:</span>
                  <span style="font-size: 0.875rem; font-weight: 500;">${formatCurrency(payment.producer_cost || 0)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.875rem; color: #6b7280;">Platform Fee:</span>
                  <span style="font-size: 0.875rem; font-weight: 500;">${formatCurrency(payment.platform_fee || 0)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.875rem; color: #6b7280;">Gateway Fee:</span>
                  <span style="font-size: 0.875rem; font-weight: 500;">${formatCurrency(payment.payment_gateway_fee || 0)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid #e5e7eb;">
                  <span style="font-size: 0.875rem; font-weight: 600; color: #111827;">Net Payout:</span>
                  <span style="font-size: 0.875rem; font-weight: 700; color: #10b981;">${formatCurrency(payment.net_payout || 0)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 style="font-size: 1rem; font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Payment Status</h4>
              <div style="display: grid; gap: 0.5rem;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.875rem; color: #6b7280;">Status:</span>
                  <span style="display: inline-flex; align-items: center; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; 
                    ${payment.status === 'completed' ? 'background: #dcfce7; color: #166534;' : ''}
                    ${payment.status === 'pending' ? 'background: #fef3c7; color: #92400e;' : ''}
                    ${payment.status === 'processing' ? 'background: #dbeafe; color: #1e40af;' : ''}">
                    ${payment.status}
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.875rem; color: #6b7280;">Created:</span>
                  <span style="font-size: 0.875rem; font-weight: 500;">${formatDate(payment.created_at)}</span>
                </div>
                ${payment.settlement_date ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-size: 0.875rem; color: #6b7280;">Settlement Date:</span>
                    <span style="font-size: 0.875rem; font-weight: 500;">${formatDate(payment.settlement_date)}</span>
                  </div>
                ` : ''}
              </div>
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
    if (document.body.contains(modalContainer)) {
      document.body.removeChild(modalContainer);
    }
  };

  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      closePaymentModal();
    }
  });
}

// ===== INITIALIZATION =====
// Payment settings initialization
if (document.getElementById('form-payment')) {
  loadPaymentSettings();
  initPaymentSettings();
}

// Payment management initialization
if (document.getElementById('payments-container')) {
  loadPayments();
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .spinner {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(style);
