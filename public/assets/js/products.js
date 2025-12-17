/* =====================================================
   PRODUCTS.JS – SINGLE SOURCE OF TRUTH
   Supabase Edge Functions (ANON + JWT)
   ===================================================== */

import { supabase } from './supabaseClient.js';

/* -----------------------------
   GLOBAL STATE
-------------------------------- */
let currentUser = null;
let products = [];

/* -----------------------------
   INIT
-------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  await loadUser();
  bindUI();
  loadProducts();
});

/* -----------------------------
   AUTH
-------------------------------- */
async function loadUser() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;
}

/* -----------------------------
   UI BINDINGS
-------------------------------- */
function bindUI() {
  document.getElementById('analyze-top-sellers')
    ?.addEventListener('click', analyzeTopSellers);

  document.getElementById('btn-new-product')
    ?.addEventListener('click', () => openModal('modal-product'));

  document.getElementById('modal-product-close')
    ?.addEventListener('click', () => closeModal('modal-product'));

  document.getElementById('btn-cancel-product')
    ?.addEventListener('click', () => closeModal('modal-product'));

  document.getElementById('form-product')
    ?.addEventListener('submit', saveProduct);

  document.getElementById('filter-status')
    ?.addEventListener('change', applyFilters);

  document.getElementById('filter-category')
    ?.addEventListener('change', applyFilters);

  document.getElementById('btn-generate-description')
    ?.addEventListener('click', generateDescription);
}

/* -----------------------------
   MODAL HELPERS
-------------------------------- */
function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

/* -----------------------------
   LOAD PRODUCTS
-------------------------------- */
async function loadProducts() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (!error) {
    products = data || [];
    renderProducts(products);
  }
}

/* -----------------------------
   RENDER PRODUCTS
-------------------------------- */
function renderProducts(list) {
  const container = document.getElementById('products-grid');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `<p>No products found.</p>`;
    return;
  }

  container.innerHTML = list.map(p => `
    <div class="product-card">
      <h4>${p.title}</h4>
      <p>${p.category}</p>
      <p>$${Number(p.price).toFixed(2)}</p>
      <span class="badge">${p.status}</span>
    </div>
  `).join('');
}

/* -----------------------------
   FILTERS
-------------------------------- */
function applyFilters() {
  const status = document.getElementById('filter-status').value;
  const category = document.getElementById('filter-category').value;

  let filtered = [...products];

  if (status) filtered = filtered.filter(p => p.status === status);
  if (category) filtered = filtered.filter(p => p.category === category);

  renderProducts(filtered);
}

/* -----------------------------
   SAVE PRODUCT
-------------------------------- */
async function saveProduct(e) {
  e.preventDefault();

  const payload = {
    user_id: currentUser.id,
    title: document.getElementById('product-title').value,
    category: document.getElementById('product-category').value,
    price: Number(document.getElementById('product-price').value),
    status: document.getElementById('product-status').value,
    description: document.getElementById('product-description').value
  };

  const { error } = await supabase.from('products').insert(payload);

  if (!error) {
    closeModal('modal-product');
    loadProducts();
  } else {
    alert(error.message);
  }
}

/* -----------------------------
   ANALYZE TOP SELLERS (EDGE)
-------------------------------- */
async function analyzeTopSellers() {
  try {
    const res = await fetch(
      `${window.ENV.SUPABASE_FUNCTIONS_URL}/analyze-top-sellers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
        }
      }
    );

    const data = await res.json();
    console.log('Top sellers:', data);

  } catch (err) {
    console.error(err);
    alert('Analyze failed');
  }
}

/* -----------------------------
   RENDER TOP SELLERS
-------------------------------- */
function renderTopSellers(items) {
  const container = document.getElementById('products-grid');
  if (!container) return;

  container.innerHTML = items.map(i => `
    <div class="product-card highlight">
      <h4>${i.title}</h4>
      <p>Trend: ${i.trend_score}%</p>
      <p>Sales: ${i.monthly_sales_estimate}</p>
      <button class="btn btn-primary"
        onclick='prefillProduct(${JSON.stringify(i)})'>
        Create Product
      </button>
    </div>
  `).join('');
}

window.prefillProduct = (item) => {
  document.getElementById('product-title').value = item.title;
  document.getElementById('product-category').value = item.category || 'tshirt';
  document.getElementById('product-price').value =
    Math.max(1, (item.monthly_sales_estimate / 10) - 1).toFixed(2);
  document.getElementById('product-status').value = 'draft';
  document.getElementById('product-description').value =
    `Inspired by top selling Etsy product: ${item.title}`;

  openModal('modal-product');
};

/* -----------------------------
   AI DESCRIPTION (EDGE)
-------------------------------- */
async function generateDescription() {
  const title = document.getElementById('product-title').value;
  if (!title) return alert('Enter product title first');

  const session = (await supabase.auth.getSession()).data.session;

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/generate-description`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ title })
    }
  );

  const json = await res.json();
  if (res.ok) {
    document.getElementById('product-description').value = json.description;
  }
}
