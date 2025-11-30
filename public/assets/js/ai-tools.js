// ai-tools.js - AI Tasarım Araçları Yönetimi
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

// Global function olarak tanımla - EXPORT ETME
window.loadAITools = async function() {
  try {
    console.log('🚀 AI Tools loading...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showNotification('Please log in to configure AI tools', 'error');
      return;
    }

    console.log('👤 User:', user.id);

    // Varsayılan AI araçları
    const defaultTools = [
      {
        id: 'openai-dalle',
        name: 'OpenAI DALL-E',
        provider: 'openai',
        is_active: false,
        api_key: '',
        config: { model: 'dall-e-3', size: '1024x1024' }
      },
      {
        id: 'openai-chatgpt',
        name: 'OpenAI ChatGPT',
        provider: 'openai', 
        is_active: false,
        api_key: '',
        config: { model: 'gpt-4' }
      },
      {
        id: 'stability-ai',
        name: 'Stability AI',
        provider: 'stability',
        is_active: false,
        api_key: '',
        config: { engine: 'stable-diffusion-xl' }
      },
      {
        id: 'midjourney',
        name: 'Midjourney',
        provider: 'midjourney',
        is_active: false,
        api_key: '',
        config: { version: '5.2' }
      }
    ];

    // Mevcut ayarları yükle
    const { data: existingTools, error } = await supabase
      .from('ai_tools')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('📊 Existing tools:', existingTools);

    // Eğer hiç kayıt yoksa, varsayılan araçları ekle
    if (!existingTools || existingTools.length === 0) {
      console.log('➕ Adding default AI tools...');
      
      for (const tool of defaultTools) {
        const { error: insertError } = await supabase
          .from('ai_tools')
          .insert({
            user_id: user.id,
            ...tool
          });
        
        if (insertError) {
          console.error('Error inserting tool:', insertError);
        }
      }
      console.log('✅ Default tools added');
    }

    showAIToolsModal();
  } catch (error) {
    console.error('❌ Error loading AI tools:', error);
    showNotification('Error loading AI tools configuration', 'error');
  }
};

function showAIToolsModal() {
  console.log('🎨 Showing AI Tools modal');
  
  const modalHTML = `
    <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-start; justify-content: center; z-index: 1000; padding-top: 2rem;">
      <div class="modal-content" style="background: white; border-radius: 12px; padding: 0; min-width: 600px; max-width: 800px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
        <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10;">
          <h3 class="modal-title" style="font-size: 1.25rem; font-weight: 600; color: #111827; margin: 0;">AI Design Tools</h3>
          <button class="modal-close" onclick="closeAIToolsModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <div class="settings-form">
            <div class="ai-tools-grid">
              <!-- AI Tools will be loaded here -->
              <div style="text-align: center; padding: 2rem;">
                <div class="spinner" style="width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top: 3px solid #ea580c; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="color: #6b7280; margin-top: 1rem;">Loading AI tools...</p>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="padding: 1.5rem; border-top: 1px solid #e5e7eb; display: flex; gap: 0.75rem; justify-content: flex-end;">
          <button class="settings-btn settings-btn-outline" onclick="closeAIToolsModal()">Cancel</button>
          <button class="settings-btn settings-btn-primary" onclick="saveAITools()">Save AI Tools Settings</button>
        </div>
      </div>
    </div>
  `;

  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);

  window.closeAIToolsModal = () => {
    console.log('🔒 Closing AI Tools modal');
    if (document.body.contains(modalContainer)) {
      document.body.removeChild(modalContainer);
    }
  };

  // Close modal when clicking outside
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      closeAIToolsModal();
    }
  });

  loadAIToolsList();
}

