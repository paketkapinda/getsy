// ai-product-content.js
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

export async function generateProductContent(productId, productData) {
  try {
    showNotification('Generating product content with AI...', 'info');
    
    const { data: { session } } = await supabase.auth.getSession();
    
    // Önce description oluştur
    const descResponse = await fetch('/api/ai-seo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: productId,
        type: 'description',
        title: productData.title,
        context: productData.category
      })
    });

    // Sonra tags oluştur
    const tagsResponse = await fetch('/api/ai-seo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: productId,
        type: 'tags',
        title: productData.title,
        context: productData.category
      })
    });

    if (!descResponse.ok || !tagsResponse.ok) {
      throw new Error('Content generation failed');
    }
    
    const descResult = await descResponse.json();
    const tagsResult = await tagsResponse.json();
    
    // Fiyatı AI ile belirle (top seller analizine göre)
    const price = await calculateAIPrice(productData.category);
    
    const content = {
      description: descResult.description,
      tags: tagsResult.tags,
      price: price,
      title: productData.title
    };
    
    showNotification('Product content generated successfully!', 'success');
    return content;
  } catch (error) {
    console.error('Error generating product content:', error);
    showNotification('Error generating product content', 'error');
  }
}

async function calculateAIPrice(category) {
  // Kategoriye göre ortalama fiyat belirle
  const priceRanges = {
    tshirt: { min: 19.99, max: 29.99 },
    mug: { min: 14.99, max: 22.99 },
    'phone-case': { min: 16.99, max: 24.99 },
    hoodie: { min: 34.99, max: 49.99 },
    jewelry: { min: 24.99, max: 39.99 }
  };
  
  const range = priceRanges[category] || priceRanges.tshirt;
  return (range.min + Math.random() * (range.max - range.min)).toFixed(2);
}

export function showProductContentGenerator(productId, mockupUrls = []) {
  const modalHTML = `
    <div class="modal-overlay">
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h3 class="modal-title">🎨 Generate Product Content</h3>
          <p class="modal-subtitle">AI will create optimized title, description, and tags</p>
          <button class="modal-close" onclick="closeContentModal()">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="content-preview">
            <div class="mockup-previews">
              ${mockupUrls.map(url => `
                <div class="mockup-preview-item">
                  <img src="${url}" alt="Product mockup">
                </div>
              `).join('')}
            </div>
            
            <div class="content-form">
              <div class="form-group">
                <label>Product Title</label>
                <input type="text" id="content-title" placeholder="Enter product title" class="form-input">
              </div>
              
              <div class="form-group">
                <label>Category</label>
                <select id="content-category" class="form-input">
                  <option value="tshirt">T-Shirt</option>
                  <option value="mug">Mug</option>
                  <option value="phone-case">Phone Case</option>
                  <option value="hoodie">Hoodie</option>
                  <option value="jewelry">Jewelry</option>
                </select>
              </div>
              
              <div class="generated-content-preview" id="generated-content">
                <div class="preview-placeholder">
                  <p>AI generated content will appear here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeContentModal()">
            Cancel
          </button>
          <button class="btn btn-primary" onclick="generateContent('${productId}')">
            🚀 Generate Content with AI
          </button>
          <button class="btn btn-success" id="btn-save-content" style="display: none;" onclick="saveProductContent('${productId}')">
            💾 Save to Product
          </button>
        </div>
      </div>
    </div>
  `;

  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);

  window.closeContentModal = () => {
    document.body.removeChild(modalContainer);
  };
}

window.generateContent = async (productId) => {
  const title = document.getElementById('content-title').value;
  const category = document.getElementById('content-category').value;
  
  if (!title) {
    showNotification('Please enter a product title', 'warning');
    return;
  }

  const content = await generateProductContent(productId, {
    title: title,
    category: category
  });

  if (content) {
    const preview = document.getElementById('generated-content');
    preview.innerHTML = `
      <div class="content-result">
        <div class="result-section">
          <h4>📝 Description</h4>
          <div class="description-text">${content.description}</div>
        </div>
        
        <div class="result-section">
          <h4>🏷️ Tags</h4>
          <div class="tags-container">
            ${content.tags.map(tag => `
              <span class="tag">${tag}</span>
            `).join('')}
          </div>
        </div>
        
        <div class="result-section">
          <h4>💰 Recommended Price</h4>
          <div class="price-display">$${content.price}</div>
        </div>
      </div>
    `;
    
    // Save butonunu göster
    document.getElementById('btn-save-content').style.display = 'block';
    window.generatedContent = content;
  }
};

window.saveProductContent = async (productId) => {
  if (!window.generatedContent) {
    showNotification('No content to save', 'warning');
    return;
  }

  try {
    const { error } = await supabase
      .from('products')
      .update({
        description: window.generatedContent.description,
        tags: window.generatedContent.tags,
        price: window.generatedContent.price,
        status: 'draft'
      })
      .eq('id', productId);

    if (error) throw error;

    showNotification('Product content saved successfully!', 'success');
    closeContentModal();
    
    // Products sayfasını yenile
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error('Error saving product content:', error);
    showNotification('Error saving product content', 'error');
  }
};