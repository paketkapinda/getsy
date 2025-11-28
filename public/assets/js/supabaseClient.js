// Supabase client initialisation for browser
// Uses anon key and URL from window globals injected by env.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

// Wait for env.js to load credentials if needed
async function waitForCredentials() {
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    return;
  }
  
  if (window.__SUPABASE_ENV_PROMISE__) {
    await window.__SUPABASE_ENV_PROMISE__;
  } else {
    // Wait a short time for env.js to load
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

await waitForCredentials();

const supabaseUrl = window.SUPABASE_URL;
const supabaseAnonKey = window.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabaseClient] Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
    'Make sure env.js is loaded before supabaseClient.js. ' +
    'Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment variables.'
  );
  throw new Error('Supabase credentials not loaded');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});

// Modal fonksiyonları - product-detail.js'ye ekle
function setupModal() {
  // Modal kapatma
  const modalClose = document.getElementById('modal-product-close');
  const cancelBtn = document.getElementById('btn-cancel-product');
  const modal = document.getElementById('modal-product');

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      hideModal('modal-product');
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      hideModal('modal-product');
    });
  }

  // Modal dışına tıklayınca kapat
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal('modal-product');
      }
    });
  }

  // Form submission
  const form = document.getElementById('form-product');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('product-id').value;
      const title = document.getElementById('product-title').value;
      const category = document.getElementById('product-category').value;
      const price = document.getElementById('product-price').value;
      const status = document.getElementById('product-status').value;
      const description = document.getElementById('product-description').value;

      if (!title || !category || !price) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }

      try {
        showNotification('Updating product...', 'info');
        
        const productData = {
          title,
          category,
          price: parseFloat(price),
          status: status || 'draft',
          description,
          updated_at: new Date().toISOString()
        };

        // Simüle edilmiş güncelleme
        setTimeout(() => {
          showNotification('Product updated successfully!', 'success');
          hideModal('modal-product');
          
          // Sayfayı yenile
          setTimeout(() => {
            loadProductDetail();
          }, 500);
          
        }, 1000);

      } catch (error) {
        console.error('❌ Update error:', error);
        showNotification('Update failed', 'error');
      }
    });
  }
}

// Modal gizleme fonksiyonu
function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Sayfa yüklendiğinde modal setup'ını da çağır
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Product Detail yüklendi');
  
  if (document.getElementById('product-detail-container')) {
    loadProductDetail();
    setupActionButtons();
    setupModal(); // Modal setup'ını ekledik
  }
});