async function loadAIToolsList() {
  try {
    console.log('📋 Loading AI tools list...');
    const { data: { user } } = await supabase.auth.getUser();
    const { data: tools, error } = await supabase
      .from('ai_tools')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching tools:', error);
      throw error;
    }

    console.log('🛠️ Tools loaded:', tools);

    const container = document.querySelector('.ai-tools-grid');
    if (!container) {
      console.error('❌ AI tools container not found');
      return;
    }

    if (!tools || tools.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #6b7280;">
          <p>No AI tools configured</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tools.map(tool => `
      <div class="ai-tool-card ${tool.is_active ? 'active' : ''}" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; transition: all 0.3s ease; ${tool.is_active ? 'border-color: #ea580c; background-color: #fff7ed;' : ''}">
        <div class="ai-tool-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div class="ai-tool-info">
            <h4 class="ai-tool-name" style="margin: 0; font-size: 1rem; font-weight: 600;">${tool.name}</h4>
            <p class="ai-tool-provider" style="margin: 0; color: #6b7280; font-size: 0.875rem;">${tool.provider}</p>
          </div>
          <label class="toggle-switch" style="position: relative; display: inline-block; width: 44px; height: 24px;">
            <input type="checkbox" ${tool.is_active ? 'checked' : ''} 
                   onchange="toggleAITool('${tool.id}', this.checked)"
                   style="opacity: 0; width: 0; height: 0;">
            <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${tool.is_active ? '#ea580c' : '#ccc'}; transition: .4s; border-radius: 24px;">
              <span style="position: absolute; content: ''; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; transform: ${tool.is_active ? 'translateX(20px)' : 'translateX(0)'};"></span>
            </span>
          </label>
        </div>
        <div class="ai-tool-config">
          <div class="settings-form-group">
            <label class="settings-form-label">API Key</label>
            <input type="password" 
                   value="${tool.api_key || ''}"
                   placeholder="Enter API key"
                   class="settings-form-input api-key-input"
                   data-tool-id="${tool.id}"
                   style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
          </div>
          ${Object.entries(tool.config || {}).map(([key, value]) => `
            <div class="settings-form-group">
              <label class="settings-form-label">${key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <input type="text" 
                     value="${value}"
                     class="settings-form-input config-input"
                     data-tool-id="${tool.id}"
                     data-config-key="${key}"
                     style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    console.log('✅ AI tools list rendered');

  } catch (error) {
    console.error('❌ Error loading AI tools list:', error);
    const container = document.querySelector('.ai-tools-grid');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #ef4444;">
          <p>Error loading AI tools configuration</p>
          <button onclick="loadAIToolsList()" class="settings-btn settings-btn-outline" style="margin-top: 1rem;">Retry</button>
        </div>
      `;
    }
    showNotification('Error loading AI tools configuration', 'error');
  }
}

window.toggleAITool = async (toolId, isActive) => {
  try {
    console.log('🔄 Toggling AI tool:', toolId, isActive);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('ai_tools')
      .update({ is_active: isActive })
      .eq('id', toolId)
      .eq('user_id', user.id);

    if (error) throw error;

    showNotification(`${isActive ? 'Activated' : 'Deactivated'} AI tool`, 'success');
    
    // Reload the tools list to update UI
    loadAIToolsList();
  } catch (error) {
    console.error('❌ Error toggling AI tool:', error);
    showNotification('Error updating AI tool', 'error');
  }
};

window.saveAITools = async () => {
  try {
    console.log('💾 Saving AI tools...');
    const { data: { user } } = await supabase.auth.getUser();
    const apiKeyInputs = document.querySelectorAll('.api-key-input');
    const configInputs = document.querySelectorAll('.config-input');

    console.log('🔑 API keys to update:', apiKeyInputs.length);
    console.log('⚙️ Configs to update:', configInputs.length);

    // Update API keys
    for (const input of apiKeyInputs) {
      const toolId = input.dataset.toolId;
      const apiKey = input.value;

      console.log('Updating API key for tool:', toolId);

      const { error } = await supabase
        .from('ai_tools')
        .update({ api_key: apiKey })
        .eq('id', toolId)
        .eq('user_id', user.id);

      if (error) throw error;
    }

    // Update configs
    for (const input of configInputs) {
      const toolId = input.dataset.toolId;
      const configKey = input.dataset.configKey;
      const value = input.value;

      console.log('Updating config for tool:', toolId, configKey, value);

      // Get current config
      const { data: tool, error: fetchError } = await supabase
        .from('ai_tools')
        .select('config')
        .eq('id', toolId)
        .single();

      if (fetchError) throw fetchError;

      if (tool) {
        const updatedConfig = { ...tool.config, [configKey]: value };
        const { error: updateError } = await supabase
          .from('ai_tools')
          .update({ config: updatedConfig })
          .eq('id', toolId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }
    }

    console.log('✅ AI tools saved successfully');
    showNotification('AI tools settings saved successfully', 'success');
    window.closeAIToolsModal();
  } catch (error) {
    console.error('❌ Error saving AI tools:', error);
    showNotification('Error saving AI tools settings', 'error');
  }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('🏁 AI Tools module initialized');
  // Check if we're on settings page
  if (window.location.pathname.includes('settings.html')) {
    console.log('✅ AI Tools module ready on settings page');
    
    // Global function'ı kontrol et
    if (typeof window.loadAITools === 'function') {
      console.log('✅ loadAITools function is available globally');
    } else {
      console.error('❌ loadAITools function is NOT available globally');
    }
  }
});

// EXPORT SATIRINI SİLİYORUZ - BU SATIR HATAYA NEDEN OLUYOR
// export { loadAITools };
