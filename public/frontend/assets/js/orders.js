// Order list, send to POD, tracking

import { supabase } from './supabaseClient.js';
import { api } from './api.js';
import { showNotification } from './ui.js';
import { formatCurrency, formatDate, formatDateTime, getStatusColor, getStatusLabel } from './helpers.js';

let currentOrders = [];

export async function loadOrders() {
  const container = document.getElementById('orders-list');
  const empty = document.getElementById('orders-empty');
  const statusFilter = document.getElementById('filter-status')?.value;

  if (!container) return;

  try {
    let query = supabase
      .from('orders')
      .select('*, products(*)')
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) throw error;

    currentOrders = data || [];

    if (currentOrders.length === 0) {
      container.classList.add('hidden');
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (empty) empty.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = currentOrders.map(order => `
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-bold text-gray-900">Order #${order.etsy_order_id || order.id.slice(0, 8)}</h3>
            <p class="text-sm text-gray-600 mt-1">${formatDateTime(order.created_at)}</p>
            <p class="text-sm text-gray-700 mt-1 font-medium">${order.customer_name || '—'}</p>
          </div>
          <div class="text-right">
            <p class="text-xl font-bold text-gray-900">${formatCurrency(order.total_amount || 0)}</p>
            <span class="mt-2 inline-block badge ${getStatusColor(order.status || 'pending')}">${getStatusLabel(order.status || 'pending')}</span>
          </div>
        </div>
        <div class="flex gap-3">
          <button
            onclick="window.location.href='/frontend/order-detail.html?id=${order.id}'"
            class="flex-1 btn-secondary text-sm py-2"
          >
            View Details
          </button>
          ${order.status === 'pending' || order.status === 'processing'
            ? `<button
                onclick="handleSendToPOD('${order.id}')"
                class="btn-primary text-sm py-2"
              >
                Send to POD
              </button>`
            : ''
          }
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading orders:', error);
    showNotification('Failed to load orders', 'error');
    container.innerHTML = '<p class="text-red-300">Error loading orders</p>';
  }
}

window.handleSendToPOD = async function(orderId) {
  if (!confirm('Send this order to POD provider?')) return;

  try {
    showNotification('Sending order to POD...', 'info');

    // Get producer_id from order or settings
    const result = await api.post('/functions/v1/pod-send-order', {
      order_id: orderId,
    });

    if (result.error) throw new Error(result.error);

    showNotification('Order sent to POD successfully', 'success');
    await loadOrders();
  } catch (error) {
    console.error('Error sending to POD:', error);
    showNotification('Failed to send order to POD', 'error');
  }
};

// Load order detail
export async function loadOrderDetail() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('id');
  if (!orderId) {
    window.location.href = '/frontend/orders.html';
    return;
  }

  const container = document.getElementById('order-detail-container');
  if (!container) return;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, products(*)')
      .eq('id', orderId)
      .single();

    if (error) throw error;

    container.innerHTML = `
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 class="mb-4 text-2xl font-semibold">Order #${data.etsy_order_id || data.id.slice(0, 8)}</h1>
        <div class="mb-6 grid gap-4 md:grid-cols-2">
          <div>
            <p class="text-sm text-slate-400">Status</p>
            <p class="mt-1"><span class="rounded px-2 py-0.5 text-xs ${getStatusColor(data.status || 'pending')}">${getStatusLabel(data.status || 'pending')}</span></p>
          </div>
          <div>
            <p class="text-sm text-slate-400">Total Amount</p>
            <p class="mt-1 text-lg font-semibold text-emerald-300">${formatCurrency(data.total_amount || 0)}</p>
          </div>
          <div>
            <p class="text-sm text-slate-400">Customer</p>
            <p class="mt-1">${data.customer_name || '—'}</p>
          </div>
          <div>
            <p class="text-sm text-slate-400">Created</p>
            <p class="mt-1">${formatDateTime(data.created_at)}</p>
          </div>
          ${data.tracking_number
            ? `<div>
                <p class="text-sm text-slate-400">Tracking Number</p>
                <p class="mt-1 font-mono text-sm">${data.tracking_number}</p>
              </div>`
            : ''
          }
        </div>
        <div class="mb-6">
          <h2 class="mb-3 text-lg font-semibold">Items</h2>
          <div class="space-y-2">
            ${data.items && data.items.length > 0
              ? data.items.map(item => `
                  <div class="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-medium">${item.product_title || 'Product'}</p>
                        <p class="text-sm text-slate-400">Quantity: ${item.quantity || 1}</p>
                      </div>
                      <p class="font-semibold">${formatCurrency(item.price || 0)}</p>
                    </div>
                  </div>
                `).join('')
              : '<p class="text-slate-400">No items</p>'
            }
          </div>
        </div>
        <div class="flex gap-3">
          ${data.status === 'pending' || data.status === 'processing'
            ? `<button
                onclick="handleSendToPOD('${data.id}')"
                class="rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400"
              >
                Send to POD
              </button>`
            : ''
          }
          <button
            onclick="window.location.href='/frontend/orders.html'"
            class="rounded-md border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
          >
            Back to Orders
          </button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading order:', error);
    container.innerHTML = '<p class="text-red-300">Error loading order</p>';
  }
}

// Initialize
if (document.getElementById('orders-list')) {
  loadOrders();
  const filterStatus = document.getElementById('filter-status');
  if (filterStatus) {
    filterStatus.addEventListener('change', loadOrders);
  }
}

if (document.getElementById('order-detail-container')) {
  loadOrderDetail();
}

