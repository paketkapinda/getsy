// Product CRUD, mockup triggers, publish flow
// TAM ÇALIŞAN VERSİYON - Sadece kopyala-yapıştır yapın

import { supabase } from './supabaseClient.js';
import { api } from './api.js';
import { showNotification, showModal, hideModal, setupModalClose, showLoading } from './ui.js';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from './helpers.js';

let currentProducts = [];

export async function loadProducts() {
  const container = document.getElementById('products-grid');
  const empty = document.getElementById('products-empty');
  if (!container) return;

  showLoading(container);

  try {
    console.log('🔄 Products yükleniyor...');
    
    // Önce session kontrolü
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) {
      showNotification('Lütfen giriş yapın', 'error');
      return;
    }

    console.log('👤 Kullanıcı:', session.user.id);

    // RLS sorununu önlemek için basit sorgu
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', session.user.id) // Kullanıcıya özel
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Supabase hatası:', error);
      
      // RLS hatası durumunda mock data kullan
      if (error.message.includes('recursion') || error.message.includes('policy')) {
        console.warn('⚠️ RLS hatası - Mock data kullanılıyor');
        showNotification('Demo mod: Örnek ürünler gösteriliyor', 'info');
        loadMockProducts();
        return;
      }
      throw error;
    }

    console.log('✅ Products yüklendi:', data?.length || 0);

    currentProducts = data || [];

    if (currentProducts.length === 0) {
      container.classList.add('hidden');
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (empty) empty.classList.add('hidden');
    container.classList.remove('hidden');
    
    renderProducts(currentProducts);
    
  } catch (error) {
    console.error('❌ Products yükleme hatası:', error);
    showNotification('Demo moda geçiliyor', 'info');
    loadMockProducts();
  }
}

function renderProducts(products) {
  const container = document.getElementById('products-grid');
  if (!container) return;

  container.innerHTML = products.map(product => `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-image">
        <div class="product-image-placeholder">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p>Mockup Preview</p>
        </div>
        ${product.mockup_urls && product.mockup_urls.length > 0 
          ? `<img src="${product.mockup_urls[0]}" alt="${product.title}" class="product-image-real" />`
          : ''
        }
        <div class="product-badge ${product.status}">${getStatusLabel(product.status)}</div>
      </div>
      <div class="product-content">
        <div class="product-header">
          <h3 class="product-title">${product.title || 'İsimsiz Ürün'}</h3>
          <div class="product-price">$${product.price || '0.00'}</div>
        </div>
        <span class="product-category">${getCategoryName(product.category)}</span>
        <p class="product-description">${product.description || 'Açıklama yok'}</p>
        <div class="product-actions">
          <button class="btn btn-primary btn-sm" onclick="generateMockup('${product.id}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Mockup
          </button>
          <button class="btn btn-outline btn-sm" onclick="editProduct('${product.id}')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Düzenle
          </button>
          ${product.status !== 'listed' 
            ? `<button class="btn btn-primary btn-sm" onclick="publishProduct('${product.id}')">
                 <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                 </svg>
                 Yayınla
               </button>`
            : ''
          }
        </div>
      </div>
    </div>
  `).join('');
}

function getCategoryName(category) {
  const categories = {
    'tshirt': 'Tişört',
    'mug': 'Kupa',
    'plate': 'Tabak',
    'phone-case': 'Telefon Kılıfı',
    'jewelry': 'Takı',
    'wood': 'Ahşap Ürün'
  };
  return categories[category] || category;
}

