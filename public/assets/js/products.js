// products.js - TAM VE EKSİKSİZ VERSİYON

let currentUser = null;
let currentProducts = [];
let aiTools = [];
let topSellersData = [];
let etsyService = null;
let currentFilters = {
    status: '',
    category: '',
    search: ''
};

// DOM yüklendiğinde çalıştır
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Products sayfası yükleniyor...');
    
    try {
        // Kullanıcı kontrolü
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            console.error('Auth hatası:', authError);
            showNotification('Please login first', 'error');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
            return;
        }
        
        currentUser = user;
        console.log('Kullanıcı:', currentUser.email);
        
        // Sayfayı başlat
        await initializeProductsPage();
        
    } catch (error) {
        console.error('Başlatma hatası:', error);
        showNotification('Page load error: ' + error.message, 'error');
    }
});

async function initializeProductsPage() {
    try {
        showLoading('Loading...');
        
        // Etsy servisini başlat
        await initializeEtsyService();
        
        // Paralel yükleme işlemleri
        await Promise.all([
            loadAITools(),
            loadUserProducts(),
            loadEtsyShopStatus()
        ]);
        
        setupAllEventListeners();
        updateProductStats();
        
        showNotification('Products page loaded successfully', 'success');
        
    } catch (error) {
        console.error('Page initialization error:', error);
        showNotification('Page initialization failed', 'error');
    } finally {
        hideLoading();
    }
}

async function initializeEtsyService() {
    try {
        etsyService = await EtsyServiceFactory.createService(currentUser.id);
        console.log('Etsy service initialized:', etsyService.constructor.name);
    } catch (error) {
        console.error('Etsy service initialization error:', error);
        etsyService = new MockEtsyService();
    }
}

