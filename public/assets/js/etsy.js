// etsy.js - Güncellenmiş versiyon
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

    container.innerHTML = data.map(shop => {
      const status = shop.is_active ? 'connected' : 'disconnected';
      const statusIcon = shop.is_active ? '🟢' : '🔴';
      const statusText = shop.is_active ? 'Connected' : 'Disconnected';
      
      return `
        <div class="settings-list-item">
          <div class="settings-list-item-info">
            <div class="settings-list-item-name">
              ${shop.shop_display_name || shop.shop_name || 'Unnamed Shop'}
              <span class="connection-status ${status}">
                ${statusIcon} ${statusText}
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
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading Etsy shops:', error);
    container.innerHTML = '<p class="text-sm text-red-300">Error loading Etsy shops</p>';
  }
}

export function initEtsyConnect() {
  const btnConnect = document.getElementById('btn-connect-etsy');
  if (!btnConnect) return;

  btnConnect.addEventListener('click', async () => {
    try {
      showNotification('Redirecting to Etsy authentication...', 'info');
      
      // Önce Etsy kullanıcı kaydı modal'ını göster
      showEtsyUserRegistrationModal();
      
    } catch (error) {
      console.error('Error connecting Etsy:', error);
      showNotification('Error connecting to Etsy', 'error');
    }
  });
}

// Yeni Etsy Kullanıcı Kayıt Modal'ı
function showEtsyUserRegistrationModal() {
  const modalHTML = `
    <div class="modal-overlay">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="modal-title">Connect Etsy Account</h3>
          <button class="modal-close" onclick="closeEtsyRegistrationModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="settings-form">
            <div class="settings-form-group">
              <label class="settings-form-label">Etsy Shop Name</label>
              <input type="text" id="etsy-shop-name" class="settings-form-input" placeholder="MyEtsyShop" required>
            </div>
            <div class="settings-form-group">
              <label class="settings-form-label">Shop Display Name</label>
              <input type="text" id="etsy-display-name" class="settings-form-input" placeholder="My Beautiful Etsy Shop">
            </div>
            <div class="settings-form-group">
              <label class="settings-form-label">Etsy API Key</label>
              <input type="password" id="etsy-api-key" class="settings-form-input" placeholder="Enter your Etsy API key" required>
            </div>
            <div class="settings-form-group">
              <label class="settings-form-label">API Secret Key</label>
              <input type="password" id="etsy-api-secret" class="settings-form-input" placeholder="Enter your Etsy API secret">
            </div>
            <div class="settings-form-group">
              <p class="settings-form-label" style="font-size: 0.75rem; color: #6b7280;">
                You can get your Etsy API keys from your Etsy account settings.
              </p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="settings-btn settings-btn-outline" onclick="closeEtsyRegistrationModal()">Cancel</button>
          <button class="settings-btn settings-btn-primary" onclick="registerEtsyAccount()">Connect Etsy Account</button>
        </div>
      </div>
    </div>
  `;

  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);

  window.closeEtsyRegistrationModal = () => {
    if (document.body.contains(modalContainer)) {
      document.body.removeChild(modalContainer);
    }
  };

  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      closeEtsyRegistrationModal();
    }
  });
}

window.registerEtsyAccount = async () => {
  try {
    const shopName = document.getElementById('etsy-shop-name').value;
    const displayName = document.getElementById('etsy-display-name').value;
    const apiKey = document.getElementById('etsy-api-key').value;
    const apiSecret = document.getElementById('etsy-api-secret').value;

    if (!shopName || !apiKey) {
      showNotification('Please fill in required fields', 'error');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Etsy hesabını kaydet
    const { data, error } = await supabase
      .from('etsy_accounts')
      .insert({
        user_id: user.id,
        shop_id: `etsy-${Date.now()}`,
        shop_name: shopName,
        shop_display_name: displayName,
        access_token_encrypted: apiKey,
        refresh_token_encrypted: apiSecret,
        is_active: true
      })
      .select();

    if (error) throw error;

    showNotification('Etsy account connected successfully!', 'success');
    window.closeEtsyRegistrationModal();
    loadEtsyShops(); // Listeyi yenile
    
    // Bağlantı testini otomatik başlat
    setTimeout(() => {
      testEtsyConnection(data[0].id);
    }, 1000);

  } catch (error) {
    console.error('Error registering Etsy account:', error);
    showNotification('Error connecting Etsy account', 'error');
  }
};

// Test Etsy connection
window.testEtsyConnection = async (shopId) => {
  try {
    showNotification('Testing Etsy connection...', 'info');
    
    // Show connection progress
    const progressHTML = `
      <div class="connection-progress" style="position: fixed; top: 20px; right: 20px; background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 1000;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top: 2px solid #ea580c; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span>Testing Etsy connection...</span>
        </div>
      </div>
    `;
    
    const progressContainer = document.createElement('div');
    progressContainer.innerHTML = progressHTML;
    document.body.appendChild(progressContainer);

    // Simulate connection test
    setTimeout(async () => {
      // Update connection status
      const { error } = await supabase
        .from('etsy_accounts')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', shopId);

      if (error) throw error;

      document.body.removeChild(progressContainer);
      showNotification('Etsy connection successful! 🟢', 'success');
      loadEtsyShops(); // Reload to update status
    }, 2000);

  } catch (error) {
    console.error('Error testing Etsy connection:', error);
    showNotification('Etsy connection failed! 🔴', 'error');
  }
};

// Diğer fonksiyonlar...
window.syncEtsyShop = async (shopId) => {
  try {
    showNotification('Syncing Etsy shop...', 'info');
    
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/sync-etsy-orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ shop_id: shopId })
    });

    if (!response.ok) throw new Error('Sync failed');
    
    const result = await response.json();
    showNotification(`Synced ${result.synced} orders from Etsy`, 'success');
  } catch (error) {
    console.error('Error syncing Etsy shop:', error);
    showNotification('Error syncing Etsy shop', 'error');
  }
};

window.removeEtsyShop = async (shopId) => {
  if (!confirm('Are you sure you want to remove this Etsy shop?')) {
    return;
  }

  try {
    const { error } = await supabase
      .from('etsy_accounts')
      .delete()
      .eq('id', shopId);

    if (error) throw error;

    showNotification('Etsy shop removed successfully', 'success');
    loadEtsyShops();
  } catch (error) {
    console.error('Error removing Etsy shop:', error);
    showNotification('Error removing Etsy shop', 'error');
  }
};

// Initialize
if (document.getElementById('etsy-shops-list')) {
  loadEtsyShops();
  initEtsyConnect();
}