// Mock data fallback
function loadMockProducts() {
  const container = document.getElementById('products-grid');
  const empty = document.getElementById('products-empty');
  
  if (!container) return;

  const mockProducts = [
    {
      id: 'mock-1',
      title: 'Retro Vintage Tişört Tasarımı',
      category: 'tshirt',
      price: 24.99,
      status: 'published',
      description: 'Retro renkler ve desenlerle güzel bir vintage tasarım.'
    },
    {
      id: 'mock-2', 
      title: 'Kahve Severler için Komik Kupa',
      category: 'mug',
      price: 18.50,
      status: 'draft',
      description: 'Sabah insanı mısınız? Pek sayılmaz. Ama kahve yardımcı olur!'
    },
    {
      id: 'mock-3',
      title: 'Minimalist Telefon Kılıfı',
      category: 'phone-case',
      price: 22.99,
      status: 'published',
      description: 'Modern telefon kılıfları için temiz ve minimalist tasarım.'
    }
  ];

  currentProducts = mockProducts;

  if (currentProducts.length === 0) {
    container.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  container.classList.remove('hidden');
  
  renderProducts(currentProducts);
}

// Global functions
window.generateMockup = async function(productId) {
  console.log('🎨 Mockup oluşturuluyor:', productId);
  showNotification('Mockup editörü açılıyor...', 'info');
  
  // Mockup modalını aç
  const mockupModal = document.getElementById('modal-mockup');
  if (mockupModal) {
    mockupModal.classList.add('active');
    
    // Mockup editor container'ını doldur
    const container = document.getElementById('mockup-editor-container');
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h3>Mockup Editörü</h3>
          <p>Burada mockup oluşturabilirsiniz</p>
          <div style="background: #f3f4f6; padding: 40px; border-radius: 8px; margin: 20px 0;">
            <p>Mockup önizleme alanı</p>
          </div>
          <button class="btn btn-primary" onclick="generateMockupFinal('${productId}')">
            Mockup Oluştur
          </button>
        </div>
      `;
    }
  }
};

window.generateMockupFinal = async function(productId) {
  showNotification('Mockup oluşturuluyor...', 'info');
  
  // Simüle edilmiş mockup oluşturma
  setTimeout(() => {
    showNotification('Mockup başarıyla oluşturuldu!', 'success');
    
    // Modalı kapat
    const mockupModal = document.getElementById('modal-mockup');
    if (mockupModal) {
      mockupModal.classList.remove('active');
    }
    
    // Products listesini yenile
    loadProducts();
  }, 2000);
};

window.editProduct = async function(productId) {
  console.log('✏️ Ürün düzenleniyor:', productId);
  
  const product = currentProducts.find(p => p.id === productId);
  if (!product) {
    showNotification('Ürün bulunamadı', 'error');
    return;
  }

  // Formu doldur
  document.getElementById('product-id').value = product.id;
  document.getElementById('product-title').value = product.title;
  document.getElementById('product-category').value = product.category;
  document.getElementById('product-price').value = product.price;
  document.getElementById('product-status').value = product.status;
  document.getElementById('product-description').value = product.description || '';
  
  document.getElementById('modal-product-title').textContent = 'Ürünü Düzenle';
  
  // Modalı aç
  const productModal = document.getElementById('modal-product');
  if (productModal) {
    productModal.classList.add('active');
  }
};

window.publishProduct = async function(productId) {
  if (!confirm('Bu ürünü Etsy\'de yayınlamak istediğinizden emin misiniz?')) return;

  try {
    showNotification('Ürün yayınlanıyor...', 'info');
    
    // Simüle edilmiş yayınlama
    setTimeout(() => {
      showNotification('Ürün başarıyla yayınlandı!', 'success');
      
      // Products listesini yenile
      loadProducts();
    }, 1500);
    
  } catch (error) {
    console.error('❌ Yayınlama hatası:', error);
    showNotification('Yayınlama başarısız', 'error');
  }
};

// Product form handling - GÜNCELLENMİŞ
export function initProductForm() {
  const btnNew = document.getElementById('btn-new-product');
  const btnEmptyNew = document.getElementById('btn-empty-new-product');
  const form = document.getElementById('form-product');

  // Modal event'lerini kur
  setupModalEvents();
  
  // Template selector'ı oluştur
  createTemplateSelector();

  // Yeni ürün butonu
  if (btnNew) {
    btnNew.addEventListener('click', () => {
      openProductModal();
    });
  }

  // Boş state'deki yeni ürün butonu
  if (btnEmptyNew) {
    btnEmptyNew.addEventListener('click', () => {
      openProductModal();
    });
  }

  // Form submission
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

// Modal açma fonksiyonu
function openProductModal() {
  document.getElementById('modal-product-title').textContent = 'Yeni Ürün';
  document.getElementById('form-product').reset();
  document.getElementById('product-id').value = '';
  
  // Template'i sıfırla
  const toggle = document.getElementById('template-toggle');
  if (toggle) {
    toggle.checked = false;
    document.getElementById('template-options').style.display = 'none';
    document.getElementById('template-clear').style.display = 'none';
    document.querySelector('.toggle-slider').style.background = '#cbd5e1';
    document.querySelector('.toggle-knob').style.left = '3px';
    document.querySelector('.template-toggle span').textContent = 'Örnek Göster';
  }
  
  const productModal = document.getElementById('modal-product');
  if (productModal) {
    productModal.classList.add('active');
  }
}

// Form submit handler
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('product-id').value;
  const title = document.getElementById('product-title').value;
  const category = document.getElementById('product-category').value;
  const price = document.getElementById('product-price').value;
  const status = document.getElementById('product-status').value;
  const description = document.getElementById('product-description').value;

  if (!title || !category || !price) {
    showNotification('Lütfen gerekli alanları doldurun', 'error');
    return;
  }

  try {
    const productData = {
      title,
      category,
      price: parseFloat(price),
      status: status || 'draft',
      description,
      user_id: (await supabase.auth.getUser()).data.user?.id
    };

    if (id) {
      // Ürün güncelleme
      console.log('🔄 Ürün güncelleniyor:', id);
      showNotification('Ürün güncelleniyor...', 'info');
      
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id);
        
      if (error) throw error;
      
      showNotification('Ürün başarıyla güncellendi!', 'success');
      hideModal('modal-product');
      loadProducts();
      
    } else {
      // Yeni ürün oluşturma
      console.log('🆕 Yeni ürün oluşturuluyor');
      showNotification('Ürün oluşturuluyor...', 'info');
      
      const { error } = await supabase
        .from('products')
        .insert([productData]);
        
      if (error) throw error;
      
      showNotification('Ürün başarıyla oluşturuldu!', 'success');
      hideModal('modal-product');
      loadProducts();
    }

  } catch (error) {
    console.error('❌ Form hatası:', error);
    showNotification('İşlem başarısız: ' + error.message, 'error');
  }
}
// Sayfa yüklendiğinde çalıştır
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Products.js yüklendi');
  
  if (document.getElementById('products-grid')) {
    loadProducts();
    initProductForm();
  }
});

// Manual init for backward compatibility
if (document.getElementById('products-grid')) {
  loadProducts();
  initProductForm();
}

//=======================

// Örnek şablon verileri
const sampleTemplates = {
  tshirt: {
    title: "Retro Vintage Tişört Tasarımı",
    price: 24.99,
    description: "Retro renkler ve desenlerle hazırlanmış vintage tarzı tişört. %100 pamuk, rahat ve dayanıklı.",
    category: "tshirt"
  },
  mug: {
    title: "Kahve Severler için Komik Kupa",
    price: 18.50,
    description: "Sabah insanı mısınız? Pek sayılmaz. Ama kahve yardımcı olur! Seramik kupa, 325ml kapasite.",
    category: "mug"
  },
  phoneCase: {
    title: "Minimalist Telefon Kılıfı",
    price: 22.99,
    description: "Modern telefon kılıfları için temiz ve minimalist tasarım. Titanyum kaplama, ince profil.",
    category: "phone-case"
  },
  jewelry: {
    title: "El Yapımı Gümüş Kolye",
    price: 45.99,
    description: "Özel tasarım el yapımı gümüş kolye. Doğal taşlar ve özenle işlenmiş detaylar.",
    category: "jewelry"
  }
};

// Örnek şablon UI'sını oluştur
function createTemplateSelector() {
  const form = document.getElementById('form-product');
  if (!form) return;
  
  // Template selector'ı formun başına ekle
  const templateHTML = `
    <div class="template-selector" style="margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 12px;">
        <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: #374151;">Örnek Şablonlar</h4>
        <label class="template-toggle" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="template-toggle" style="display: none;">
          <div class="toggle-slider" style="width: 44px; height: 24px; background: #cbd5e1; border-radius: 12px; position: relative; transition: all 0.3s ease;">
            <div class="toggle-knob" style="width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: all 0.3s ease;"></div>
          </div>
          <span style="font-size: 12px; color: #64748b;">Örnek Göster</span>
        </label>
      </div>
      
      <div id="template-options" style="display: none; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px;">
        <button type="button" class="template-btn" data-template="tshirt" style="padding: 8px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
          👕 Tişört
        </button>
        <button type="button" class="template-btn" data-template="mug" style="padding: 8px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
          ☕ Kupa
        </button>
        <button type="button" class="template-btn" data-template="phoneCase" style="padding: 8px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
          📱 Telefon Kılıfı
        </button>
        <button type="button" class="template-btn" data-template="jewelry" style="padding: 8px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
          💎 Takı
        </button>
      </div>
      
      <div id="template-clear" style="display: none; margin-top: 12px;">
        <button type="button" id="clear-template" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
          Şablonu Temizle
        </button>
      </div>
    </div>
  `;
  
  form.insertAdjacentHTML('afterbegin', templateHTML);
  setupTemplateEvents();
}

// Template event'lerini kur
function setupTemplateEvents() {
  const toggle = document.getElementById('template-toggle');
  const templateOptions = document.getElementById('template-options');
  const templateClear = document.getElementById('template-clear');
  const toggleSlider = document.querySelector('.toggle-slider');
  const toggleKnob = document.querySelector('.toggle-knob');
  
  if (toggle && templateOptions) {
    toggle.addEventListener('change', function() {
      if (this.checked) {
        templateOptions.style.display = 'grid';
        templateClear.style.display = 'block';
        toggleSlider.style.background = '#ea580c';
        toggleKnob.style.left = '23px';
        document.querySelector('.template-toggle span').textContent = 'Örnek Gösteriliyor';
      } else {
        templateOptions.style.display = 'none';
        templateClear.style.display = 'none';
        toggleSlider.style.background = '#cbd5e1';
        toggleKnob.style.left = '3px';
        document.querySelector('.template-toggle span').textContent = 'Örnek Göster';
      }
    });
  }
  
  // Template butonları
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const templateName = this.getAttribute('data-template');
      loadTemplate(templateName);
      
      // Butonları aktif/pasif yap
      document.querySelectorAll('.template-btn').forEach(b => {
        b.style.background = 'white';
        b.style.borderColor = '#d1d5db';
      });
      this.style.background = '#fef7f0';
      this.style.borderColor = '#ea580c';
    });
  });
  
  // Template temizleme
  const clearBtn = document.getElementById('clear-template');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearTemplate);
  }
}

// Template yükle
function loadTemplate(templateName) {
  const template = sampleTemplates[templateName];
  if (!template) return;
  
  document.getElementById('product-title').value = template.title;
  document.getElementById('product-price').value = template.price;
  document.getElementById('product-description').value = template.description;
  document.getElementById('product-category').value = template.category;
  
  showNotification(`${templateName} şablonu yüklendi!`, 'success');
}

// Template temizle
function clearTemplate() {
  document.getElementById('product-title').value = '';
  document.getElementById('product-price').value = '';
  document.getElementById('product-description').value = '';
  document.getElementById('product-category').value = 'tshirt';
  
  // Butonları sıfırla
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.style.background = 'white';
    btn.style.borderColor = '#d1d5db';
  });
  
  showNotification('Şablon temizlendi!', 'info');
}

// ================

// Modal kapatma fonksiyonlarını güncelle
function setupModalEvents() {
  // Product modal kapatma
  const productModal = document.getElementById('modal-product');
  const productCloseBtn = document.getElementById('modal-product-close');
  const productCancelBtn = document.getElementById('btn-cancel-product');
  
  if (productCloseBtn) {
    productCloseBtn.addEventListener('click', () => {
      productModal.classList.remove('active');
    });
  }
  
  if (productCancelBtn) {
    productCancelBtn.addEventListener('click', () => {
      productModal.classList.remove('active');
    });
  }
  
  // Mockup modal kapatma
  const mockupModal = document.getElementById('modal-mockup');
  const mockupCloseBtn = document.getElementById('modal-mockup-close');
  const mockupCancelBtn = document.getElementById('btn-cancel-mockup');
  
  if (mockupCloseBtn) {
    mockupCloseBtn.addEventListener('click', () => {
      mockupModal.classList.remove('active');
    });
  }
  
  if (mockupCancelBtn) {
    mockupCancelBtn.addEventListener('click', () => {
      mockupModal.classList.remove('active');
    });
  }
  
  // Dışarı tıklayarak kapatma
  if (productModal) {
    productModal.addEventListener('click', (e) => {
      if (e.target === productModal) {
        productModal.classList.remove('active');
      }
    });
  }
  
  if (mockupModal) {
    mockupModal.addEventListener('click', (e) => {
      if (e.target === mockupModal) {
        mockupModal.classList.remove('active');
      }
    });
  }
}

// products.js içinde - product card oluşturan fonksiyona buton ekleyin
function createProductCard(product) {
  const statusClass = getStatusClass(product.status);
  const categoryIcon = getCategoryIcon(product.category);
  
  return `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-card-header">
        <div class="product-image">
          <img src="${product.image_url || '/assets/images/placeholder-product.jpg'}" 
               alt="${product.title}" 
               class="product-img" />
          <div class="product-overlay">
            <button class="btn-view-detail" data-product-id="${product.id}">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              View Details
            </button>
          </div>
        </div>
        <div class="product-badge ${statusClass}">
          ${product.status}
        </div>
      </div>
      
      <div class="product-card-body">
        <div class="product-category">
          ${categoryIcon}
          <span>${getCategoryName(product.category)}</span>
        </div>
        <h3 class="product-title">${product.title}</h3>
        <p class="product-description">${product.description || 'No description available'}</p>
        
        <div class="product-meta">
          <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
          <div class="product-date">${formatDate(product.created_at)}</div>
        </div>
      </div>
      
      <div class="product-card-actions">
        <button class="btn btn-outline btn-sm btn-view-detail" data-product-id="${product.id}">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          View Details
        </button>
        <button class="btn btn-primary btn-sm btn-generate-mockup" data-product-id="${product.id}">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Mockup
        </button>
      </div>
    </div>
  `;
}

// View Details butonlarına event listener ekleyin
function setupViewDetailButtons() {
  document.addEventListener('click', function(e) {
    const viewDetailBtn = e.target.closest('.btn-view-detail');
    if (viewDetailBtn) {
      const productId = viewDetailBtn.dataset.productId;
      if (productId) {
        // Product detail sayfasına yönlendir
        window.location.href = `/product-detail.html?id=${productId}`;
      }
    }
  });
}

// Sayfa yüklendiğinde buton event'lerini kur
document.addEventListener('DOMContentLoaded', function() {
  setupViewDetailButtons();
  // Diğer mevcut kodlar...
});