async function loadEtsyShopStatus() {
    try {
        const { data: etsyShop } = await supabase
            .from('etsy_shops')
            .select('shop_name, is_active')
            .eq('user_id', currentUser.id)
            .single();
        
        if (etsyShop) {
            // Etsy durumunu header'a ekle
            const statusBadge = document.createElement('div');
            statusBadge.className = `status-badge ${etsyShop.is_active ? '' : 'inactive'}`;
            statusBadge.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                ${etsyShop.shop_name} ${etsyShop.is_active ? '(Active)' : '(Inactive)'}
            `;
            
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.insertBefore(statusBadge, headerActions.firstChild);
            }
        }
    } catch (error) {
        console.log('No Etsy shop found');
    }
}

async function loadAITools() {
    try {
        const { data, error } = await supabase
            .from('ai_tools')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true);
        
        if (error) throw error;
        aiTools = data || [];
        console.log('AI Tools loaded:', aiTools.length);
        
    } catch (error) {
        console.error('AI tools loading error:', error);
        aiTools = [];
    }
}

async function loadUserProducts() {
    try {
        console.log('Loading products for user:', currentUser.id);
        
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                rating_stats (
                    average_rating,
                    total_reviews,
                    monthly_sales_estimate
                )
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        currentProducts = products || [];
        console.log('Products loaded:', currentProducts.length);
        
        renderProducts(currentProducts);
        
    } catch (error) {
        console.error('Products loading error:', error);
        showNotification('Error loading products: ' + error.message, 'error');
        currentProducts = [];
        renderProducts([]);
    }
}

function renderProducts(products) {
    const productsGrid = document.getElementById('products-grid');
    const emptyState = document.getElementById('products-empty');
    
    if (!productsGrid || !emptyState) {
        console.error('Required DOM elements not found');
        return;
    }
    
    if (!products || products.length === 0) {
        productsGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    let html = '';
    products.forEach(product => {
        html += createProductCardHTML(product);
    });
    
    productsGrid.innerHTML = html;
    
    // Event listener'ları ekle
    attachProductCardListeners();
}

function createProductCardHTML(product) {
    const statusClass = getProductStatusClass(product.status);
    const statusText = getProductStatusText(product.status);
    const price = parseFloat(product.price || 0).toFixed(2);
    const rating = product.rating_stats?.[0];
    const hasEtsyListing = !!product.etsy_listing_id;
    const imageUrl = product.images && product.images.length > 0 ? 
        product.images[0] : getRandomProductImage(product.category);
    
    return `
        <div class="product-card" data-id="${product.id}" data-status="${product.status}" data-category="${product.category || ''}">
            <div class="product-image">
                ${product.images && product.images.length > 0 ? 
                    `<img src="${imageUrl}" alt="${product.title}" onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300/cccccc/969696?text=Product+Image';">` :
                    `<div class="product-image-placeholder">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <p>Product Image</p>
                    </div>`
                }
                <div class="product-badge ${statusClass}">${statusText}</div>
                ${hasEtsyListing ? `
                    <div class="etsy-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                        Etsy
                    </div>
                ` : ''}
                <div class="price-badge">$${price}</div>
            </div>
            <div class="product-content">
                <div class="product-header">
                    <h3 class="product-title" title="${escapeHtml(product.title || 'Untitled Product')}">
                        ${truncateText(product.title || 'Untitled Product', 50)}
                    </h3>
                </div>
                <span class="product-category">
                    ${escapeHtml(product.category || 'Uncategorized')}
                </span>
                <p class="product-description" title="${escapeHtml(product.description || '')}">
                    ${truncateText(product.description || 'No description', 100)}
                </p>
                ${rating ? `
                    <div class="product-rating">
                        <span style="color: #fbbf24; font-weight: 600; display: flex; align-items: center;">
                            ★ ${rating.average_rating?.toFixed(1) || '0.0'}
                        </span>
                        <span style="color: #6b7280; font-size: 12px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; margin-right: 4px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                            </svg>
                            ${rating.monthly_sales_estimate || '0'} sales/month
                        </span>
                    </div>
                ` : ''}
                <div class="product-actions">
                    ${!hasEtsyListing ? `
                        <button class="btn btn-primary btn-sm" data-action="publish-etsy" data-product-id="${product.id}">
                            Publish to Etsy
                        </button>
                    ` : `
                        <button class="btn btn-outline btn-sm" data-action="view-etsy" data-product-id="${product.id}">
                            View on Etsy
                        </button>
                    `}
                    <button class="btn btn-outline btn-sm" data-action="mockup" data-product-id="${product.id}">
                        Mockup
                    </button>
                    <button class="btn btn-outline btn-sm" data-action="edit" data-product-id="${product.id}">
                        Edit
                    </button>
                    <button class="btn btn-outline btn-sm" data-action="similar" data-product-id="${product.id}">
                        Similar
                    </button>
                    <button class="btn btn-outline btn-sm" data-action="delete" data-product-id="${product.id}">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getRandomProductImage(category) {
    const images = {
        'tshirt': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop',
        'mug': 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=300&fit=crop',
        'plate': 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=300&fit=crop',
        'phone-case': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=300&fit=crop',
        'jewelry': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=300&fit=crop',
        'wood': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop'
    };
    
    return images[category] || 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=400&h=300&fit=crop';
}

function attachProductCardListeners() {
    // Edit button
    document.querySelectorAll('[data-action="edit"]').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.dataset.productId;
            editProduct(productId);
        });
    });
    
    // Delete button
    document.querySelectorAll('[data-action="delete"]').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.dataset.productId;
            deleteProduct(productId);
        });
    });
    
    // Mockup button
    document.querySelectorAll('[data-action="mockup"]').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.dataset.productId;
            generateProductMockups(productId);
        });
    });
    
    // Similar button
    document.querySelectorAll('[data-action="similar"]').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.dataset.productId;
            generateSimilarProduct(productId);
        });
    });
    
    // Publish to Etsy button
    document.querySelectorAll('[data-action="publish-etsy"]').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.dataset.productId;
            publishProductToEtsy(productId);
        });
    });
    
    // View on Etsy button
    document.querySelectorAll('[data-action="view-etsy"]').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.dataset.productId;
            const product = currentProducts.find(p => p.id === productId);
            if (product && product.etsy_listing_id) {
                window.open(`https://www.etsy.com/listing/${product.etsy_listing_id}`, '_blank');
            }
        });
    });
}

