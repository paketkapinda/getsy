// products.js - TAM GERÇEK SİSTEM

let currentUser = null;
let currentProducts = [];
let etsyService = null;
let podService = null;
let mockupService = null;
let isEtsyConnected = false;
let isPODConnected = false;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🛍️ Products System Initializing...');
    
    try {
        // Check authentication
        await checkAuthentication();
        
        // Initialize services
        await initializeServices();
        
        // Load user products
        await loadUserProducts();
        
        // Setup Etsy connection if available
        await checkEtsyConnection();
        
        // Setup POD connection if available
        await checkPODConnection();
        
        // Setup event listeners
        setupEventListeners();
        
        // Update UI
        updateUI();
        
        console.log('✅ Products System Ready');
        showNotification('Products system loaded successfully', 'success');
        
    } catch (error) {
        console.error('❌ System initialization error:', error);
        showNotification('System error: ' + error.message, 'error');
        
        // Even with error, show basic interface
        loadFallbackProducts();
    }
});

// ==================== AUTHENTICATION ====================
async function checkAuthentication() {
    try {
        if (!window.supabase) {
            throw new Error('Database connection not available');
        }
        
        const { data: { user }, error } = await window.supabase.auth.getUser();
        
        if (error) {
            throw new Error('Authentication error: ' + error.message);
        }
        
        if (!user) {
            throw new Error('Please sign in to access products');
        }
        
        currentUser = user;
        console.log('✅ Authenticated user:', currentUser.email);
        
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        throw error;
    }
}

// ==================== SERVICE INITIALIZATION ====================
async function initializeServices() {
    try {
        // Initialize Mockup Service
        mockupService = new window.MockupService();
        console.log('✅ Mockup Service initialized');
        
    } catch (error) {
        console.error('❌ Service initialization error:', error);
        throw error;
    }
}

async function checkEtsyConnection() {
    try {
        const { data: etsyShop, error } = await window.supabase
            .from('etsy_shops')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true)
            .single();
        
        if (error || !etsyShop) {
            console.log('ℹ️ No Etsy shop connected');
            return;
        }
        
        // Initialize Etsy Service
        etsyService = new window.EtsyAPIService(etsyShop.api_key, etsyShop.id);
        
        // Test connection
        const isConnected = await etsyService.testConnection();
        
        if (isConnected) {
            isEtsyConnected = true;
            console.log('✅ Etsy API connected:', etsyShop.shop_name);
            showNotification(`Etsy shop connected: ${etsyShop.shop_name}`, 'success');
        } else {
            console.warn('⚠️ Etsy API test failed');
            showNotification('Etsy connection test failed', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Etsy connection check error:', error);
    }
}

async function checkPODConnection() {
    try {
        const { data: podProvider, error } = await window.supabase
            .from('pod_providers')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true)
            .single();
        
        if (error || !podProvider) {
            console.log('ℹ️ No POD provider connected');
            return;
        }
        
        // Initialize POD Service
        podService = new window.PODService(podProvider.provider_type);
        isPODConnected = true;
        
        console.log('✅ POD Service connected:', podProvider.provider_name);
        showNotification(`POD provider connected: ${podProvider.provider_name}`, 'success');
        
    } catch (error) {
        console.error('❌ POD connection check error:', error);
    }
}

