// producers.js - Updated version
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

export async function loadProducers() {
  const container = document.getElementById('pod-providers-list');
  if (!container) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('producers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data.length === 0) {
      container.innerHTML = `
        <div class="settings-empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <div class="settings-empty-state-title">No POD providers added</div>
          <div class="settings-empty-state-description">Add your first POD provider to start selling</div>
        </div>
      `;
      return;
    }

    container.innerHTML = data.map(producer => `
      <div class="settings-list-item">
        <div class="settings-list-item-info">
          <div class="settings-list-item-name">
            ${producer.name}
            <span class="connection-status ${producer.is_active ? 'connected' : 'disconnected'}">
              ${producer.is_active ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
          <div class="settings-list-item-desc">
            ${producer.provider_type} · ${producer.is_active ? 'Active' : 'Inactive'}
            ${producer.created_at ? `· Added ${formatDate(producer.created_at)}` : ''}
          </div>
        </div>
        <div class="settings-list-item-actions">
          <button class="settings-btn settings-btn-outline" onclick="testProducer('${producer.id}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Test
          </button>
          <button class="settings-btn settings-btn-outline" onclick="connectProducer('${producer.id}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            Connect
          </button>
          <button class="settings-btn settings-btn-danger" onclick="removeProducer('${producer.id}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Remove
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading producers:', error);
    container.innerHTML = '<p class="text-sm text-red-300">Error loading POD providers</p>';
  }
}

// Connect producer
window.connectProducer = async (producerId) => {
  try {
    showNotification('Connecting to POD provider...', 'info');
    
    // Show connection progress
    const progressHTML = `
      <div class="connection-progress" style="position: fixed; top: 20px; right: 20px; background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 1000;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top: 2px solid #ea580c; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span>Connecting to POD provider...</span>
        </div>
      </div>
    `;
    
    const progressContainer = document.createElement('div');
    progressContainer.innerHTML = progressHTML;
    document.body.appendChild(progressContainer);

    // Simulate connection process
    setTimeout(async () => {
      const { error } = await supabase
        .from('producers')
        .update({ is_active: true })
        .eq('id', producerId);

      if (error) throw error;

      document.body.removeChild(progressContainer);
      showNotification('POD provider connected successfully', 'success');
      loadProducers();
    }, 2000);

  } catch (error) {
    console.error('Error connecting producer:', error);
    showNotification('Error connecting to POD provider', 'error');
  }
};
