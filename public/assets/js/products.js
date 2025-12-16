/* =====================================================
   PRODUCTS.JS – SINGLE ORCHESTRATOR
   Supabase Edge Functions (ANON + JWT)
===================================================== */

import { supabase } from './supabaseClient.js'

let currentUser = null
let productsCache = []

/* =====================================================
   INIT
===================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  await loadUser()
  bindUI()
})

async function loadUser() {
  const { data } = await supabase.auth.getUser()
  currentUser = data?.user || null
}

/* =====================================================
   UI BINDINGS
===================================================== */
function bindUI() {
  // Analyze Top Sellers
  const analyzeBtn = document.getElementById('analyze-top-sellers')
  analyzeBtn?.addEventListener('click', loadTopSellers)

  // New Product
  const newProductBtn = document.getElementById('btn-new-product')
  newProductBtn?.addEventListener('click', createEmptyProductCard)

  // Filters
  document.getElementById('filter-status')
    ?.addEventListener('change', applyFilters)

  document.getElementById('filter-category')
    ?.addEventListener('change', applyFilters)
}

/* =====================================================
   TOP SELLERS
===================================================== */
async function loadTopSellers() {
  if (!currentUser) return alert('Login required')

  setLoading(true)

  try {
    const session = await supabase.auth.getSession()
    const token = session.data.session.access_token

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/analyze-top-sellers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      }
    )

    const json = await res.json()
    if (!res.ok) throw json

    productsCache = json.trend_scores || []
    renderProducts(productsCache)

  } catch (err) {
    console.error(err)
    alert('Top sellers load failed')
  } finally {
    setLoading(false)
  }
}

/* =====================================================
   RENDER
===================================================== */
function renderProducts(list) {
  const container = document.getElementById('products-grid')
  if (!container) return

  container.innerHTML = ''

  if (!list.length) {
    container.innerHTML = `<p>No products found</p>`
    return
  }

  container.innerHTML = list.map(p => `
    <div class="product-card" data-status="draft" data-category="tshirt">
      <h4>${p.title}</h4>
      <p>Trend Score: ${p.trend_score}</p>
      <p>Est. Sales: ${p.monthly_sales_estimate}</p>
      <button class="btn btn-sm" onclick="publishProduct('${p.listing_id}')">
        Publish
      </button>
    </div>
  `).join('')
}

/* =====================================================
   FILTERS
===================================================== */
function applyFilters() {
  const status = document.getElementById('filter-status').value
  const category = document.getElementById('filter-category').value

  const filtered = productsCache.filter(p => {
    if (status && p.status !== status) return false
    if (category && p.category !== category) return false
    return true
  })

  renderProducts(filtered)
}

/* =====================================================
   NEW PRODUCT
===================================================== */
function createEmptyProductCard() {
  const container = document.getElementById('products-grid')
  if (!container) return

  container.insertAdjacentHTML('afterbegin', `
    <div class="product-card manual">
      <h4 contenteditable="true">New Product</h4>
      <p contenteditable="true">Description...</p>
      <button class="btn btn-sm">Save Draft</button>
    </div>
  `)
}

/* =====================================================
   PUBLISH (EDGE)
===================================================== */
window.publishProduct = async function (listingId) {
  try {
    const session = await supabase.auth.getSession()
    const token = session.data.session.access_token

    await fetch(
      `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/publish-to-marketplace`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ listing_id: listingId })
      }
    )

    alert('Product published')

  } catch (e) {
    console.error(e)
    alert('Publish failed')
  }
}

/* =====================================================
   UI
===================================================== */
function setLoading(state) {
  document.body.classList.toggle('loading', state)
}
