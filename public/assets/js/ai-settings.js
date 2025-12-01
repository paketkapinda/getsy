// ai-settings.js - AI API Key Yönetimi
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

// AI API Key'leri yükle
export async function loadAIAPIKeys() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: apiKeys, error } = await supabase
      .from('ai_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (apiKeys) {
      document.getElementById('openai-api-key').value = apiKeys.openai_key_encrypted || '';
      document.getElementById('openrouter-api-key').value = apiKeys.openrouter_key_encrypted || '';
      document.getElementById('anthropic-api-key').value = apiKeys.anthropic_key_encrypted || '';
      document.getElementById('stability-api-key').value = apiKeys.stability_key_encrypted || '';
      document.getElementById('midjourney-api-key').value = apiKeys.midjourney_key_encrypted || '';
      
      // Aktif durumları yükle
      document.getElementById('openai-active').checked = apiKeys.openai_active || false;
      document.getElementById('openrouter-active').checked = apiKeys.openrouter_active || false;
      document.getElementById('anthropic-active').checked = apiKeys.anthropic_active || false;
      document.getElementById('stability-active').checked = apiKeys.stability_active || false;
      document.getElementById('midjourney-active').checked = apiKeys.midjourney_active || false;
      
      document.getElementById('encrypt-keys').checked = apiKeys.encrypt_keys !== false;
      
      updateActiveToolsCount();
    }
  } catch (error) {
    console.error('Error loading API keys:', error);
    showNotification('Error loading API keys', 'error');
  }
}

// AI API Key'leri kaydet
export async function saveAIAPIKeys() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const openaiKey = document.getElementById('openai-api-key').value;
    const openrouterKey = document.getElementById('openrouter-api-key').value;
    const anthropicKey = document.getElementById('anthropic-api-key').value;
    const stabilityKey = document.getElementById('stability-api-key').value;
    const midjourneyKey = document.getElementById('midjourney-api-key').value;
    
    const openaiActive = document.getElementById('openai-active').checked;
    const openrouterActive = document.getElementById('openrouter-active').checked;
    const anthropicActive = document.getElementById('anthropic-active').checked;
    const stabilityActive = document.getElementById('stability-active').checked;
    const midjourneyActive = document.getElementById('midjourney-active').checked;
    
    const encryptKeys = document.getElementById('encrypt-keys').checked;

    // Önce mevcut kaydı kontrol et
    const { data: existingKeys } = await supabase
      .from('ai_api_keys')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let result;
    if (existingKeys) {
      // UPDATE
      result = await supabase
        .from('ai_api_keys')
        .update({
          openai_key_encrypted: openaiKey,
          openrouter_key_encrypted: openrouterKey,
          anthropic_key_encrypted: anthropicKey,
          stability_key_encrypted: stabilityKey,
          midjourney_key_encrypted: midjourneyKey,
          openai_active: openaiActive,
          openrouter_active: openrouterActive,
          anthropic_active: anthropicActive,
          stability_active: stabilityActive,
          midjourney_active: midjourneyActive,
          encrypt_keys: encryptKeys,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    } else {
      // INSERT
      result = await supabase
        .from('ai_api_keys')
        .insert({
          user_id: user.id,
          openai_key_encrypted: openaiKey,
          openrouter_key_encrypted: openrouterKey,
          anthropic_key_encrypted: anthropicKey,
          stability_key_encrypted: stabilityKey,
          midjourney_key_encrypted: midjourneyKey,
          openai_active: openaiActive,
          openrouter_active: openrouterActive,
          anthropic_active: anthropicActive,
          stability_active: stabilityActive,
          midjourney_active: midjourneyActive,
          encrypt_keys: encryptKeys
        });
    }

    if (result.error) throw result.error;

    updateActiveToolsCount();
    showNotification('API keys saved successfully', 'success');
  } catch (error) {
    console.error('Error saving API keys:', error);
    showNotification('Error saving API keys', 'error');
  }
}

