// ai-seo.js
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

export async function generateSEOContent(productId, type, title, context = '') {
  try {
    showNotification(`Generating ${type}...`, 'info');
    
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/ai-seo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: productId,
        type: type,
        title: title,
        context: context
      })
    });

    if (!response.ok) throw new Error('SEO generation failed');
    
    const result = await response.json();
    showNotification(`${type} generated successfully`, 'success');
    
    return result;
  } catch (error) {
    console.error('Error generating SEO content:', error);
    showNotification(`Error generating ${type}`, 'error');
  }
}

// Product formunda kullanım için
export function initSEOButtons() {
  // Description generation butonu
  const descBtn = document.getElementById('btn-generate-description');
  if (descBtn) {
    descBtn.addEventListener('click', async () => {
      const title = document.getElementById('product-title')?.value;
      if (!title) {
        showNotification('Please enter product title first', 'warning');
        return;
      }
      
      const result = await generateSEOContent('', 'description', title);
      if (result && result.description) {
        const descTextarea = document.getElementById('product-description');
        if (descTextarea) {
          descTextarea.value = result.description;
        }
      }
    });
  }

  // Tags generation butonu
  const tagsBtn = document.getElementById('btn-generate-tags');
  if (tagsBtn) {
    tagsBtn.addEventListener('click', async () => {
      const title = document.getElementById('product-title')?.value;
      if (!title) {
        showNotification('Please enter product title first', 'warning');
        return;
      }
      
      const result = await generateSEOContent('', 'tags', title);
      if (result && result.tags) {
        // Tags input'ını güncelle
        const tagsInput = document.getElementById('product-tags');
        if (tagsInput) {
          tagsInput.value = result.tags.join(', ');
        }
      }
    });
  }
}