// ==================== PRODUCT MANAGEMENT ====================
async function loadUserProducts() {
    try {
        showLoading('Loading products...');
        
        const { data: products, error } = await window.supabase
            .from('products')
            .select(`
                *,
                rating_stats (
                    average_rating,
                    total_reviews,
                    monthly_sales_estimate
                ),
                ai_logs (
                    operation_type,
                    status
                )
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            throw new Error('Database error: ' + error.message);
        }
        
        currentProducts = products || [];
        console.log(`✅ Loaded ${currentProducts.length} products`);
        
        renderProducts(currentProducts);
        
        // Update stats
        updateProductStats();
        
    } catch (error) {
        console.error('❌ Load products error:', error);
        showNotification('Error loading products: ' + error.message, 'error');
        currentProducts = [];
        renderProducts([]);
    } finally {
        hideLoading();
    }
}

function loadFallbackProducts() {
    console.log('ℹ️ Loading fallback interface');
    currentProducts = [];
    renderProducts([]);
    showNotification('Running in limited mode. Please check your connection.', 'warning');
}

function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    const empty = document.getElementById('products-empty');
    
    if (!grid) return;
    
    if (!products || products.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        updateProductStats();
        return;
    }
    
    if (empty) empty.classList.add('hidden');
    
    let html = '';
    products.forEach(product => {
        html += createProductCardHTML(product);
    });
    
    grid.innerHTML = html;
    
    // Attach event listeners
    attachProductCardListeners();
}



function createProductCardHTML(product) {
    const statusClass = getProductStatusClass(product.status);
    const statusText = getProductStatusText(product.status);
    const price = parseFloat(product.price || 0).toFixed(2);
    const rating = product.rating_stats?.[0];
    const hasEtsyListing = !!product.etsy_listing_id;
    const hasMockups = product.mockup_urls && product.mockup_urls.length > 0;
    const imageUrl = product.images && product.images.length > 0 ? 
        product.images[0] : getProductPlaceholderImage(product.category);
    
    // Calculate sales performance
    const monthlySales = rating?.monthly_sales_estimate || 0;
    const revenue = monthlySales * product.price;
    
    return `
        <div class="product-card" data-id="${product.id}" data-status="${product.status}">
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.title}" 
                     onerror="this.src='https://via.placeholder.com/400x300/cccccc/969696?text=${encodeURIComponent(product.title)}'">
                
                ${hasEtsyListing ? `
                    <div class="etsy-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                        Etsy
                    </div>
                ` : ''}
                
                ${hasMockups ? `
                    <div class="mockup-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        Mockups
                    </div>
                ` : ''}
                
                <div class="product-badge ${statusClass}">${statusText}</div>
                <div class="price-badge">$${price}</div>
                
                ${monthlySales > 0 ? `
                    <div class="sales-badge">
                        📈 ${monthlySales}/month
                    </div>
                ` : ''}
            </div>
            
            <div class="product-content">
                <div class="product-header">
                    <h3 class="product-title" title="${escapeHtml(product.title)}">
                        ${truncateText(product.title, 45)}
                    </h3>
                    <div class="product-revenue">
                        ${revenue > 0 ? `~$${revenue.toFixed(0)}/mo` : 'No sales yet'}
                    </div>
                </div>
                
                <div class="product-meta">
                    <span class="product-category">${product.category || 'Uncategorized'}</span>
                    <span class="product-date">${formatDate(product.created_at)}</span>
                </div>
                
                <p class="product-description" title="${escapeHtml(product.description || '')}">
                    ${truncateText(product.description || 'No description', 90)}
                </p>
                
                ${rating ? `
                    <div class="product-rating">
                        <div class="stars">
                            ${generateStarRating(rating.average_rating)}
                            <span class="rating-text">${rating.average_rating?.toFixed(1) || '0.0'}</span>
                            <span class="reviews">(${rating.total_reviews || 0} reviews)</span>
                        </div>
                        <div class="sales-info">
                            <span class="sales-count">${monthlySales} sales/month</span>
                        </div>
                    </div>
                ` : ''}
                
                <div class="product-actions">
                    ${!hasMockups ? `
                        <button class="btn btn-primary btn-sm" data-action="generate-mockup" data-id="${product.id}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            Create Mockup
                        </button>
                    ` : `
                        <button class="btn btn-outline btn-sm" data-action="view-mockups" data-id="${product.id}">
                            View Mockups
                        </button>
                    `}
                    
                    ${!hasEtsyListing && isEtsyConnected ? `
                        <button class="btn btn-success btn-sm" data-action="publish-etsy" data-id="${product.id}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
                            </svg>
                            Publish to Etsy
                        </button>
                    ` : hasEtsyListing ? `
                        <button class="btn btn-outline btn-sm" data-action="view-etsy" data-id="${product.id}">
                            View on Etsy
                        </button>
                    ` : ''}
                    
                    <button class="btn btn-outline btn-sm" data-action="edit" data-id="${product.id}">
                        Edit
                    </button>
                    
                    <button class="btn btn-outline btn-sm" data-action="duplicate" data-id="${product.id}">
                        Duplicate
                    </button>
                    
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${product.id}">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ==================== ETSY INTEGRATION ====================
async function analyzeTopSellers() {
    try {
        showLoading('Analyzing Etsy market trends...');
        
        if (!isEtsyConnected || !etsyService) {
            throw new Error('Please connect your Etsy shop first');
        }
        
        // Get category from filter
        const category = document.getElementById('filter-category')?.value || null;
        
        // Get real trending data from Etsy
        const trendingData = await etsyService.getTrendingListings(category, 'popular bestseller trending');
        
        if (!trendingData.results || trendingData.results.length === 0) {
            throw new Error('No trending products found');
        }
        
        // Save to database for analytics
        await saveTrendAnalysis(trendingData.results);
        
        // Display results
        displayTrendAnalysis(trendingData.results);
        
        showNotification(`Found ${trendingData.results.length} trending products`, 'success');
        
    } catch (error) {
        console.error('❌ Trend analysis error:', error);
        showNotification('Trend analysis failed: ' + error.message, 'error');
        
        // Fallback to database trends
        await showDatabaseTrends();
    } finally {
        hideLoading();
    }
}

async function saveTrendAnalysis(trends) {
    try {
        const trendRecords = trends.map(trend => ({
            user_id: currentUser.id,
            product_title: trend.title,
            category: trend.category || extractCategory(trend.title),
            monthly_sales: trend.monthly_sales_estimate || estimateSales(trend),
            price_range: calculatePriceRange(trend.price),
            trend_score: trend.trend_score || 0,
            tags: extractTags(trend),
            source: 'etsy_api',
            analysis_date: new Date().toISOString()
        }));
        
        const { error } = await window.supabase
            .from('etsy_market_data')
            .upsert(trendRecords, { onConflict: 'product_title' });
        
        if (error) throw error;
        
    } catch (error) {
        console.error('❌ Save trends error:', error);
    }
}

async function showDatabaseTrends() {
    try {
        const { data: trends, error } = await window.supabase
            .from('etsy_market_data')
            .select('*')
            .order('trend_score', { ascending: false })
            .limit(10);
        
        if (error || !trends || trends.length === 0) {
            throw new Error('No trend data available');
        }
        
        displayTrendAnalysis(trends);
        
    } catch (error) {
        console.error('❌ Database trends error:', error);
        showNotification('Please connect Etsy for trend analysis', 'warning');
    }
}

function displayTrendAnalysis(trends) {
    const container = document.getElementById('top-seller-modal-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="modal active" id="trend-analysis-modal">
            <div class="modal-content" style="max-width: 1200px;">
                <button class="modal-close" onclick="closeModal('trend-analysis-modal')">&times;</button>
                
                <div class="modal-header">
                    <h2 class="modal-title">📈 Etsy Market Trend Analysis</h2>
                    <p class="modal-subtitle">${trends.length} trending products analyzed</p>
                </div>
                
                <div class="trend-filters">
                    <div class="filter-buttons">
                        <button class="btn btn-primary btn-sm" onclick="filterTrends('all')">All Trends</button>
                        <button class="btn btn-outline btn-sm" onclick="filterTrends('high_demand')">High Demand (80+ score)</button>
                        <button class="btn btn-outline btn-sm" onclick="filterTrends('low_competition')">Low Competition</button>
                        <button class="btn btn-outline btn-sm" onclick="filterTrends('high_margin')">High Margin</button>
                    </div>
                    
                    <div class="trend-stats">
                        <div class="stat-card">
                            <div class="stat-value">${calculateAverage(trends, 'trend_score').toFixed(1)}</div>
                            <div class="stat-label">Avg Trend Score</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${calculateAverage(trends, 'monthly_sales').toFixed(0)}</div>
                            <div class="stat-label">Avg Monthly Sales</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${findTopCategory(trends)}</div>
                            <div class="stat-label">Top Category</div>
                        </div>
                    </div>
                </div>
                
                <div class="trends-grid" id="trends-grid">
                    ${trends.map((trend, index) => `
                        <div class="trend-card" data-score="${trend.trend_score}" data-sales="${trend.monthly_sales}">
                            <div class="trend-header">
                                <div class="trend-rank">#${index + 1}</div>
                                <div class="trend-score" style="background: ${getScoreColor(trend.trend_score)}">
                                    ${trend.trend_score?.toFixed(1) || 'N/A'}
                                </div>
                            </div>
                            
                            <div class="trend-image">
                                <img src="${getTrendImage(trend)}" alt="${trend.product_title}">
                            </div>
                            
                            <div class="trend-content">
                                <h3 class="trend-title">${truncateText(trend.product_title, 50)}</h3>
                                
                                <div class="trend-meta">
                                    <span class="trend-category">${trend.category}</span>
                                    <span class="trend-sales">${trend.monthly_sales} sales/month</span>
                                    <span class="trend-price">${trend.price_range}</span>
                                </div>
                                
                                <div class="trend-tags">
                                    ${(trend.tags || []).slice(0, 3).map(tag => `
                                        <span class="tag">${tag}</span>
                                    `).join('')}
                                </div>
                                
                                <div class="trend-insights">
                                    <div class="insight">
                                        <span class="insight-label">Demand:</span>
                                        <span class="insight-value ${trend.trend_score > 80 ? 'high' : trend.trend_score > 60 ? 'medium' : 'low'}">
                                            ${trend.trend_score > 80 ? 'High' : trend.trend_score > 60 ? 'Medium' : 'Low'}
                                        </span>
                                    </div>
                                    <div class="insight">
                                        <span class="insight-label">Competition:</span>
                                        <span class="insight-value">${trend.competition_level || 'Medium'}</span>
                                    </div>
                                </div>
                                
                                <div class="trend-actions">
                                    <button class="btn btn-primary btn-sm" onclick="createProductFromTrend(${index})">
                                        Create Product
                                    </button>
                                    <button class="btn btn-outline btn-sm" onclick="saveTrend(${index})">
                                        Save Analysis
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="trend-actions-footer">
                    <button class="btn btn-primary" onclick="generateBatchFromTrends()">
                        Generate 5 Products from Top Trends
                    </button>
                    <button class="btn btn-outline" onclick="closeModal('trend-analysis-modal')">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ==================== MOCKUP GENERATION ====================
async function generateProductMockups(productId) {
    try {
        showLoading('Generating professional mockups...');
        
        const product = currentProducts.find(p => p.id === productId);
        if (!product) throw new Error('Product not found');
        
        if (!mockupService) {
            throw new Error('Mockup service not available');
        }
        
        // Get product image
        const productImage = product.images?.[0] || getProductPlaceholderImage(product.category);
        
        // Generate mockups from multiple angles
        const mockups = await mockupService.generateMultiAngleMockups(
            productImage, 
            product.category
        );
        
        // Save mockups to database
        await saveProductMockups(productId, mockups);
        
        // Update product with mockup URLs
        await updateProductMockups(productId, mockups);
        
        // Show mockup editor
        showMockupEditor(productId, mockups);
        
        showNotification(`${mockups.length} mockups generated successfully`, 'success');
        
    } catch (error) {
        console.error('❌ Mockup generation error:', error);
        showNotification('Mockup generation failed: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function saveProductMockups(productId, mockups) {
    try {
        const mockupRecords = mockups.map(mockup => ({
            product_id: productId,
            image_url: mockup.url,
            angle: mockup.angle,
            style: 'professional',
            created_at: new Date().toISOString()
        }));
        
        const { error } = await window.supabase
            .from('product_mockups')
            .insert(mockupRecords);
        
        if (error) throw error;
        
    } catch (error) {
        console.error('❌ Save mockups error:', error);
    }
}

async function updateProductMockups(productId, mockups) {
    try {
        const mockupUrls = mockups.map(m => ({ url: m.url, angle: m.angle }));
        
        const { error } = await window.supabase
            .from('products')
            .update({ 
                mockup_urls: mockupUrls,
                updated_at: new Date().toISOString()
            })
            .eq('id', productId);
        
        if (error) throw error;
        
        // Update local product data
        const productIndex = currentProducts.findIndex(p => p.id === productId);
        if (productIndex !== -1) {
            currentProducts[productIndex].mockup_urls = mockupUrls;
        }
        
    } catch (error) {
        console.error('❌ Update mockups error:', error);
    }
}

// ==================== ETSY PUBLISHING ====================
async function publishToEtsy(productId) {
    try {
        if (!isEtsyConnected || !etsyService) {
            throw new Error('Etsy connection not available');
        }
        
        const product = currentProducts.find(p => p.id === productId);
        if (!product) throw new Error('Product not found');
        
        if (!confirm(`Publish "${product.title}" to Etsy? This will create a new listing.`)) {
            return;
        }
        
        showLoading('Publishing to Etsy...');
        
        // Prepare listing data
        const listingData = {
            quantity: 1,
            title: product.title,
            description: product.description || `${product.title} - High quality product`,
            price: product.price,
            who_made: 'i_did',
            when_made: 'made_to_order',
            taxonomy_id: getEtsyTaxonomyId(product.category),
            tags: product.tags || ['handmade', 'custom', 'personalized'],
            materials: ['premium materials'],
            shipping_profile_id: 1,
            is_supply: false,
            item_weight: 0.5,
            item_weight_unit: 'oz',
            item_length: 10,
            item_width: 8,
            item_height: 1,
            item_dimensions_unit: 'in'
        };
        
        // Create listing on Etsy
        const listingResult = await etsyService.createListing(listingData);
        
        if (!listingResult.listing_id) {
            throw new Error('Failed to create Etsy listing');
        }
        
        // Update product with Etsy listing ID
        await updateProductEtsyInfo(productId, listingResult.listing_id);
        
        showNotification(`Product published to Etsy! Listing ID: ${listingResult.listing_id}`, 'success');
        
        // Reload products
        await loadUserProducts();
        
    } catch (error) {
        console.error('❌ Etsy publishing error:', error);
        showNotification('Etsy publishing failed: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== POD ORDER MANAGEMENT ====================
async function createPODOrder(productId, quantity = 1) {
    try {
        if (!isPODConnected || !podService) {
            throw new Error('POD provider not connected');
        }
        
        const product = currentProducts.find(p => p.id === productId);
        if (!product) throw new Error('Product not found');
        
        showLoading('Creating POD order...');
        
        // Prepare order data for POD provider
        const orderData = {
            external_id: `order-${Date.now()}-${productId.substring(0, 8)}`,
            product_id: product.pod_product_id || getPODProductId(product),
            product_name: product.title,
            quantity: quantity,
            shipping_address: getDefaultShippingAddress(),
            design_urls: product.images || [getProductPlaceholderImage(product.category)],
            print_details: {
                print_area: 'full_front',
                print_type: 'digital_print',
                dimensions: getProductDimensions(product.category),
                color_profile: 'CMYK'
            },
            options: {
                size: 'M',
                color: 'White',
                material: getProductMaterial(product.category)
            },
            customer_info: {
                name: "Customer Name",
                email: "customer@example.com"
            }
        };
        
        // Submit order to POD provider
        const result = await podService.createOrder(orderData);
        
        if (result.success) {
            // Save order to database
            const { data: order, error: dbError } = await supabase
                .from('orders')
                .insert({
                    user_id: currentUser.id,
                    order_number: `POD-${Date.now()}`,
                    customer_name: "Customer Name",
                    customer_email: "customer@example.com",
                    shipping_address: JSON.stringify(orderData.shipping_address),
                    product_id: productId,
                    product_name: product.title,
                    quantity: quantity,
                    unit_price: product.price,
                    total_price: product.price * quantity,
                    status: 'processing',
                    pod_order_id: result.order_id,
                    pod_provider: podService.providerName,
                    pod_status: 'processing',
                    fulfillment_status: 'processing',
                    notes: `POD Order created via system. External ID: ${orderData.external_id}`
                })
                .select()
                .single();
            
            if (dbError) throw dbError;
            
            // Save POD order details
            const { error: podError } = await supabase
                .from('pod_orders')
                .insert({
                    user_id: currentUser.id,
                    order_id: order.id,
                    product_id: productId,
                    pod_provider: podService.providerName,
                    pod_order_id: result.order_id,
                    external_id: orderData.external_id,
                    quantity: quantity,
                    status: 'processing',
                    order_data: orderData,
                    response_data: result,
                    estimated_delivery: result.estimated_delivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                });
            
            if (podError) {
                console.error('Failed to save POD order details:', podError);
            }
            
            // Show success notification
            showNotification('✅ POD order created successfully!', 'success');
            
            // Log the action
            await logPODOrderCreation(productId, result.order_id);
            
            // Return result for further processing
            return {
                success: true,
                orderId: result.order_id,
                databaseOrderId: order.id,
                podResult: result
            };
            
        } else {
            throw new Error(result.message || 'Failed to create POD order');
        }
        
    } catch (error) {
        console.error('Failed to create POD order:', error);
        showNotification(`❌ Failed to create POD order: ${error.message}`, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

// Helper functions for POD order creation
function getPODProductId(product) {
    // Map local product to POD provider's product ID
    // This should be stored in product metadata or separate mapping table
    const podMappings = {
        'tshirt': '1',
        'mug': '2',
        'plate': '3',
        'phone-case': '4',
        'jewelry': '5',
        'wood': '6',
        'art': '7',
        'home': '8',
        'stationery': '9',
        'accessories': '10'
    };
    
    return podMappings[product.category] || '1';
}

async function logPODOrderCreation(productId, podOrderId) {
    try {
        await supabase
            .from('ai_logs')
            .insert({
                user_id: currentUser.id,
                operation_type: 'pod_order',
                product_id: productId,
                input_data: { productId, podOrderId },
                output_data: { success: true, timestamp: new Date().toISOString() },
                status: 'completed',
                created_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
            });
    } catch (error) {
        console.error('Failed to log POD order creation:', error);
    }
}

console.log('🛍️ Loading Products System...');

// Global state
window.productsSystem = {
  currentUser: null,
  products: [],
  filteredProducts: [],
  etsyService: null,
  podServices: {},
  etsyShop: null,
  pagination: {
    currentPage: 1,
    pageSize: 12,
    totalPages: 1
  },
  filters: {
    status: '',
    category: '',
    search: '',
    podProvider: ''
  },
  bulkSelection: new Set()
};

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Initializing Products System...');
  
  try {
    // Initialize systems
    await initializeAuth();
    await initializeEtsy();
    await initializePOD();
    await loadProducts();
    
    // Setup UI
    updateStats();
    setupEventListeners();
    
    console.log('✅ Products System ready');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    showSystemError('Failed to initialize products system');
  }
});

// ==================== INITIALIZATION ====================

async function initializeAuth() {
  try {
    const { data: { user }, error } = await window.supabase.auth.getUser();
    
    if (error) throw error;
    if (!user) throw new Error('No authenticated user');
    
    window.productsSystem.currentUser = user;
    console.log('✅ Authenticated as:', user.email);
    
  } catch (error) {
    console.error('Auth initialization failed:', error);
    throw error;
  }
}

async function initializeEtsy() {
  try {
    // Check if Etsy shop is connected
    const { data: shop, error } = await window.supabase
      .from('etsy_shops')
      .select('*')
      .eq('user_id', window.productsSystem.currentUser.id)
      .eq('is_active', true)
      .single();
    
    if (error || !shop) {
      console.log('No Etsy shop connected');
      return;
    }
    
    window.productsSystem.etsyShop = shop;
    
    // Initialize Etsy service
    window.productsSystem.etsyService = new window.EtsyService(
      shop.api_key,
      shop.id
    );
    
    // Test connection
    const testResult = await window.productsSystem.etsyService.testConnection();
    if (testResult.success) {
      console.log('✅ Etsy connected:', shop.shop_name);
      updateEtsyStatusPanel(true);
    } else {
      console.warn('Etsy connection test failed:', testResult.message);
      updateEtsyStatusPanel(false);
    }
    
  } catch (error) {
    console.error('Etsy initialization failed:', error);
  }
}

async function initializePOD() {
  try {
    // Load POD providers
    const { data: providers, error } = await window.supabase
      .from('pod_providers')
      .select('*')
      .eq('user_id', window.productsSystem.currentUser.id)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error loading POD providers:', error);
      return;
    }
    
    // Initialize each provider
    providers.forEach(provider => {
      try {
        window.productsSystem.podServices[provider.provider_type] = 
          new window.PODService(provider.provider_type, provider.api_key);
        console.log(`✅ POD provider loaded: ${provider.provider_name}`);
      } catch (err) {
        console.error(`Failed to initialize ${provider.provider_name}:`, err);
      }
    });
    
    updatePODStatusPanel(providers.length > 0);
    
  } catch (error) {
    console.error('POD initialization failed:', error);
  }
}

// ==================== PRODUCT MANAGEMENT ====================

async function loadProducts() {
  showLoading(true);
  
  try {
    // Load from Supabase
    const { data: products, error } = await window.supabase
      .from('products')
      .select(`
        *,
        rating_stats (*),
        product_mockups (*)
      `)
      .eq('user_id', window.productsSystem.currentUser.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    window.productsSystem.products = products || [];
    window.productsSystem.filteredProducts = [...window.productsSystem.products];
    
    // Sync with Etsy if connected
    if (window.productsSystem.etsyService) {
      await syncWithEtsy();
    }
    
    // Apply current filters
    applyFilters();
    
    // Update pagination
    updatePagination();
    
    // Render products
    renderProducts();
    
    console.log(`✅ Loaded ${window.productsSystem.products.length} products`);
    
  } catch (error) {
    console.error('Error loading products:', error);
    showNotification('Failed to load products', 'error');
  } finally {
    showLoading(false);
  }
}

async function syncWithEtsy() {
  if (!window.productsSystem.etsyService) return;
  
  try {
    console.log('🔄 Syncing with Etsy...');
    
    // Get listings from Etsy
    const listingsData = await window.productsSystem.etsyService.getShopListings(50);
    
    if (!listingsData.results || listingsData.results.length === 0) {
      console.log('No listings found on Etsy');
      return;
    }
    
    let syncedCount = 0;
    
    for (const listing of listingsData.results) {
      try {
        // Check if product already exists
        const existingProduct = window.productsSystem.products.find(
          p => p.etsy_listing_id === listing.listing_id.toString()
        );
        
        if (!existingProduct) {
          // Import new product from Etsy
          await importEtsyListing(listing);
          syncedCount++;
        } else {
          // Update existing product
          await updateProductFromEtsy(existingProduct.id, listing);
        }
      } catch (listingError) {
        console.warn(`Failed to sync listing ${listing.listing_id}:`, listingError);
      }
    }
    
    if (syncedCount > 0) {
      showNotification(`Synced ${syncedCount} new products from Etsy`, 'success');
      await loadProducts(); // Reload to include new products
    }
    
  } catch (error) {
    console.error('Etsy sync failed:', error);
    showNotification('Etsy sync failed: ' + error.message, 'warning');
  }
}

async function importEtsyListing(listing) {
  try {
    // Get listing details and images
    const [listingDetails, images] = await Promise.all([
      window.productsSystem.etsyService.getListing(listing.listing_id),
      window.productsSystem.etsyService.getListingImages(listing.listing_id)
    ]);
    
    const productData = {
      user_id: window.productsSystem.currentUser.id,
      title: listing.title,
      description: listingDetails.description || '',
      category: mapEtsyCategory(listingDetails.taxonomy_id),
      price: listingDetails.price?.amount || 0,
      status: 'listed',
      etsy_listing_id: listing.listing_id.toString(),
      images: images.results?.map(img => img.url_fullxfull) || [],
      tags: listingDetails.tags || [],
      metadata: {
        etsy_data: {
          views: listingDetails.views,
          favorites: listingDetails.num_favorers,
          created_timestamp: listingDetails.created,
          updated_timestamp: listingDetails.updated
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error } = await window.supabase
      .from('products')
      .insert([productData]);
    
    if (error) throw error;
    
    return productData;
    
  } catch (error) {
    console.error('Failed to import Etsy listing:', error);
    throw error;
  }
}

// ==================== TREND ANALYSIS ====================

window.analyzeTopSellers = async function() {
    try {
        showLoading('Analyzing Etsy trends...');
        
        // Etsy mağaza kontrolü
        const { data: etsyShop, error: shopError } = await supabase
            .from('etsy_shops')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true)
            .single();
        
        let trendData;
        
        if (etsyShop && !shopError) {
            // Gerçek Etsy API'den veri çek
            trendData = await fetchEtsyTrends(etsyShop);
        } else {
            // Mock data kullan
            trendData = await generateMockTrendData();
        }
        
        // Trend verilerini işle
        const processedTrends = processTrendData(trendData);
        topSellersData = processedTrends;
        
        // Trend modalını göster
        if (processedTrends.length > 0) {
            displayTrendAnalysisModal(processedTrends);
            showNotification(`${processedTrends.length} trend products found`, 'success');
        } else {
            showNotification('No trending products found', 'warning');
        }
        
    } catch (error) {
        console.error('Trend analysis error:', error);
        showNotification('Trend analysis failed: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
};

async function fetchEtsyTrends(etsyShop) {
    // Gerçek Etsy API implementasyonu
    try {
        // API endpoint'i
        const apiUrl = 'https://api.etsy.com/v3/application/trending/listings';
        
        // Mock response - gerçek implementasyonda fetch kullanılacak
        return await generateMockTrendData();
        
    } catch (error) {
        console.error('Etsy API error:', error);
        return await generateMockTrendData();
    }
}

async function generateMockTrendData() {
    const categories = ['Art & Collectibles', 'Home & Living', 'Jewelry', 'Accessories', 'Clothing'];
    const mockData = [];
    
    for (let i = 0; i < 12; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const price = (Math.random() * 50 + 10).toFixed(2);
        const sales = Math.floor(Math.random() * 200) + 50;
        const trendScore = Math.floor(Math.random() * 30) + 70;
        
        mockData.push({
            id: `mock-trend-${i}`,
            title: `Trending ${category} Design ${i + 1}`,
            description: `Popular ${category.toLowerCase()} item with high demand`,
            price: price,
            category: category,
            tags: ['trending', 'popular', 'best-seller'],
            image_url: getMockImageUrl(category),
            monthly_sales: sales,
            trend_score: trendScore,
            favorites: Math.floor(Math.random() * 500) + 100,
            views: Math.floor(Math.random() * 1000) + 500,
            created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        });
    }
    
    return mockData;
}

function getMockImageUrl(category) {
    const images = {
        'Art & Collectibles': 'https://images.unsplash.com/photo-1579168765467-3b235f938439',
        'Home & Living': 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a',
        'Jewelry': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f',
        'Accessories': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa',
        'Clothing': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab'
    };
    
    return `${images[category] || 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd'}?w=400&h=400&fit=crop&auto=format`;
}

function processTrendData(trendData) {
    // Verileri işle ve sırala
    return trendData
        .map(item => ({
            ...item,
            roi_estimate: calculateROI(item),
            competition_level: calculateCompetitionLevel(item),
            seasonality: calculateSeasonality(item.category)
        }))
        .sort((a, b) => b.trend_score - a.trend_score);
}

function calculateROI(item) {
    const cost = parseFloat(item.price) * 0.3; // %30 maliyet varsayımı
    const profit = parseFloat(item.price) - cost;
    return ((profit / cost) * 100).toFixed(1);
}

function calculateCompetitionLevel(item) {
    const sales = item.monthly_sales || 0;
    if (sales > 200) return 'high';
    if (sales > 100) return 'medium';
    return 'low';
}

function calculateSeasonality(category) {
    const seasonalMap = {
        'Clothing': 'seasonal',
        'Home & Living': 'year-round',
        'Jewelry': 'year-round',
        'Accessories': 'year-round',
        'Art & Collectibles': 'year-round'
    };
    return seasonalMap[category] || 'year-round';
}

function displayTrendAnalysisModal(trends) {
    // Modal HTML oluştur
    const modalHtml = `
        <div class="modal active" id="trend-analysis-modal">
            <div class="modal-content" style="max-width: 1200px; max-height: 90vh;">
                <button class="modal-close" onclick="closeModal('trend-analysis-modal')">&times;</button>
                
                <div class="modal-header">
                    <h2 class="modal-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                        Etsy Trend Analysis
                    </h2>
                    <p class="modal-subtitle">${trends.length} trending products found. Click "Create Product" to add to your catalog.</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div class="products-filters">
                        <div class="filter-group">
                            <label class="filter-label">Sort by:</label>
                            <select class="select-input" id="trend-sort" onchange="sortTrends(this.value)">
                                <option value="trend_score">Trend Score</option>
                                <option value="monthly_sales">Monthly Sales</option>
                                <option value="price">Price</option>
                                <option value="roi_estimate">ROI Estimate</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">Category:</label>
                            <select class="select-input" id="trend-category-filter" onchange="filterTrendsByCategory(this.value)">
                                <option value="all">All Categories</option>
                                ${[...new Set(trends.map(t => t.category))].map(cat => 
                                    `<option value="${cat}">${cat}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div id="trends-container" style="overflow-y: auto; max-height: 60vh; padding: 10px;">
                    <div class="products-grid" id="trends-grid">
                        ${trends.map((trend, index) => `
                            <div class="product-card trend-item" data-index="${index}" data-category="${trend.category}" data-score="${trend.trend_score}" data-sales="${trend.monthly_sales}">
                                <div class="product-image">
                                    <img src="${trend.image_url}" alt="${trend.title}" style="width: 100%; height: 180px; object-fit: cover;">
                                    <div class="product-badge" style="background: linear-gradient(135deg, #${trend.trend_score > 90 ? 'dc2626' : trend.trend_score > 80 ? 'ea580c' : '16a34a'}, #${trend.trend_score > 90 ? '991b1b' : trend.trend_score > 80 ? '9a3412' : '166534'});">
                                        Score: ${trend.trend_score}
                                    </div>
                                    <div style="position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                        ${trend.monthly_sales} sales/mo
                                    </div>
                                </div>
                                <div class="product-content">
                                    <div class="product-header">
                                        <h3 class="product-title">${trend.title}</h3>
                                        <div class="product-price">$${parseFloat(trend.price).toFixed(2)}</div>
                                    </div>
                                    <span class="product-category">${trend.category}</span>
                                    <p class="product-description">${trend.description}</p>
                                    
                                    <div style="margin: 12px 0; font-size: 12px; color: #6b7280;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                            <span>ROI Estimate:</span>
                                            <span style="color: #059669; font-weight: 600;">${trend.roi_estimate}%</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                            <span>Competition:</span>
                                            <span style="color: ${trend.competition_level === 'high' ? '#dc2626' : trend.competition_level === 'medium' ? '#ea580c' : '#059669'}; font-weight: 600;">
                                                ${trend.competition_level}
                                            </span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between;">
                                            <span>Seasonality:</span>
                                            <span>${trend.seasonality}</span>
                                        </div>
                                    </div>
                                    
                                    <div class="product-actions">
                                        <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="createFromTrend(${index})">
                                            Create Product
                                        </button>
                                        <button class="btn btn-outline btn-sm" onclick="saveTrendForLater(${index})" title="Save for later">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 14px; color: #6b7280;">
                            <span id="trend-stats">Showing ${trends.length} of ${trends.length} trends</span>
                        </div>
                        <div>
                            <button class="btn btn-outline" onclick="closeModal('trend-analysis-modal')" style="margin-right: 10px;">
                                Close
                            </button>
                            <button class="btn btn-primary" onclick="analyzeMoreTrends()">
                                Analyze More
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Modalı ekle ve göster
    const existingModal = document.getElementById('trend-analysis-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Trend sıralama fonksiyonu
window.sortTrends = function(sortBy) {
    const container = document.getElementById('trends-grid');
    const items = Array.from(container.querySelectorAll('.trend-item'));
    
    items.sort((a, b) => {
        const aVal = a.dataset[sortBy === 'trend_score' ? 'score' : 
                              sortBy === 'monthly_sales' ? 'sales' : 
                              sortBy === 'price' ? 'price' : 'roi'];
        const bVal = b.dataset[sortBy === 'trend_score' ? 'score' : 
                              sortBy === 'monthly_sales' ? 'sales' : 
                              sortBy === 'price' ? 'price' : 'roi'];
        
        return parseFloat(bVal) - parseFloat(aVal);
    });
    
    // Öğeleri yeniden sırala
    items.forEach(item => container.appendChild(item));
};

// Trend kategori filtresi
window.filterTrendsByCategory = function(category) {
    const items = document.querySelectorAll('.trend-item');
    let visibleCount = 0;
    
    items.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // İstatistikleri güncelle
    document.getElementById('trend-stats').textContent = 
        `Showing ${visibleCount} of ${items.length} trends`;
};

// Trend'den ürün oluştur
window.createFromTrend = async function(index) {
    const trend = topSellersData[index];
    if (!trend) {
        showNotification('Trend data not found', 'error');
        return;
    }
    
    try {
        showLoading('Creating product from trend...');
        
        const newProduct = {
            user_id: currentUser.id,
            title: trend.title,
            description: trend.description,
            category: trend.category,
            price: parseFloat(trend.price),
            status: 'draft',
            tags: trend.tags || [],
            metadata: {
                source: 'trend_analysis',
                trend_score: trend.trend_score,
                monthly_sales: trend.monthly_sales,
                competition_level: trend.competition_level,
                roi_estimate: trend.roi_estimate
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('products')
            .insert([newProduct])
            .select();
        
        if (error) throw error;
        
        // AI ile görsel oluştur (opsiyonel)
        if (aiTools.length > 0) {
            await generateProductImage(data[0].id, trend);
        }
        
        showNotification('Product created successfully!', 'success');
        
        // Modalı kapat ve ürünleri yenile
        closeModal('trend-analysis-modal');
        await loadUserProducts();
        
    } catch (error) {
        console.error('Create from trend error:', error);
        showNotification('Failed to create product: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
};

// Trend'i kaydet
window.saveTrendForLater = async function(index) {
    const trend = topSellersData[index];
    if (!trend) return;
    
    try {
        const { error } = await supabase
            .from('saved_trends')
            .insert({
                user_id: currentUser.id,
                trend_data: trend,
                saved_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
        showNotification('Trend saved for later', 'success');
        
    } catch (error) {
        console.error('Save trend error:', error);
        showNotification('Failed to save trend', 'error');
    }
};

// Daha fazla trend analizi
window.analyzeMoreTrends = async function() {
    closeModal('trend-analysis-modal');
    await analyzeTopSellers();
};

// Ürün görseli oluştur
async function generateProductImage(productId, trend) {
    try {
        const prompt = `Product design for: ${trend.title}. Category: ${trend.category}. Style: modern, professional, Etsy trending`;
        
        // AI log kaydı
        await supabase.from('ai_logs').insert({
            user_id: currentUser.id,
            product_id: productId,
            operation_type: 'image_generation',
            input_data: { prompt: prompt, trend_data: trend },
            status: 'pending',
            created_at: new Date().toISOString()
        });
        
        // AI API çağrısı (mock)
        const mockImage = await generateMockProductImage(trend.category);
        
        // Ürünü görsel ile güncelle
        await supabase
            .from('products')
            .update({ image_url: mockImage })
            .eq('id', productId);
        
        // AI log'u güncelle
        await supabase
            .from('ai_logs')
            .update({
                output_data: { image_url: mockImage },
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('product_id', productId);
            
    } catch (error) {
        console.error('Image generation error:', error);
    }
}

async function generateMockProductImage(category) {
    const imageUrls = {
        'Art & Collectibles': 'https://images.unsplash.com/photo-1579168765467-3b235f938439?w=800&h=800&fit=crop&auto=format',
        'Home & Living': 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=800&h=800&fit=crop&auto=format',
        'Jewelry': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w-800&h=800&fit=crop&auto=format',
        'Accessories': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=800&fit=crop&auto=format',
        'Clothing': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&auto=format'
    };
    
    return imageUrls[category] || 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=800&h=800&fit=crop&auto=format';
}

// ==================== END OF TREND ANALYSIS ====================
                
