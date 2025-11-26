// Cost calculation UI + simulate/distribute payments

import { api } from './api.js';
import { showNotification } from './ui.js';
import { formatCurrency } from './helpers.js';

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
    const result = await api.post('/functions/v1/payments-distribute', {
      order_id: orderId,
      producer_id: producerId,
    });
    if (result.error) throw new Error(result.error);
    showNotification('Payment distributed successfully', 'success');
    return result;
  } catch (error) {
    console.error('Error distributing payment:', error);
    showNotification('Failed to distribute payment', 'error');
    return null;
  }
}

export function renderCostBreakdown(container, costData) {
  if (!container) return;
  container.innerHTML = `
    <div class="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div class="flex justify-between text-sm">
        <span class="text-slate-400">Base Price</span>
        <span class="font-medium">${formatCurrency(costData.basePrice)}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-slate-400">POD Cost</span>
        <span class="text-red-300">-${formatCurrency(costData.podCost)}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-slate-400">Shipping</span>
        <span class="text-red-300">-${formatCurrency(costData.shipping)}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-slate-400">Platform Fee (15%)</span>
        <span class="text-red-300">-${formatCurrency(costData.platformFee)}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-slate-400">Payment Gateway Fee (3%)</span>
        <span class="text-red-300">-${formatCurrency(costData.paymentFee)}</span>
      </div>
      <div class="border-t border-slate-800 pt-2">
        <div class="flex justify-between font-semibold">
          <span>Net Payout</span>
          <span class="text-emerald-300">${formatCurrency(costData.netPayout)}</span>
        </div>
      </div>
    </div>
  `;
}

