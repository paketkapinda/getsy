// Product CRUD, mockup triggers, publish flow

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
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    currentProducts = data || [];

    if (currentProducts.length === 0) {
      container.classList.add('hidden');
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (empty) empty.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = currentProducts.map(product => `
      <div class="product-card">
        <div class="product-image mb-4">
          ${product.mockup_urls && product.mockup_urls.length > 0
            ? `<img src="${product.mockup_urls[0]}" alt="${product.title}" class="h-full w-full object-cover" />`
            : '<div class="flex h-full items-center justify-center text-gray-400"><svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>'
          }
        </div>
        <div class="p-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-1">${product.title || 'Untitled'}</h3>
          <p class="text-sm text-gray-600 mb-3">${product.category || '—'}</p>
          <div class="mb-4 flex items-center justify-between">
            <span class="text-xl font-bold text-gray-900">${formatCurrency(product.price || 0)}</span>
            <span class="badge ${getStatusColor(product.status || 'draft')}">${getStatusLabel(product.status || 'draft')}</span>
          </div>
          <div class="flex gap-2">
            <button
              onclick="window.location.href='/frontend/product-detail.html?id=${product.id}'"
              class="flex-1 btn-secondary text-sm py-2"
            >
              View
            </button>
            <button
              onclick="handleGenerateMockup('${product.id}')"
              class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
            >
              Mockup
            </button>
            ${product.status !== 'listed'
              ? `<button
                  onclick="handlePublishProduct('${product.id}')"
                  class="btn-primary text-sm py-2"
                >
                  Publish
                </button>`
              : ''
            }
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading products:', error);
    showNotification('Failed to load products', 'error');
    container.innerHTML = '<p class="text-red-300">Error loading products</p>';
  }
}

window.handleGenerateMockup = async function(productId) {
  showModal('modal-mockup');
  // Load mockup editor
  const container = document.getElementById('mockup-editor-container');
  if (container) {
    container.innerHTML = '<p class="text-slate-300">Loading mockup editor...</p>';
    // Import and initialize mockup editor
    const { initMockupEditor } = await import('./mockup-editor.js');
    await initMockupEditor(productId, container);
  }
};

window.handlePublishProduct = async function(productId) {
  if (!confirm('Publish this product to Etsy?')) return;

  try {
    showNotification('Publishing product...', 'info');
    const result = await api.post('/functions/v1/etsy-listing-create', {
      product_id: productId,
    });

    if (result.error) throw new Error(result.error);

    showNotification('Product published successfully', 'success');
    await loadProducts();
  } catch (error) {
    console.error('Error publishing product:', error);
    showNotification('Failed to publish product', 'error');
  }
};

// Product form handling
export function initProductForm() {
  const btnNew = document.getElementById('btn-new-product');
  const modal = 'modal-product';
  const form = document.getElementById('form-product');

  if (btnNew) {
    btnNew.addEventListener('click', () => {
      document.getElementById('product-id').value = '';
      document.getElementById('product-title').value = '';
      document.getElementById('product-category').value = 'tshirt';
      document.getElementById('product-price').value = '';
      document.getElementById('product-description').value = '';
      document.getElementById('modal-product-title').textContent = 'New Product';
      showModal(modal);
    });
  }

  setupModalClose(modal, 'modal-product-close');
  const btnCancel = document.getElementById('btn-cancel-product');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => hideModal(modal));
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('product-id').value;
      const data = {
        title: document.getElementById('product-title').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        description: document.getElementById('product-description').value,
      };

      try {
        if (id) {
          const { error } = await supabase
            .from('products')
            .update(data)
            .eq('id', id);
          if (error) throw error;
          showNotification('Product updated', 'success');
        } else {
          const { error } = await supabase
            .from('products')
            .insert([{ ...data, status: 'draft' }]);
          if (error) throw error;
          showNotification('Product created', 'success');
        }
        hideModal(modal);
        await loadProducts();
      } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Failed to save product', 'error');
      }
    });
  }
}

// Load product detail
export async function loadProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');
  if (!productId) {
    window.location.href = '/frontend/products.html';
    return;
  }

  const container = document.getElementById('product-detail-container');
  if (!container) return;

  showLoading(container);

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) throw error;

    container.innerHTML = `
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 class="mb-4 text-2xl font-semibold">${data.title}</h1>
        <div class="mb-4 grid gap-4 md:grid-cols-2">
          <div>
            <p class="text-sm text-slate-400">Category</p>
            <p class="font-medium">${data.category || '—'}</p>
          </div>
          <div>
            <p class="text-sm text-slate-400">Price</p>
            <p class="font-medium text-emerald-300">${formatCurrency(data.price || 0)}</p>
          </div>
          <div>
            <p class="text-sm text-slate-400">Status</p>
            <p class="font-medium"><span class="rounded px-2 py-0.5 text-xs ${getStatusColor(data.status || 'draft')}">${getStatusLabel(data.status || 'draft')}</span></p>
          </div>
          <div>
            <p class="text-sm text-slate-400">Created</p>
            <p class="font-medium">${formatDate(data.created_at)}</p>
          </div>
        </div>
        <div class="mb-4">
          <p class="text-sm text-slate-400">Description</p>
          <p class="mt-1">${data.description || '—'}</p>
        </div>
        ${data.mockup_urls && data.mockup_urls.length > 0
          ? `<div class="mb-4">
              <p class="mb-2 text-sm text-slate-400">Mockups</p>
              <div class="grid grid-cols-3 gap-2">
                ${data.mockup_urls.map(url => `<img src="${url}" alt="Mockup" class="rounded-lg" />`).join('')}
              </div>
            </div>`
          : ''
        }
        <div class="flex gap-3">
          <button
            onclick="handleGenerateMockup('${data.id}')"
            class="rounded-md bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-400"
          >
            Generate Mockups
          </button>
          ${data.status !== 'listed'
            ? `<button
                onclick="handlePublishProduct('${data.id}')"
                class="rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400"
              >
                Publish to Etsy
              </button>`
            : ''
          }
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading product:', error);
    container.innerHTML = '<p class="text-red-300">Error loading product</p>';
  }
}

// Initialize on page load
if (document.getElementById('products-grid')) {
  loadProducts();
  initProductForm();
}

if (document.getElementById('product-detail-container')) {
  loadProductDetail();
}

