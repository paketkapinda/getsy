// Orders CRUD and management - REAL MODE
import { supabase } from './supabaseClient.js';
import { showNotification, showLoading } from './ui.js';

let currentOrders = [];

export async function loadOrders() {
  const container = document.getElementById('orders-grid');
  const empty = document.getElementById('orders-empty');
  const statusFilter = document.getElementById('filter-status')?.value;
  const dateFilter = document.getElementById('filter-date')?.value;

  if (!container) return;

  showLoading(container);

  try {
    console.log('🔄 GERÇEK siparişler yükleniyor...');
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) {
      showNotification('Lütfen giriş yapın', 'error');
      return;
    }

    // GERÇEK SORGUNUZ - Tablonuzla tam uyumlu
    let query = supabase
      .from('orders')
      .select(`
        id,
        etsy_order_id,
        customer_name,
        customer_email,
        total_amount,
        status,
        items,
        shipping_address,
        tracking_number,
        shipped_at,
        delivered_at,
        created_at,
        updated_at
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    // Filtreler
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
      console.error('❌ Orders sorgu hatası:', error);
      showNotification('Siparişler yüklenirken hata oluştu', 'error');
      return;
    }

    console.log('✅ GERÇEK siparişler yüklendi:', data?.length || 0);
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
    console.error('❌ Orders yükleme hatası:', error);
    showNotification('Siparişler yüklenemedi', 'error');
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
          ${getStatusLabel(order.status)}
        </div>
      </div>
      
      <div class="order-content">
        <div class="order-meta">
          <div class="order-title">Sipariş #${order.etsy_order_id}</div>
          <div class="order-customer">${order.customer_name || 'Misafir Müşteri'}</div>
          <div class="order-date">${formatDate(order.created_at)}</div>
        </div>
        
        <div class="order-stats">
          <div class="order-stat">
            <span class="stat-label">Ürünler</span>
            <span class="stat-value">${order.items ? order.items.length : 0}</span>
          </div>
          <div class="order-stat">
            <span class="stat-label">Toplam</span>
            <span class="stat-value price">$${order.total_amount ? parseFloat(order.total_amount).toFixed(2) : '0.00'}</span>
          </div>
        </div>
        
        <div class="order-actions">
          <button class="btn btn-outline btn-sm btn-view-details" data-order-id="${order.id}">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            Detayları Gör
          </button>
          ${order.status === 'pending' ? `
            <button class="btn btn-primary btn-sm btn-process-order" data-order-id="${order.id}">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              İşleme Al
            </button>
          ` : ''}
          ${order.status === 'processing' ? `
            <button class="btn btn-secondary btn-sm btn-ship-order" data-order-id="${order.id}">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Kargola
            </button>
          ` : ''}
          ${order.tracking_number ? `
            <button class="btn btn-outline btn-sm btn-track-order" data-tracking="${order.tracking_number}">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Takip Et
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function bindOrderButtonEvents() {
  console.log('🔧 Buton eventleri bağlanıyor...');
  
  // Detayları Gör butonları
  document.querySelectorAll('.btn-view-details').forEach(button => {
    button.addEventListener('click', function() {
      const orderId = this.dataset.orderId;
      console.log('🎯 Detaylar tıklandı:', orderId);
      window.location.href = `/order-detail.html?id=${orderId}`;
    });
  });
  
  // İşleme Al butonları
  document.querySelectorAll('.btn-process-order').forEach(button => {
    button.addEventListener('click', async function() {
      const orderId = this.dataset.orderId;
      if (!confirm('Bu siparişi işleme almak istediğinizden emin misiniz?')) return;
      
      try {
        showNotification('Sipariş işleme alınıyor...', 'info');
        
        // GERÇEK update - Tablonuzla uyumlu
        const { error } = await supabase
          .from('orders')
          .update({ 
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (error) throw error;
        
        showNotification('Sipariş işleme alındı!', 'success');
        loadOrders(); // Sayfayı yenile
        
      } catch (error) {
        console.error('❌ İşleme hatası:', error);
        showNotification('İşlem başarısız', 'error');
      }
    });
  });
  
  // Kargola butonları
  document.querySelectorAll('.btn-ship-order').forEach(button => {
    button.addEventListener('click', async function() {
      const orderId = this.dataset.orderId;
      const trackingNumber = prompt('Kargo takip numarasını girin:');
      
      if (!trackingNumber) return;
      
      try {
        showNotification('Sipariş kargolanıyor...', 'info');
        
        // GERÇEK update - Tablonuzla uyumlu
        const { error } = await supabase
          .from('orders')
          .update({ 
            status: 'shipped',
            tracking_number: trackingNumber,
            shipped_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (error) throw error;
        
        showNotification('Sipariş kargolandı!', 'success');
        loadOrders(); // Sayfayı yenile
        
      } catch (error) {
        console.error('❌ Kargolama hatası:', error);
        showNotification('Kargolama başarısız', 'error');
      }
    });
  });
  
  // Takip Et butonları
  document.querySelectorAll('.btn-track-order').forEach(button => {
    button.addEventListener('click', function() {
      const trackingNumber = this.dataset.tracking;
      window.open(`https://tracking.com/?tracking=${trackingNumber}`, '_blank');
    });
  });
}

// Helper fonksiyonları...
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

function getStatusLabel(status) {
  const statusMap = {
    'pending': 'Bekliyor',
    'processing': 'İşleniyor',
    'shipped': 'Kargolandı',
    'delivered': 'Teslim Edildi',
    'cancelled': 'İptal Edildi'
  };
  return statusMap[status] || status;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Etsy Sync fonksiyonu
window.syncOrders = async function() {
  try {
    const syncBtn = document.getElementById('btn-sync-orders');
    if (syncBtn) syncBtn.classList.add('syncing');
    
    showNotification('Etsy siparişleri senkronize ediliyor...', 'info');
    
    // GERÇEK Etsy sync - Edge Function çağrısı
    const { data, error } = await supabase.functions.invoke('sync-etsy-orders');
    
    if (error) throw error;
    
    showNotification(`${data.synced_orders || 0} yeni sipariş eklendi`, 'success');
    loadOrders(); // Yeni siparişleri göster
    
  } catch (error) {
    console.error('❌ Etsy sync hatası:', error);
    showNotification('Etsy senkronizasyon hatası', 'error');
  } finally {
    const syncBtn = document.getElementById('btn-sync-orders');
    if (syncBtn) syncBtn.classList.remove('syncing');
  }
};

// Event listeners
export function initOrders() {
  const syncBtn = document.getElementById('btn-sync-orders');
  const emptySyncBtn = document.getElementById('btn-empty-sync-orders');
  const statusFilter = document.getElementById('filter-status');
  const dateFilter = document.getElementById('filter-date');

  if (syncBtn) {
    syncBtn.addEventListener('click', syncOrders);
  }

  if (emptySyncBtn) {
    emptySyncBtn.addEventListener('click', syncOrders);
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', loadOrders);
  }

  if (dateFilter) {
    dateFilter.addEventListener('change', loadOrders);
  }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Orders.js - GERÇEK MOD yüklendi');
  
  if (document.getElementById('orders-grid')) {
    loadOrders();
    initOrders();
  }
});
