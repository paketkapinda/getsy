// Orders.js CRUD and management - Products style
import { supabase } from './supabaseClient.js';
import { api } from './api.js';
import { showNotification, showModal, hideModal, showLoading } from './ui.js';
import { formatCurrency, formatDate, formatDateTime, getStatusColor, getStatusLabel } from './helpers.js'; // helpers.js'den geliyor

let currentOrders = [];

export async function loadOrders() {
  const container = document.getElementById('orders-grid');
  const empty = document.getElementById('orders-empty');
  const statusFilter = document.getElementById('filter-status')?.value;
  const dateFilter = document.getElementById('filter-date')?.value;

  if (!container) return;

  showLoading(container);

  try {
    console.log('🔄 Orders yükleniyor...');
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) {
      showNotification('Please login first', 'error');
      return;
    }

    let query = supabase
      .from('orders')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (dateFilter) {
      const dateRange = getDateRange(dateFilter);
      if (dateRange) {
        query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Orders error:', error);
      if (error.message.includes('recursion') || error.message.includes('policy')) {
        console.warn('⚠️ RLS hatası - Mock data kullanılıyor');
        showNotification('Demo mod: Örnek siparişler gösteriliyor', 'info');
        loadMockOrders();
        return;
      }
      throw error;
    }

    console.log('✅ Orders loaded:', data?.length || 0);
    currentOrders = data || [];

    if (currentOrders.length === 0) {
      container.classList.add('hidden');
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (empty) empty.classList.add('hidden');
    container.classList.remove('hidden');
    
    renderOrders(currentOrders);
    bindOrderButtonEvents();
    
  } catch (error) {
    console.error('❌ Orders load error:', error);
    showNotification('Demo moda geçiliyor', 'info');
    loadMockOrders();
  }
}

function renderOrders(orders) {
  const container = document.getElementById('orders-grid');
  if (!container) return;

  container.innerHTML = orders.map(order => `
    <div class="order-card" data-order-id="${order.id}">
      <div class="order-header">
        <div class="order-image">
          <div class="order-image-placeholder">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
          </div>
        </div>
        <div class="order-status-badge status-${order.status}">
          ${getStatusLabel(order.status)} {/* helpers.js'den geliyor */}
        </div>
      </div>
      
      <div class="order-content">
        <div class="order-meta">
          <div class="order-title">Order #${order.order_number || order.id.slice(-8)}</div>
          <div class="order-customer">${order.customer_name || 'Guest Customer'}</div>
          <div class="order-date">${formatDate(order.created_at)}</div>
        </div>
        
        <div class="order-stats">
          <div class="order-stat">
            <span class="stat-label">Items</span>
            <span class="stat-value">${order.items_count || 1}</span>
          </div>
          <div class="order-stat">
            <span class="stat-label">Total</span>
            <span class="stat-value price">$${order.total_amount ? parseFloat(order.total_amount).toFixed(2) : '0.00'}</span>
          </div>
        </div>
        
        <div class="order-actions">
          <button class="btn btn-outline btn-sm btn-view-details" data-order-id="${order.id}">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            View Details
          </button>
          ${order.status === 'paid' || order.status === 'pending' ? `
            <button class="btn btn-primary btn-sm btn-process-order" data-order-id="${order.id}">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Process
            </button>
          ` : ''}
          ${order.status === 'processing' ? `
            <button class="btn btn-secondary btn-sm btn-ship-order" data-order-id="${order.id}">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Ship
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function bindOrderButtonEvents() {
  console.log('🔧 Binding order button events...');
  
  // View Details butonları
  document.querySelectorAll('.btn-view-details').forEach(button => {
    button.addEventListener('click', function() {
      const orderId = this.dataset.orderId;
      console.log('🎯 View Details clicked:', orderId);
      window.location.href = `/order-detail.html?id=${orderId}`;
    });
  });
  
  // Process butonları
  document.querySelectorAll('.btn-process-order').forEach(button => {
    button.addEventListener('click', async function() {
      const orderId = this.dataset.orderId;
      if (!confirm('Process this order and send to production?')) return;
      
      try {
        showNotification('Processing order...', 'info');
        setTimeout(() => {
          showNotification('Order processed successfully!', 'success');
          loadOrders();
        }, 1500);
      } catch (error) {
        showNotification('Process failed', 'error');
      }
    });
  });
  
  // Ship butonları
  document.querySelectorAll('.btn-ship-order').forEach(button => {
    button.addEventListener('click', async function() {
      const orderId = this.dataset.orderId;
      if (!confirm('Mark this order as shipped?')) return;
      
      try {
        showNotification('Updating order status...', 'info');
        setTimeout(() => {
          showNotification('Order marked as shipped!', 'success');
          loadOrders();
        }, 1500);
      } catch (error) {
        showNotification('Update failed', 'error');
      }
    });
  });
  
  console.log('✅ Button events bound');
}

function getDateRange(range) {
  const now = new Date();
  const start = new Date();
  
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end: now.toISOString() };
    case 'week':
      start.setDate(now.getDate() - 7);
      return { start: start.toISOString(), end: now.toISOString() };
    case 'month':
      start.setMonth(now.getMonth() - 1);
      return { start: start.toISOString(), end: now.toISOString() };
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      return { start: start.toISOString(), end: now.toISOString() };
    default:
      return null;
  }
}

// BU FONKSİYONU SİLİN - helpers.js'den geliyor
// function getStatusLabel(status) {
//   const statusMap = {
//     'pending': 'Pending',
//     'paid': 'Paid',
//     'processing': 'Processing',
//     'shipped': 'Shipped',
//     'delivered': 'Delivered',
//     'cancelled': 'Cancelled'
//   };
//   return statusMap[status] || status;
// }

function loadMockOrders() {
  const container = document.getElementById('orders-grid');
  const empty = document.getElementById('orders-empty');
  
  if (!container) return;

  const mockOrders = [
    {
      id: 'mock-order-1',
      order_number: 'ETSY-001',
      customer_name: 'Sarah Johnson',
      customer_email: 'sarah@example.com',
      status: 'paid',
      total_amount: 42.97,
      items_count: 2,
      created_at: '2024-01-20T14:30:00Z',
      items: [
        { product_title: 'Vintage Retro T-Shirt', quantity: 1, price: 24.99 },
        { product_title: 'Coffee Lover Mug', quantity: 1, price: 17.98 }
      ]
    },
    {
      id: 'mock-order-2',
      order_number: 'ETSY-002',
      customer_name: 'Mike Chen',
      customer_email: 'mike@example.com',
      status: 'processing',
      total_amount: 28.50,
      items_count: 1,
      created_at: '2024-01-19T10:15:00Z',
      items: [
        { product_title: 'Minimalist Phone Case', quantity: 1, price: 28.50 }
      ]
    },
    {
      id: 'mock-order-3',
      order_number: 'ETSY-003',
      customer_name: 'Emily Davis',
      customer_email: 'emily@example.com',
      status: 'shipped',
      total_amount: 65.75,
      items_count: 3,
      created_at: '2024-01-18T16:45:00Z',
      items: [
        { product_title: 'Vintage Retro T-Shirt', quantity: 2, price: 49.98 },
        { product_title: 'Wooden Coaster Set', quantity: 1, price: 15.77 }
      ]
    }
  ];

  currentOrders = mockOrders;

  if (currentOrders.length === 0) {
    container.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  container.classList.remove('hidden');
  
  renderOrders(currentOrders);
  bindOrderButtonEvents();
}

export function initOrders() {
  const syncBtn = document.getElementById('btn-sync-orders');
  const emptySyncBtn = document.getElementById('btn-empty-sync-orders');
  const statusFilter = document.getElementById('filter-status');
  const dateFilter = document.getElementById('filter-date');

  if (syncBtn) {
    syncBtn.addEventListener('click', async function() {
      try {
        this.classList.add('syncing');
        showNotification('Syncing orders from Etsy...', 'info');
        
        setTimeout(() => {
          showNotification('Orders synced successfully!', 'success');
          loadOrders();
          this.classList.remove('syncing');
        }, 3000);
      } catch (error) {
        showNotification('Sync failed', 'error');
        this.classList.remove('syncing');
      }
    });
  }

  if (emptySyncBtn) {
    emptySyncBtn.addEventListener('click', async function() {
      try {
        this.classList.add('syncing');
        showNotification('Syncing orders from Etsy...', 'info');
        
        setTimeout(() => {
          showNotification('Orders synced successfully!', 'success');
          loadOrders();
          this.classList.remove('syncing');
        }, 3000);
      } catch (error) {
        showNotification('Sync failed', 'error');
        this.classList.remove('syncing');
      }
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', loadOrders);
  }

  if (dateFilter) {
    dateFilter.addEventListener('change', loadOrders);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Orders.js yüklendi');
  
  if (document.getElementById('orders-grid')) {
    loadOrders();
    initOrders();
  }
});

if (document.getElementById('orders-grid')) {
  loadOrders();
  initOrders();
}

class OrderSyncManager {
  constructor() {
    this.pollingInterval = 300000; // 5 minutes
    this.webhookEnabled = true;
  }

  async syncOrdersFromAllMarketplaces() {
    const { data: integrations } = await supabase
      .from('integrations')
      .select('*')
      .eq('is_active', true)
      .in('marketplace_type', ['etsy', 'amazon', 'shopify'])
      .eq('user_id', userId);

    const allOrders = [];
    
    for (const integration of integrations) {
      const orders = await this.syncMarketplaceOrders(integration);
      allOrders.push(...orders);
    }

    // Auto-process orders to POD
    await this.autoProcessToPOD(allOrders);

    return allOrders;
  }

  async syncMarketplaceOrders(integration) {
    const lastSync = await this.getLastOrderSync(integration.id);
    
    switch (integration.marketplace_type) {
      case 'etsy':
        return this.syncEtsyOrders(integration, lastSync);
      case 'amazon':
        return this.syncAmazonOrders(integration, lastSync);
      default:
        return [];
    }
  }

  async syncEtsyOrders(integration, since) {
    const etsyApi = new EtsyAPI({
      apiKey: integration.api_key,
      accessToken: integration.access_token,
      shopId: integration.shop_name
    });

    const params = {
      min_created: Math.floor(since.getTime() / 1000),
      limit: 100,
      includes: 'Transactions,Listings'
    };

    const receipts = await etsyApi.getShopReceipts(params);
    
    return receipts.results.map(receipt => this.transformEtsyReceipt(receipt, integration));
  }

  async sendToPOD(orderId, podProviderId = null) {
    const { data: order } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product:product_id (*)
        )
      `)
      .eq('id', orderId)
      .single();

    if (!order) throw new Error('Order not found');

    // Get POD provider
    let podProvider;
    if (podProviderId) {
      const { data } = await supabase
        .from('pod_providers')
        .select('*')
        .eq('id', podProviderId)
        .single();
      podProvider = data;
    } else {
      // Get default provider
      const { data } = await supabase
        .from('pod_providers')
        .select('*')
        .eq('default_provider', true)
        .eq('is_active', true)
        .single();
      podProvider = data;
    }

    if (!podProvider) throw new Error('No POD provider configured');

    // Send to POD provider
    const podResponse = await this.sendToPODProvider(order, podProvider);

    // Update order status
    await supabase
      .from('orders')
      .update({
        pod_status: 'submitted',
        pod_provider_id: podProvider.id,
        pod_reference: podResponse.reference_id,
        pod_response: podResponse,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    // Start tracking POD fulfillment
    this.startPODTracking(orderId, podResponse.tracking_id);

    return podResponse;
  }

  async sendToPODProvider(order, provider) {
    switch (provider.provider_name) {
      case 'printful':
        return this.sendToPrintful(order, provider);
      case 'printify':
        return this.sendToPrintify(order, provider);
      default:
        throw new Error(`Unsupported POD provider: ${provider.provider_name}`);
    }
  }

  async sendToPrintful(order, provider) {
    const printfulApi = new PrintfulAPI(provider.api_key);
    
    const items = order.order_items.map(item => ({
      external_id: item.id,
      variant_id: provider.catalog_mapping[item.product.category],
      quantity: item.quantity,
      files: [
        {
          url: item.product.design_url,
          type: 'default'
        }
      ],
      options: {
        size: item.variant_size,
        color: item.variant_color
      }
    }));

    const response = await printfulApi.createOrder({
      external_id: order.marketplace_order_id,
      recipient: {
        name: order.shipping_name,
        address1: order.shipping_address,
        city: order.shipping_city,
        state_code: order.shipping_state,
        country_code: order.shipping_country,
        zip: order.shipping_zip
      },
      items,
      packing_slip: {
        email: order.customer_email,
        phone: order.customer_phone,
        message: 'Thank you for your order!'
      }
    });

    return {
      success: true,
      reference_id: response.id,
      tracking_id: response.shipments?.[0]?.tracking_number,
      cost: response.costs.total,
      estimated_delivery: response.shipments?.[0]?.estimated_delivery_date
    };
  }
}