// Aktif araç sayısını güncelle
function updateActiveToolsCount() {
  const activeTools = [
    document.getElementById('openai-active').checked,
    document.getElementById('openrouter-active').checked,
    document.getElementById('anthropic-active').checked,
    document.getElementById('stability-active').checked,
    document.getElementById('midjourney-active').checked
  ].filter(Boolean).length;
  
  const statusElement = document.getElementById('active-tools-count');
  if (statusElement) {
    if (activeTools === 0) {
      statusElement.textContent = 'No active AI tools';
    } else {
      statusElement.textContent = `${activeTools} AI tool${activeTools > 1 ? 's' : ''} active`;
    }
  }
}

// AI bağlantılarını test et
export async function testAIConnections() {
  const testBtn = document.getElementById('btn-test-connections');
  const originalText = testBtn.innerHTML;
  
  // Butonu loading state'e getir
  testBtn.innerHTML = `
    <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top: 2px solid #ea580c; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></div>
    Testing Connections...
  `;
  testBtn.disabled = true;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: apiKeys, error } = await supabase
      .from('ai_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    const testResults = [];
    
    // OpenAI test
    if (apiKeys.openai_active && apiKeys.openai_key_encrypted) {
      try {
        const response = await fetch('/api/test-openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: apiKeys.openai_key_encrypted
          })
        });
        testResults.push({
          name: 'OpenAI',
          status: response.ok ? 'connected' : 'failed',
          message: response.ok ? 'Connection successful' : 'Connection failed'
        });
      } catch (error) {
        testResults.push({
          name: 'OpenAI',
          status: 'failed',
          message: 'Connection error'
        });
      }
    }
    
    // Diğer API'ler için benzer testler eklenebilir
    
    // Test sonuçlarını göster
    showTestResultsModal(testResults);
    
  } catch (error) {
    console.error('Error testing connections:', error);
    showNotification('Error testing connections', 'error');
  } finally {
    testBtn.innerHTML = originalText;
    testBtn.disabled = false;
  }
}

// Test sonuçlarını gösteren modal
function showTestResultsModal(results) {
  const modalHTML = `
    <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div class="modal-content" style="background: white; border-radius: 12px; padding: 0; min-width: 400px; max-width: 500px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
        <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
          <h3 class="modal-title" style="font-size: 1.25rem; font-weight: 600; color: #111827; margin: 0;">Connection Test Results</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${results.map(result => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px;">
                <div>
                  <div style="font-weight: 500;">${result.name}</div>
                  <div style="font-size: 0.75rem; color: #6b7280;">${result.message}</div>
                </div>
                <div style="padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; 
                  ${result.status === 'connected' ? 'background: #dcfce7; color: #166534;' : 'background: #fee2e2; color: #991b1b;'}">
                  ${result.status === 'connected' ? 'Connected' : 'Failed'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer" style="padding: 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end;">
          <button class="settings-btn settings-btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
      </div>
    </div>
  `;

  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);
}

// Aktif AI sağlayıcısını al
export async function getActiveAIProvider() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: apiKeys, error } = await supabase
      .from('ai_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) return null;

    // Öncelik sırasına göre aktif sağlayıcıyı döndür
    if (apiKeys.openai_active && apiKeys.openai_key_encrypted) {
      return { provider: 'openai', key: apiKeys.openai_key_encrypted };
    } else if (apiKeys.anthropic_active && apiKeys.anthropic_key_encrypted) {
      return { provider: 'anthropic', key: apiKeys.anthropic_key_encrypted };
    } else if (apiKeys.openrouter_active && apiKeys.openrouter_key_encrypted) {
      return { provider: 'openrouter', key: apiKeys.openrouter_key_encrypted };
    }

    return null;
  } catch (error) {
    console.error('Error getting active AI provider:', error);
    return null;
  }
}

// Sayfa yüklendiğinde aktif araç sayısını güncelle
document.addEventListener('DOMContentLoaded', function() {
  // Aktif araç değişikliklerini dinle
  const activeCheckboxes = [
    'openai-active',
    'openrouter-active',
    'anthropic-active',
    'stability-active',
    'midjourney-active'
  ];
  
  activeCheckboxes.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', updateActiveToolsCount);
    }
  });
});