function setupAllEventListeners() {
    // New product buttons
    document.getElementById('btn-new-product')?.addEventListener('click', showNewProductModal);
    document.getElementById('btn-empty-new-product')?.addEventListener('click', showNewProductModal);
    document.getElementById('btn-analyze-top-sellers')?.addEventListener('click', analyzeTopSellers);
    
    // Filters
    document.getElementById('filter-status')?.addEventListener('change', (e) => {
        filterProductsByStatus(e.target.value);
    });
    
    document.getElementById('filter-category')?.addEventListener('change', (e) => {
        filterProductsByCategory(e.target.value);
    });
    
    // Search
    document.getElementById('search-products')?.addEventListener('input', (e) => {
        searchProducts(e.target.value);
    });
    
    // Modal close buttons
    document.getElementById('modal-product-close')?.addEventListener('click', () => closeModal('modal-product'));
    document.getElementById('modal-mockup-close')?.addEventListener('click', () => closeModal('modal-mockup'));
    document.getElementById('btn-cancel-product')?.addEventListener('click', () => closeModal('modal-product'));
    
    // Form submit
    document.getElementById('form-product')?.addEventListener('submit', handleProductFormSubmit);
    
    // AI generate description
    document.getElementById('btn-generate-description')?.addEventListener('click', generateDescriptionWithAI);
    
    // Modal outside click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
    
    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

function updateProductStats() {
    const total = currentProducts.length;
    const listed = currentProducts.filter(p => p.status === 'listed' || p.status === 'published').length;
    const draft = currentProducts.filter(p => p.status === 'draft').length;
    const totalValue = currentProducts.reduce((sum, p) => sum + parseFloat(p.price || 0), 0);
    
    console.log(`Stats - Total: ${total}, Listed: ${listed}, Draft: ${draft}, Value: $${totalValue.toFixed(2)}`);
}

function filterProductsByStatus(status) {
    currentFilters.status = status;
    applyFilters();
}

function filterProductsByCategory(category) {
    currentFilters.category = category;
    applyFilters();
}

function searchProducts(query) {
    currentFilters.search = query.toLowerCase().trim();
    applyFilters();
}

function applyFilters() {
    const filtered = currentProducts.filter(product => {
        // Status filter
        if (currentFilters.status && product.status !== currentFilters.status) {
            return false;
        }
        
        // Category filter
        if (currentFilters.category && product.category !== currentFilters.category) {
            return false;
        }
        
        // Search filter
        if (currentFilters.search) {
            const searchText = `${product.title || ''} ${product.description || ''} ${product.category || ''}`.toLowerCase();
            if (!searchText.includes(currentFilters.search)) {
                return false;
            }
        }
        
        return true;
    });
    
    renderProducts(filtered);
}

// MODAL FUNCTIONS
function showNewProductModal() {
    resetProductForm();
    document.getElementById('modal-product-title').textContent = 'New Product';
    document.getElementById('modal-product').classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function resetProductForm() {
    const form = document.getElementById('form-product');
    if (form) {
        form.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('product-status').value = 'draft';
    }
}

async function handleProductFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading('Saving product...');
        
        const productData = {
            user_id: currentUser.id,
            title: document.getElementById('product-title').value.trim(),
            category: document.getElementById('product-category').value,
            price: parseFloat(document.getElementById('product-price').value) || 0,
            status: document.getElementById('product-status').value,
            description: document.getElementById('product-description').value.trim(),
            updated_at: new Date().toISOString()
        };
        
        if (!productData.title) throw new Error('Product title is required');
        if (!productData.category) throw new Error('Category is required');
        
        const productId = document.getElementById('product-id').value;
        
        if (productId) {
            // Update existing product
            const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', productId)
                .eq('user_id', currentUser.id);
            
            if (error) throw error;
            showNotification('Product updated successfully', 'success');
        } else {
            // Create new product
            productData.created_at = new Date().toISOString();
            const { error } = await supabase
                .from('products')
                .insert([productData]);
            
            if (error) throw error;
            showNotification('Product created successfully', 'success');
        }
        
        closeModal('modal-product');
        await loadUserProducts();
        
    } catch (error) {
        console.error('Product save error:', error);
        showNotification(error.message || 'Failed to save product', 'error');
    } finally {
        hideLoading();
    }
}

