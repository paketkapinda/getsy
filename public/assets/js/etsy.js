// etsy.js - Updated version
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

export async function loadEtsyShops() {
  const container = document.getElementById('etsy-shops-list');
  if (!container) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('etsy_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data.length === 0) {
      container.innerHTML = `
        <div class="settings-empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <div class="settings-empty-state-title">No Etsy shops connected</div>
          <div class="settings-empty-state-description">Connect your first Etsy shop to get started</div>
        </div>
      `;
      return;
    }

    container.innerHTML = data.map(shop => `
      <div class="settings-list-item">
        <div class="settings-list-item-info">
          <div class="settings-list-item-name">
            ${shop.shop_display_name || shop.shop_name || 'Unnamed Shop'}
            <span class="connection-status ${shop.is_active ? 'connected' : 'disconnected'}">
              ${shop.is_active ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
          <div class="settings-list-item-desc">
            ${shop.shop_id} · ${shop.is_active ? 'Active' : 'Inactive'}
            ${shop.created_at ? `· Connected ${formatDate(shop.created_at)}` : ''}
          </div>
        </div>
        <div class="settings-list-item-actions">
          <button class="settings-btn settings-btn-outline" onclick="testEtsyConnection('${shop.id}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Test
          </button>
          <button class="settings-btn settings-btn-outline" onclick="syncEtsyShop('${shop.id}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Sync
          </button>
          <button class="settings-btn settings-btn-outline" onclick="showEtsyUserModal('${shop.id}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            User Info
          </button>
          <button class="settings-btn settings-btn-danger" onclick="removeEtsyShop('${shop.id}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Remove
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading Etsy shops:', error);
    container.innerHTML = '<p class="text-sm text-red-300">Error loading Etsy shops</p>';
  }
}

// Test Etsy connection
window.testEtsyConnection = async (shopId) => {
  try {
    showNotification('Testing Etsy connection...', 'info');
    
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/test-etsy-connection', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ shop_id: shopId })
    });

    if (!response.ok) throw new Error('Connection test failed');
    
    const result = await response.json();
    showNotification(result.connected ? 'Etsy connection successful' : 'Etsy connection failed', 
                    result.connected ? 'success' : 'error');
    
    // Reload to update status
    loadEtsyShops();
  } catch (error) {
    console.error('Error testing Etsy connection:', error);
    showNotification('Error testing Etsy connection', 'error');
  }
};

// Etsy User Info Modal
window.showEtsyUserModal = async (shopId) => {
  try {
    const { data: shop } = await supabase
      .from('etsy_accounts')
      .select('*')
      .eq('id', shopId)
      .single();

    if (!shop) {
      showNotification('Shop not found', 'error');
      return;
    }

    const modalHTML = `
      <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="modal-content" style="background: white; border-radius: 12px; padding: 0; min-width: 500px; max-width: 600px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
          <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center;">
            <h3 class="modal-title" style="font-size: 1.25rem; font-weight: 600; color: #111827; margin: 0;">Etsy User Information</h3>
            <button class="modal-close" onclick="closeEtsyUserModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">&times;</button>
          </div>
          <div class="modal-body" style="padding: 1.5rem;">
            <div class="settings-form">
              <div class="settings-form-group">
                <label class="settings-form-label">Shop ID</label>
                <input type="text" class="settings-form-input" value="${shop.shop_id}" readonly>
              </div>
              <div class="settings-form-group">
                <label class="settings-form-label">Shop Name</label>
                <input type="text" class="settings-form-input" value="${shop.shop_name || ''}" readonly>
              </div>
              <div class="settings-form-group">
                <label class="settings-form-label">Display Name</label>
                <input type="text" class="settings-form-input" value="${shop.shop_display_name || ''}" readonly>
              </div>
              <div class="settings-form-group">
                <label class="settings-form-label">Connection Status</label>
                <input type="text" class="settings-form-input" value="${shop.is_active ? 'Connected 🟢' : 'Disconnected 🔴'}" readonly>
              </div>
              <div class="settings-form-group">
                <label class="settings-form-label">Connected Since</label>
                <input type="text" class="settings-form-input" value="${formatDate(shop.created_at)}" readonly>
              </div>
            </div>
          </div>
          <div class="modal-footer" style="padding: 1.5rem; border-top: 1px solid #e5e7eb; display: flex; gap: 0.75rem; justify-content: flex-end;">
            <button class="settings-btn settings-btn-outline" onclick="closeEtsyUserModal()">Close</button>
            <button class="settings-btn settings-btn-primary" onclick="updateEtsyUserInfo('${shop.id}')">Update Info</button>
          </div>
        </div>
      </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    window.closeEtsyUserModal = () => {
      if (document.body.contains(modalContainer)) {
        document.body.removeChild(modalContainer);
      }
    };

    modalContainer.addEventListener('click', (e) => {
      if (e.target === modalContainer) {
        closeEtsyUserModal();
      }
    });

  } catch (error) {
    console.error('Error showing Etsy user modal:', error);
    showNotification('Error loading shop information', 'error');
  }
};
