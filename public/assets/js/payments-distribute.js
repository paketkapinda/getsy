// payments-distribute.js
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

export async function distributePayment(orderId, producerId) {
  try {
    showNotification('Calculating payment distribution...', 'info');
    
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/payments-distribute', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_id: orderId,
        producer_id: producerId
      })
    });

    if (!response.ok) throw new Error('Payment distribution failed');
    
    const result = await response.json();
    showNotification('Payment distributed successfully', 'success');
    
    showPaymentBreakdownModal(result.breakdown);
    return result;
  } catch (error) {
    console.error('Error distributing payment:', error);
    showNotification('Error distributing payment', 'error');
  }
}

function showPaymentBreakdownModal(breakdown) {
  const modalHTML = `
    <div class="modal-overlay">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="modal-title">Payment Breakdown</h3>
          <button class="modal-close" onclick="closePaymentModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="payment-breakdown">
            <div class="breakdown-item positive">
              <span class="label">Base Price</span>
              <span class="value">$${breakdown.base_price.toFixed(2)}</span>
            </div>
            <div class="breakdown-item negative">
              <span class="label">POD Cost</span>
              <span class="value">-$${breakdown.pod_cost.toFixed(2)}</span>
            </div>
            <div class="breakdown-item negative">
              <span class="label">Shipping</span>
              <span class="value">-$${breakdown.shipping.toFixed(2)}</span>
            </div>
            <div class="breakdown-item negative">
              <span class="label">Platform Fee</span>
              <span class="value">-$${breakdown.platform_fee.toFixed(2)}</span>
            </div>
            <div class="breakdown-item negative">
              <span class="label">Payment Gateway Fee</span>
              <span class="value">-$${breakdown.payment_gateway_fee.toFixed(2)}</span>
            </div>
            ${breakdown.wise_fee > 0 ? `
            <div class="breakdown-item negative">
              <span class="label">Wise Fee</span>
              <span class="value">-$${breakdown.wise_fee.toFixed(2)}</span>
            </div>
            ` : ''}
            ${breakdown.payoneer_fee > 0 ? `
            <div class="breakdown-item negative">
              <span class="label">Payoneer Fee</span>
              <span class="value">-$${breakdown.payoneer_fee.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="breakdown-item total">
              <span class="label">Net Payout</span>
              <span class="value">$${breakdown.net_payout.toFixed(2)}</span>
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