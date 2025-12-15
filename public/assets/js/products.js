/* =====================================================
   PRODUCTS – SINGLE SOURCE OF TRUTH
   Frontend ⇄ Supabase Edge Functions
===================================================== */

import { supabase } from './supabaseClient.js';

/* -----------------------------
   GLOBAL STATE
-------------------------------- */
let user = null;
let profile = null;
let loading = false;

/* -----------------------------
   INIT
-------------------------------- */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadUser();
  bindEvents();
  loadMyProducts();
}

/* -----------------------------
   AUTH
-------------------------------- */
async function loadUser() {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return;

  user = data.user;

  const { data: p } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  profile = p;
}

/* -----------------------------
   EVENTS
-------------------------------- */
function bindEvents() {
  document
    .getElementById('btn-new-product')
    ?.addEventListener('click', openNewProductModal);

  document
    .querySelector('[id="analyzeTopSellers()"]')
    ?.addEventListener('click', analyzeTopSellers);
}

/* -----------------------------
   LOAD PRODUCTS
-------------------------------- */
async function loadMyProducts() {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  renderProducts(data || []);
}

/* -----------------------------
   ETSY TOP SELLERS
-------------------------------- */
async function analyzeTopSellers() {
  if (loading) return;
  loading = true;

  notify('Top sellers analiz ediliyor...');

  const { data, error } = await supabase.functions.invoke(
    'etsy-top-sellers',
    {
      body: { user_id: profile.id }
    }
  );

  if (error) {
    notify('Top seller alınamadı', 'error');
    loading = false;
    return;
  }

  renderTopSellerCards(data.trend_scores);
  loading = false;
}

/* -----------------------------
   RENDER ETSY RESULTS
-------------------------------- */
function renderTopSellerCards(items) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';

  items.forEach(item => {
    const price = Math.max(item.price - 1, 5);

    grid.innerHTML += `
      <div class="product-card">
        <div class="product-content">
          <h3 class="product-title">${item.listing_title}</h3>
          <p class="product-description">
            Estimated sales: ${item.monthly_sales_estimate}
          </p>
          <div class="product-price">$${price.toFixed(2)}</div>

          <button class="btn btn-primary"
            data-id="${item.listing_id}">
            Create Product
          </button>
        </div>
      </div>
    `;
  });

  grid.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => createProductFromEtsy(btn.dataset.id);
  });
}

/* -----------------------------
   CREATE PRODUCT
-------------------------------- */
async function createProductFromEtsy(listingId) {
  notify('Ürün oluşturuluyor...');

  await supabase.functions.invoke(
    'create-product-from-etsy',
    {
      body: {
        user_id: profile.id,
        listing_id: listingId
      }
    }
  );

  notify('Ürün oluşturuldu');
  loadMyProducts();
}

/* -----------------------------
   MOCKUP
-------------------------------- */
async function generateMockup(productId) {
  await supabase.functions.invoke('apply-mockups', {
    body: { product_id: productId }
  });

  notify('Mockup oluşturuldu');
}

/* -----------------------------
   PUBLISH
-------------------------------- */
async function publishProduct(productId) {
  await supabase.functions.invoke('publish-to-marketplace', {
    body: {
      product_id: productId,
      user_id: profile.id,
      marketplaces: ['etsy']
    }
  });

  notify('Ürün yayına alındı');
}

/* -----------------------------
   UI
-------------------------------- */
function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  const empty = document.getElementById('products-empty');

  if (!products.length) {
    empty.classList.remove('hidden');
    grid.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');

  grid.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="product-content">
        <h3 class="product-title">${p.title}</h3>
        <p class="product-description">${p.description || ''}</p>
        <div class="product-price">$${p.price}</div>

        <div class="product-actions">
          <button class="btn btn-outline"
            onclick="generateMockup('${p.id}')">Mockup</button>

          <button class="btn btn-primary"
            onclick="publishProduct('${p.id}')">Publish</button>
        </div>
      </div>
    </div>
  `).join('');
}

/* -----------------------------
   HELPERS
-------------------------------- */
function notify(msg, type = 'info') {
  console.log(`[${type}]`, msg);
}

function openNewProductModal() {
  document.getElementById('modal-product').classList.add('active');
}