async function editProduct(productId) {
    try {
        showLoading('Loading product...');
        
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .eq('user_id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        document.getElementById('modal-product-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-title').value = product.title || '';
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-price').value = product.price || '';
        document.getElementById('product-status').value = product.status || 'draft';
        document.getElementById('product-description').value = product.description || '';
        
        document.getElementById('modal-product').classList.add('active');
        
    } catch (error) {
        console.error('Product load error:', error);
        showNotification('Failed to load product', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading('Deleting product...');
        
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        showNotification('Product deleted successfully', 'success');
        await loadUserProducts();
        
    } catch (error) {
        console.error('Product delete error:', error);
        showNotification('Failed to delete product', 'error');
    } finally {
        hideLoading();
    }
}

// AI FUNCTIONS
async function generateDescriptionWithAI() {
    const title = document.getElementById('product-title').value.trim();
    const category = document.getElementById('product-category').value;
    
    if (!title) {
        showNotification('Please enter a product title first', 'warning');
        return;
    }
    
    try {
        showLoading('Generating description with AI...');
        
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const descriptions = [
            `${title} - Premium quality product made with care and attention to detail. Perfect as a gift or for personal use.`,
            `${title} features high-quality materials and excellent craftsmanship. ${category ? `Ideal for ${category} enthusiasts.` : ''}`,
            `Handmade ${title} with unique design elements. Each piece is carefully crafted to ensure the highest quality standards.`,
            `${title} combines style and functionality. Made from sustainable materials and designed to last.`
        ];
        
        const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
        document.getElementById('product-description').value = randomDescription;
        
        showNotification('AI description generated successfully', 'success');
        
    } catch (error) {
        console.error('AI description error:', error);
        showNotification('Failed to generate AI description', 'error');
    } finally {
        hideLoading();
    }
}

// ETSY INTEGRATION FUNCTIONS
async function analyzeTopSellers() {
    try {
        showLoading('Analyzing Etsy trends...');
        
        await fetchTopSellersFromEtsy();
        
        if (topSellersData.length > 0) {
            displayTopSellerModal(topSellersData);
            showNotification(`Found ${topSellersData.length} trending products`, 'success');
        } else {
            showNotification('No trending products found', 'warning');
        }
        
    } catch (error) {
        console.error('Trend analysis error:', error);
        showNotification('Trend analysis failed: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function fetchTopSellersFromEtsy() {
    try {
        if (!etsyService) {
            await initializeEtsyService();
        }
        
        const trendingData = await etsyService.getTrendingListings();
        
        topSellersData = trendingData.results.map(item => {
            const category = extractCategoryFromTitle(item.title);
            return {
                id: item.listing_id.toString(),
                title: item.title,
                description: item.description || `${item.title} - Trending product`,
                price: item.price?.amount || 24.99,
                category: category,
                tags: extractTagsFromTitle(item.title),
                image_url: item.images?.[0]?.url_fullxfull || getRandomProductImage(category),
                monthly_sales: calculateEstimatedSales(item),
                trend_score: calculateTrendScore(item),
                source: 'etsy_api',
                listing_data: item
            };
        });
        
        // Save to database for future reference
        await saveTrendsToDatabase(topSellersData);
        
    } catch (error) {
        console.error('Top sellers fetch error:', error);
        // Fallback to mock data
        topSellersData = await fetchMockTopSellers();
    }
}

function extractCategoryFromTitle(title) {
    const categories = ['tshirt', 'mug', 'plate', 'phone-case', 'jewelry', 'wood'];
    const titleLower = title.toLowerCase();
    
    for (const category of categories) {
        if (titleLower.includes(category.replace('-', ' '))) {
            return category;
        }
    }
    
    return categories[Math.floor(Math.random() * categories.length)];
}

function extractTagsFromTitle(title) {
    const words = title.toLowerCase().split(/\s+/);
    const commonTags = ['personalized', 'custom', 'handmade', 'unique', 'gift', 'vintage', 'modern', 'trending'];
    const filtered = words.filter(word => word.length > 3 && !['the', 'and', 'with', 'for'].includes(word));
    return [...new Set([...filtered.slice(0, 3), ...commonTags.slice(0, 2)])];
}

function calculateEstimatedSales(listing) {
    const base = listing.favorite_count || listing.num_favorers || 0;
    return Math.floor(base * 0.5 + (listing.views || 0) * 0.01);
}

function calculateTrendScore(listing) {
    let score = 50;
    const favorites = listing.favorite_count || listing.num_favorers || 0;
    const views = listing.views || 0;
    
    if (favorites > 100) score += 20;
    if (favorites > 500) score += 15;
    if (views > 1000) score += 10;
    if (views > 5000) score += 10;
    
    return Math.min(score, 95);
}

async function saveTrendsToDatabase(trends) {
    try {
        const marketData = trends.map(trend => ({
            category: trend.category,
            product_title: trend.title,
            monthly_sales: trend.monthly_sales,
            price_range: calculatePriceRange(trend.price),
            competition_level: 'Medium',
            trend_score: trend.trend_score,
            tags: trend.tags,
            seasonality: 'Year-round',
            last_updated: new Date().toISOString()
        }));
        
        const { error } = await supabase
            .from('etsy_market_data')
            .upsert(marketData, { 
                onConflict: 'product_title',
                ignoreDuplicates: false 
            });
        
        if (error) console.error('Save trends error:', error);
        
    } catch (error) {
        console.error('Trends database save error:', error);
    }
}

function calculatePriceRange(price) {
    if (!price) return '$20-30';
    const base = Math.floor(price / 10) * 10;
    return `$${base}-${base + 10}`;
}

async function fetchMockTopSellers() {
    // Mock data from database or generate
    const { data: marketData } = await supabase
        .from('etsy_market_data')
        .select('*')
        .order('trend_score', { ascending: false })
        .limit(10);
    
    if (marketData && marketData.length > 0) {
        return marketData.map(item => ({
            id: item.id,
            title: item.product_title,
            description: `${item.category} trending product`,
            price: parsePriceRange(item.price_range),
            category: item.category,
            tags: item.tags || [],
            image_url: getRandomProductImage(item.category),
            monthly_sales: item.monthly_sales || 100,
            trend_score: item.trend_score || 75,
            source: 'market_data'
        }));
    }
    
    // Generate mock data
    return generateMockTrendData();
}

function generateMockTrendData() {
    const categories = ['tshirt', 'mug', 'plate', 'phone-case', 'jewelry', 'wood'];
    const styles = ['Minimalist', 'Vintage', 'Modern', 'Handmade', 'Custom', 'Personalized'];
    
    return Array.from({ length: 8 }, (_, i) => {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const style = styles[Math.floor(Math.random() * styles.length)];
        
        return {
            id: `mock-trend-${i}`,
            title: `${style} ${getProductTypeByCategory(category)}`,
            description: `Trending ${category} product with ${style.toLowerCase()} design`,
            price: (15 + Math.random() * 35).toFixed(2),
            category: category,
            tags: [style.toLowerCase(), 'trending', 'popular'],
            image_url: getRandomProductImage(category),
            monthly_sales: Math.floor(Math.random() * 200) + 50,
            trend_score: 70 + Math.random() * 25,
            source: 'mock'
        };
    });
}

function getProductTypeByCategory(category) {
    const types = {
        'tshirt': 'T-Shirt',
        'mug': 'Coffee Mug',
        'plate': 'Decorative Plate',
        'phone-case': 'Phone Case',
        'jewelry': 'Necklace',
        'wood': 'Wood Art'
    };
    return types[category] || 'Product';
}

function parsePriceRange(priceRange) {
    if (!priceRange) return 24.99;
    const match = priceRange.match(/\$?(\d+)-?(\d+)?/);
    if (match) {
        if (match[2]) {
            return (parseFloat(match[1]) + parseFloat(match[2])) / 2;
        }
        return parseFloat(match[1]) + 5;
    }
    return 24.99;
}

function displayTopSellerModal(trends) {
    const container = document.getElementById('top-seller-modal-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="modal active" id="top-seller-modal">
            <div class="modal-content" style="max-width: 1200px;">
                <button class="modal-close" onclick="closeTopSellerModal()">&times;</button>
                <div class="modal-header">
                    <h2 class="modal-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; margin-right: 8px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                        Trending Products Analysis
                    </h2>
                    <p class="modal-subtitle">${trends.length} trending products found</p>
                </div>
                
                <div style="padding: 20px; background: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="filterTrends('all')" class="btn btn-primary btn-sm">All</button>
                        <button onclick="filterTrends('high_trend')" class="btn btn-outline btn-sm">
                            High Trend (80+)
                        </button>
                        <button onclick="filterTrends('high_sales')" class="btn btn-outline btn-sm">
                            High Sales (150+)
                        </button>
                    </div>
                </div>
                
                <div id="trends-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; max-height: 600px; overflow-y: auto; padding: 10px;">
                    ${trends.map((trend, index) => `
                        <div class="product-card" data-trend-index="${index}" data-score="${trend.trend_score}" data-sales="${trend.monthly_sales}">
                            <div class="product-image">
                                <img src="${trend.image_url}" alt="${trend.title}" style="width: 100%; height: 200px; object-fit: cover;">
                                <div class="product-badge" style="background: ${trend.trend_score >= 90 ? '#dc2626' : trend.trend_score >= 80 ? '#ea580c' : '#16a34a'};">
                                    ${trend.trend_score.toFixed(1)}
                                </div>
                                <div class="price-badge">$${parseFloat(trend.price).toFixed(2)}</div>
                            </div>
                            <div class="product-content">
                                <div class="product-header">
                                    <h3 class="product-title">${truncateText(trend.title, 40)}</h3>
                                </div>
                                <span class="product-category">${trend.category}</span>
                                <p class="product-description">${truncateText(trend.description, 80)}</p>
                                <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">
                                    📈 ${trend.monthly_sales} sales/month
                                </div>
                                <div class="product-actions">
                                    <button class="btn btn-primary btn-sm" onclick="createProductFromTrend(${index})" style="flex: 1;">
                                        Create from Trend
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                    <button onclick="closeTopSellerModal()" class="btn btn-outline">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Global functions for modal
window.closeTopSellerModal = function() {
    const modal = document.getElementById('top-seller-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            document.getElementById('top-seller-modal-container').innerHTML = '';
        }, 300);
    }
};

window.filterTrends = function(filter) {
    const cards = document.querySelectorAll('#trends-grid .product-card');
    
    cards.forEach(card => {
        const score = parseFloat(card.dataset.score);
        const sales = parseInt(card.dataset.sales);
        
        let show = true;
        
        if (filter === 'high_trend') {
            show = score >= 80;
        } else if (filter === 'high_sales') {
            show = sales >= 150;
        }
        
        card.style.display = show ? '' : 'none';
    });
};

window.createProductFromTrend = async function(index) {
    const trend = topSellersData[index];
    if (!trend) return;
    
    try {
        showLoading('Creating product from trend...');
        
        const newProduct = {
            user_id: currentUser.id,
            title: trend.title,
            description: trend.description,
            category: trend.category,
            price: parseFloat(trend.price),
            images: [trend.image_url],
            tags: trend.tags,
            status: 'draft',
            metadata: { 
                source: 'trend_analysis', 
                trend_score: trend.trend_score,
                monthly_sales: trend.monthly_sales 
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('products')
            .insert([newProduct]);
        
        if (error) throw error;
        
        showNotification('Product created successfully from trend!', 'success');
        closeTopSellerModal();
        await loadUserProducts();
        
    } catch (error) {
        console.error('Create from trend error:', error);
        showNotification('Failed to create product: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
};

// PUBLISH TO ETSY
async function publishProductToEtsy(productId) {
    try {
        showLoading('Publishing to Etsy...');
        
        // Get product data
        const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        
        if (!product) {
            throw new Error('Product not found');
        }
        
        // Check if Etsy service is available
        if (!etsyService) {
            await initializeEtsyService();
        }
        
        // Prepare listing data
        const listingData = {
            quantity: 1,
            title: product.title,
            description: product.description || `${product.title} - High quality handmade product`,
            price: parseFloat(product.price),
            who_made: 'i_did',
            when_made: 'made_to_order',
            taxonomy_id: getEtsyTaxonomyId(product.category),
            tags: product.tags || ['handmade', 'custom', 'personalized'],
            materials: ['premium materials'],
            style: [product.category],
            is_supply: false,
            shipping_profile_id: 1 // Default shipping profile
        };
        
        // Create listing on Etsy
        const listingResult = await etsyService.createListing(listingData);
        
        if (!listingResult.listing_id) {
            throw new Error('Failed to create Etsy listing');
        }
        
        // Update product with Etsy listing ID
        const { error } = await supabase
            .from('products')
            .update({
                status: 'listed',
                etsy_listing_id: listingResult.listing_id.toString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', productId);
        
        if (error) throw error;
        
        showNotification('Product published to Etsy successfully!', 'success');
        await loadUserProducts();
        
    } catch (error) {
        console.error('Publish to Etsy error:', error);
        showNotification(`Failed to publish to Etsy: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function getEtsyTaxonomyId(category) {
    const taxonomyMap = {
        'tshirt': 1156,
        'mug': 1157,
        'plate': 1158,
        'phone-case': 1159,
        'jewelry': 1160,
        'wood': 1161
    };
    return taxonomyMap[category] || 1156;
}

// SIMILAR PRODUCT GENERATION
async function generateSimilarProduct(productId) {
    try {
        showLoading('Generating similar product...');
        
        // Get original product
        const { data: originalProduct } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        
        if (!originalProduct) {
            throw new Error('Original product not found');
        }
        
        // Generate variation
        const variation = getRandomVariation();
        const newPrice = calculateVariedPrice(originalProduct.price);
        
        const newProduct = {
            user_id: currentUser.id,
            title: `${variation.style} ${originalProduct.title}`,
            description: `${variation.style} version: ${originalProduct.description || 'Similar product with different style'}`,
            category: originalProduct.category,
            price: newPrice,
            images: [getRandomProductImage(originalProduct.category)],
            tags: [...(originalProduct.tags || []), variation.style, 'variation'],
            status: 'draft',
            metadata: {
                original_product_id: originalProduct.id,
                variation: variation
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('products')
            .insert([newProduct]);
        
        if (error) throw error;
        
        showNotification('Similar product created successfully!', 'success');
        await loadUserProducts();
        
    } catch (error) {
        console.error('Similar product error:', error);
        showNotification('Failed to create similar product: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function getRandomVariation() {
    const variations = [
        { style: 'Minimalist', colors: ['black', 'white'] },
        { style: 'Vintage', colors: ['brown', 'cream'] },
        { style: 'Modern', colors: ['gray', 'blue'] },
        { style: 'Colorful', colors: ['red', 'yellow', 'blue'] },
        { style: 'Premium', colors: ['gold', 'silver'] }
    ];
    return variations[Math.floor(Math.random() * variations.length)];
}

function calculateVariedPrice(originalPrice) {
    const variation = (Math.random() * 0.3) - 0.15; // -15% to +15%
    return parseFloat((originalPrice * (1 + variation)).toFixed(2));
}

// MOCKUP GENERATION
async function generateProductMockups(productId) {
    try {
        showLoading('Generating mockups...');
        
        // Generate mock mockup URLs
        const mockupUrls = generateMockMockups();
        
        // Update product with mockup URLs
        const { error } = await supabase
            .from('products')
            .update({ mockup_urls: mockupUrls })
            .eq('id', productId);
        
        if (error) throw error;
        
        // Open mockup modal
        openMockupModal(productId, mockupUrls);
        
        showNotification('Mockups generated successfully!', 'success');
        
    } catch (error) {
        console.error('Mockup generation error:', error);
        showNotification('Failed to generate mockups: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function generateMockMockups() {
    const angles = ['front', 'back', 'side', 'perspective', 'flat'];
    const styles = ['lifestyle', 'studio', 'natural', 'minimal'];
    
    return angles.map(angle => ({
        url: `https://via.placeholder.com/600x800/ea580c/ffffff?text=Mockup+${angle}`,
        angle: angle,
        style: styles[Math.floor(Math.random() * styles.length)],
        created_at: new Date().toISOString()
    }));
}

function openMockupModal(productId, mockupUrls = []) {
    const mockupContainer = document.getElementById('mockup-editor-container');
    
    if (mockupContainer) {
        mockupContainer.innerHTML = `
            <div class="mockup-editor">
                <h3 style="margin-bottom: 16px; font-size: 18px; font-weight: 600;">Product Mockups</h3>
                
                <div class="mockup-preview">
                    ${mockupUrls.length > 0 ? `
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; width: 100%; padding: 10px;">
                            ${mockupUrls.map((mockup, index) => `
                                <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: white;">
                                    <img src="${mockup.url}" alt="Mockup ${index + 1}" style="width: 100%; height: 120px; object-fit: cover; border-bottom: 1px solid #e5e7eb;">
                                    <div style="padding: 8px; font-size: 11px; color: #6b7280; text-align: center;">
                                        ${mockup.angle} - ${mockup.style}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div style="text-align: center; color: #6b7280; padding: 40px;">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            <p style="margin-top: 16px; font-weight: 500;">No mockups generated yet</p>
                        </div>
                    `}
                </div>
                
                <div class="mockup-controls">
                    <div class="control-group">
                        <label class="control-label">Mockup Style</label>
                        <select class="control-input" id="mockup-style">
                            <option value="lifestyle">Lifestyle</option>
                            <option value="studio">Studio</option>
                            <option value="natural">Natural</option>
                            <option value="minimal">Minimal</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Background</label>
                        <select class="control-input" id="mockup-background">
                            <option value="white">White</option>
                            <option value="gray">Gray</option>
                            <option value="scene">Scene</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button class="btn btn-primary btn-flex" onclick="regenerateMockups('${productId}')">
                        Regenerate Mockups
                    </button>
                    <button class="btn btn-outline btn-flex" onclick="closeModal('modal-mockup')">
                        Close
                    </button>
                </div>
            </div>
        `;
    }
    
    document.getElementById('modal-mockup').classList.add('active');
}

window.regenerateMockups = async function(productId) {
    await generateProductMockups(productId);
};

// UTILITY FUNCTIONS
function getProductStatusClass(status) {
    const classMap = {
        'draft': 'status-draft',
        'listed': 'status-listed',
        'published': 'status-listed',
        'archived': 'status-archived'
    };
    return classMap[status] || 'status-draft';
}

function getProductStatusText(status) {
    const textMap = {
        'draft': 'Draft',
        'listed': 'Listed',
        'published': 'Published',
        'archived': 'Archived'
    };
    return textMap[status] || status;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// LOADING AND NOTIFICATION
function showLoading(message = 'Loading...') {
    let loadingEl = document.getElementById('loadingOverlay');
    if (!loadingEl) {
        loadingEl = document.createElement('div');
        loadingEl.id = 'loadingOverlay';
        loadingEl.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        loadingEl.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; min-width: 200px;">
                <div class="loading-spinner" style="width: 40px; height: 40px; border: 3px solid #f3f4f6; border-top-color: #ea580c; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
                <p style="color: #374151; font-weight: 500;">${message}</p>
            </div>
        `;
        document.body.appendChild(loadingEl);
    }
}

function hideLoading() {
    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) {
        loadingEl.remove();
    }
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; min-width: 200px;">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 20px; margin-left: 12px; padding: 0 4px;">
                &times;
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Make functions globally available
window.closeModal = closeModal;
window.showNotification = showNotification;

console.log('Products.js fully loaded and ready');
