/* =====================================================
   PartnerShop – Products Module (Clean Version)
   Role: Frontend Orchestrator Only
   ===================================================== */

import { supabase } from './supabaseClient.js';

/* -----------------------------
   GLOBAL STATE
-------------------------------- */
let currentUser = null;
let currentProfile = null;
let isLoading = false;

/* -----------------------------
   INIT
-------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  await loadUserAndProfile();
  bindUIEvents();
});

/* -----------------------------
   LOAD USER & PROFILE
-------------------------------- */
async function loadUserAndProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  currentUser = user;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, subscription_type')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Profile load failed', error);
    return;
  }

  currentProfile = data;
}

/* -----------------------------
   UI EVENTS
-------------------------------- */
function bindUIEvents() {
  const analyzeBtn = document.getElementById('btn-analyze-top-sellers');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeTopSellers);
  }
}

/* -----------------------------
   TOP SELLER ANALYSIS
-------------------------------- */
async function analyzeTopSellers() {
  if (isLoading) return;
  isLoading = true;
  lockUI(true);

  try {
    notify('Analyzing Etsy top sellers...', 'info');

    const { data, error } = await supabase.functions.invoke(
      'etsy-top-sellers',
      {
        body: {
          user_id: currentProfile.id
        }
      }
    );

    if (error) throw error;

    renderTopSellerResults(data.trend_scores);

  } catch (err) {
    console.error(err);
    notify('Top seller analysis failed', 'error');
  } finally {
    isLoading = false;
    lockUI(false);
  }
}

/* -----------------------------
   RENDER RESULTS
-------------------------------- */
function renderTopSellerResults(products = []) {
  const container = document.getElementById('top-seller-results');
  if (!container) return;

  if (!products.length) {
    container.innerHTML = `<p>No results found.</p>`;
    return;
  }

  container.innerHTML = products.map(product => `
    <div class="product-card">
      <h4>${product.listing_title}</h4>
      <p>Estimated monthly sales: ${product.monthly_sales_estimate}</p>
      <p>Trend score: ${product.trend_score}%</p>
      <button onclick='createProduct("${product.listing_id}")'>
        Create Product
      </button>
    </div>
  `).join('');
}

/* -----------------------------
   CREATE PRODUCT (COMMAND ONLY)
-------------------------------- */
async function createProduct(listingId) {
  if (isLoading) return;
  isLoading = true;
  lockUI(true);

  try {
    notify('Creating product...', 'info');

    const { data, error } = await supabase.functions.invoke(
      'create-product-from-etsy',
      {
        body: {
          user_id: currentProfile.id,
          listing_id: listingId
        }
      }
    );

    if (error) throw error;

    notify('Product created successfully', 'success');

  } catch (err) {
    console.error(err);
    notify('Product creation failed', 'error');
  } finally {
    isLoading = false;
    lockUI(false);
  }
}

/* -----------------------------
   UI HELPERS
-------------------------------- */
function lockUI(state) {
  document.body.classList.toggle('loading', state);
}

function notify(message, type = 'info') {
  console.log(`[${type.toUpperCase()}]`, message);
}


/* -----------------------------
   EDGE FUNCTIONS 
-------------------------------- */

await supabase.functions.invoke('generate-similar-designs', {
  body: {
    user_id: currentUser.id,
    reference_image: product.image,
    product_type: 't-shirt',
    style: 'minimal illustration',
    variations: 3
  }
});


await fetch('/functions/v1/analyze-top-sellers', {
  method: 'POST'
})


await fetch('/functions/v1/generate-design-variations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    baseProduct: selectedProduct,
    variations: 6
  })
})


await fetch('/functions/v1/apply-mockups', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    design_id: selectedDesign.id,
    mockup_type: 'tshirt_male_front'
  })
})


await fetch('/functions/v1/publish-to-marketplace', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: selectedProduct.id,
    user_id: currentUser.id
  })
})
