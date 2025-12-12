// products.js - GERÇEK SİSTEM: Etsy'den ürün çek → AI ile benzerini oluştur

// ESKİ KODUNUZDAKİ DEĞİŞKENLER
let currentUser = null;
let currentProducts = [];
let etsyService = null;
let isEtsyConnected = false;
let topSellersData = [];

// Eski kodunuzda bu global değişkenler vardı:
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
// Sayfa yüklendiğinde - ESKİ KODUNUZA UYGUN
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🛍️ Products System Initializing...');
    
    try {
        // ESKİ KODUNUZDAKİ AUTH KONTROLÜ
        if (!window.supabaseClient && !window.supabase) {
            throw new Error('Database connection not available');
        }
        
        // Hangi supabase client kullanılıyor?
        const supabaseClient = window.supabaseClient || window.supabase;
        
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error) {
            throw new Error('Authentication error: ' + error.message);
        }
        
        if (!user) {
            throw new Error('Please sign in to access products');
        }
        
        currentUser = user;
        window.productsSystem.currentUser = user;
        console.log('✅ Authenticated user:', currentUser.email);
        
        // Etsy bağlantısını kontrol et
        await checkEtsyConnection();
        
        // Ürünleri yükle
        await loadUserProducts();
        
        // Event listener'ları kur
        setupEventListeners();
        
        // Update UI (eski kodunuzdaki)
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

// ==================== ETSY BAĞLANTISI ====================
async function checkEtsyConnection() {
    try {
        const { data: etsyShop, error } = await supabase
            .from('etsy_shops')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true)
            .single();
        
        if (error || !etsyShop) {
            console.log('ℹ️ No Etsy shop connected');
            document.getElementById('etsy-status').textContent = 'Bağlı Değil';
            return;
        }
        
        // Etsy servisini başlat
        etsyService = new window.EtsyAPIService(etsyShop.api_key, etsyShop.shop_id);
        isEtsyConnected = true;
        
        console.log('✅ Etsy connected:', etsyShop.shop_name);
        document.getElementById('etsy-status').textContent = etsyShop.shop_name;
        
    } catch (error) {
        console.error('Etsy connection error:', error);
    }
}

// ==================== ETSY'DEN GERÇEK TREND ÜRÜNLERİ ÇEK ====================
window.analyzeTopSellers = async function() {
    try {
        if (!isEtsyConnected || !etsyService) {
            alert('Önce Etsy mağazanızı bağlayın! Ayarlar → Etsy Bağlantısı');
            return;
        }
        
        showLoading('Etsy trend ürünleri aranıyor...');
        
        // Kullanıcıdan parametreleri al
        const keywords = document.getElementById('trend-keywords').value || 'best seller';
        const category = document.getElementById('trend-category').value;
        
        // GERÇEK ETSY API ÇAĞRISI
        const searchParams = {
            keywords: keywords,
            category: category || undefined,
            sort_on: 'score', // Popülerlik sıralaması
            limit: 20,
            min_price: 10,
            max_price: 100
        };
        
        // Etsy'den listingleri çek
        const listings = await etsyService.searchListings(searchParams);
        
        if (!listings || listings.length === 0) {
            hideLoading();
            alert('Bu kriterlerde ürün bulunamadı. Farklı anahtar kelimeler deneyin.');
            return;
        }
        
        // Listing detaylarını al
        const detailedListings = await getListingDetails(listings);
        
        // Analiz et ve sırala
        topSellersData = analyzeListings(detailedListings);
        
        // Modalda göster
        showTrendAnalysisModal(topSellersData);
        
        hideLoading();
        
    } catch (error) {
        console.error('Trend analysis error:', error);
        alert('Trend analizi başarısız: ' + error.message);
        hideLoading();
    }
};

// Listing detaylarını al
async function getListingDetails(listings) {
    const detailedListings = [];
    
    for (const listing of listings.slice(0, 10)) { // İlk 10 listing
        try {
            // Listing detayları
            const details = await etsyService.getListing(listing.listing_id);
            
            // Listing görselleri
            const images = await etsyService.getListingImages(listing.listing_id);
            
            // Benzer listingleri bul (kategorideki diğer ürünler)
            const similarListings = await findSimilarListings(details);
            
            detailedListings.push({
                id: listing.listing_id,
                title: listing.title,
                description: details.description || '',
                price: details.price?.amount || 0,
                currency: details.price?.currency_code || 'USD',
                category: details.taxonomy_path?.[0] || 'Uncategorized',
                tags: details.tags || [],
                images: images.map(img => img.url_fullxfull),
                primary_image: images[0]?.url_fullxfull || '',
                views: details.views || 0,
                favorites: details.num_favorers || 0,
                created_date: details.creation_timestamp,
                similar_count: similarListings.length,
                etsy_data: details
            });
            
        } catch (e) {
            console.warn(`Listing ${listing.listing_id} detay alınamadı:`, e);
        }
    }
    
    return detailedListings;
}

// Benzer listingleri bul
async function findSimilarListings(listingDetails) {
    try {
        // Aynı kategorideki listingleri ara
        const similar = await etsyService.searchListings({
            keywords: listingDetails.tags?.[0] || '',
            category: listingDetails.taxonomy_id,
            limit: 5
        });
        
        return similar || [];
    } catch (e) {
        return [];
    }
}

// Listingleri analiz et
function analyzeListings(listings) {
    return listings.map(listing => {
        // Trend skoru hesapla
        const trendScore = calculateTrendScore(listing);
        
        // Benzerlik oranını hesapla (düşük benzerlik = daha iyi fırsat)
        const uniquenessScore = calculateUniquenessScore(listing);
        
        // Potansiyel kârı hesapla
        const profitPotential = calculateProfitPotential(listing);
        
        return {
            ...listing,
            trend_score: trendScore,
            uniqueness_score: uniquenessScore,
            profit_potential: profitPotential,
            total_score: (trendScore + uniquenessScore + profitPotential) / 3,
            competition_level: listing.similar_count > 50 ? 'Yüksek' : 
                              listing.similar_count > 20 ? 'Orta' : 'Düşük'
        };
    }).sort((a, b) => b.total_score - a.total_score); // En yüksek skora göre sırala
}

// ==================== TREND ÜRÜNDEN BENZER ÜRÜN OLUŞTUR ====================
window.createSimilarProduct = async function(trendIndex) {
    const trend = topSellersData[trendIndex];
    if (!trend) {
        alert('Trend verisi bulunamadı');
        return;
    }
    
    try {
        showLoading('Trend üründen benzer ürün oluşturuluyor...');
        
        // 1. API_TOOLS tablosundan AI servisini al
        const aiService = await getAIService();
        
        // 2. ORİJİNAL ÜRÜNDEN FARKLI AMA BENZER İÇERİK OLUŞTUR
        const newContent = await generateSimilarContent(aiService, trend);
        
        // 3. ORİJİNALDEN FARKLI AMA BENZER GÖRSEL OLUŞTUR
        const newImage = await generateSimilarImage(aiService, trend);
        
        // 4. YENİ ÜRÜNÜ VERİTABANINA KAYDET
        const newProduct = await saveNewProduct(newContent, newImage, trend);
        
        // 5. MOCKUP OLUŞTUR
        await generateMockupsForProduct(newProduct.id, newImage);
        
        // 6. SONUÇ
        hideLoading();
        showSuccess('✅ Benzer ürün başarıyla oluşturuldu!');
        
        // Ürünleri yenile
        await loadUserProducts();
        
        // Ürün editörünü aç
        openProductEditor(newProduct.id);
        
    } catch (error) {
        hideLoading();
        console.error('Create similar product error:', error);
        alert('Ürün oluşturma başarısız: ' + error.message);
    }
};

// AI servisini al
async function getAIService() {
    const { data: aiTools, error } = await supabase
        .from('api_tools')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('tool_type', 'ai_generation')
        .eq('is_active', true)
        .single();
    
    if (error || !aiTools) {
        throw new Error('AI üretim servisi bulunamadı. Lütfen ayarlardan ekleyin.');
    }
    
    return aiTools;
}

// BENZER İÇERİK OLUŞTUR (orijinalden farklı ama aynı tarzda)
async function generateSimilarContent(aiService, originalTrend) {
    const prompt = `
        ORİJİNAL ETÜRÜN:
        Başlık: "${originalTrend.title}"
        Kategori: ${originalTrend.category}
        Etiketler: ${originalTrend.tags.join(', ')}
        Açıklama: ${originalTrend.description.substring(0, 200)}...
        
        GÖREV:
        Bu üründen İLHAM ALARAK yeni bir ürün oluştur.
        Orijinalin KOPYASI DEĞİL, BENZERİ OLSUN.
        
        İSTENENLER:
        1. ORİJİNALDEN FARKLI ama aynı tarzda bir başlık
        2. ORİJİNALDEN FARKLI ama aynı temada açıklama
        3. Benzer etiketler (aynıları değil)
        4. Fiyat önerisi (orijinal: $${originalTrend.price})
        
        KRİTERLER:
        - Orijinalin kopyası olmayacak
        - Aynı hedef kitleye hitap edecek
        - Benzer kalitede olacak
        - Telif hakkı sorunu olmayacak
    `;
    
    // AI servisine gönder
    const response = await callAIService(aiService.api_key, aiService.endpoint, {
        prompt: prompt,
        model: aiService.model || 'gpt-4',
        max_tokens: 500
    });
    
    // Response'u parse et
    return parseAIResponse(response);
}

// BENZER GÖRSEL OLUŞTUR (orijinalden farklı ama aynı tarzda)
async function generateSimilarImage(aiService, originalTrend) {
    // Görsel AI servisini al
    const { data: imageAIService, error } = await supabase
        .from('api_tools')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('tool_type', 'ai_image')
        .eq('is_active', true)
        .single();
    
    if (error || !imageAIService) {
        // Görsel servisi yoksa, orijinal görseli değiştir
        return await modifyOriginalImage(originalTrend.primary_image);
    }
    
    const imagePrompt = `
        Create a product image INSPIRED BY but NOT COPYING this Etsy product.
        
        ORIGINAL PRODUCT: ${originalTrend.title}
        CATEGORY: ${originalTrend.category}
        STYLE: ${extractStyleFromTags(originalTrend.tags)}
        
        REQUIREMENTS:
        - SIMILAR STYLE but DIFFERENT DESIGN
        - SAME QUALITY LEVEL
        - NO COPYRIGHT INFRINGEMENT
        - PROFESSIONAL PRODUCT PHOTOGRAPHY
        - ETSY-OPTIMIZED
    `;
    
    // AI görsel oluştur
    const imageUrl = await callImageAIService(
        imageAIService.api_key,
        imageAIService.endpoint,
        imagePrompt,
        '1024x1024'
    );
    
    return imageUrl;
}

// Orijinal görseli değiştir (AI yoksa)
async function modifyOriginalImage(originalImageUrl) {
    // Basit bir filtre/efekt uygula
    // Bu kısım canvas ile görsel işleme yapabilir
    return originalImageUrl; // Geçici
}

// Yeni ürünü kaydet
async function saveNewProduct(content, imageUrl, originalTrend) {
    const newProduct = {
        user_id: currentUser.id,
        title: content.title,
        description: content.description,
        category: originalTrend.category,
        price: content.suggested_price || (originalTrend.price * 0.9), // %10 daha ucuz
        status: 'draft',
        tags: content.tags,
        images: [imageUrl],
        metadata: {
            generated_from_trend: true,
            original_trend_id: originalTrend.id,
            original_title: originalTrend.title,
            similarity_score: calculateSimilarityScore(content, originalTrend),
            ai_generated: true,
            generation_date: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    const { data: product, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();
    
    if (error) throw error;
    
    // AI log kaydı
    await supabase.from('ai_logs').insert({
        user_id: currentUser.id,
        product_id: product.id,
        operation_type: 'similar_product_generation',
        input_data: { original_trend: originalTrend },
        output_data: { new_product: newProduct },
        status: 'completed',
        created_at: new Date().toISOString()
    });
    
    return product;
}

// Mockup oluştur
async function generateMockupsForProduct(productId, productImage) {
    try {
        // Mockup servisini al
        const { data: mockupService, error } = await supabase
            .from('api_tools')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('tool_type', 'mockup')
            .eq('is_active', true)
            .single();
        
        if (error || !mockupService) return;
        
        // Mockup oluştur
        const mockups = await callMockupService(
            mockupService.api_key,
            mockupService.endpoint,
            productImage,
            'tshirt' // Ürün kategorisine göre değişir
        );
        
        // Mockupları kaydet
        await saveMockups(productId, mockups);
        
    } catch (error) {
        console.error('Mockup generation error:', error);
        // Mockup olmadan da devam et
    }
}

// ==================== ÇOKLU PLATFORM YAYINLAMA ====================
window.publishToPlatform = async function(productId, platform) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) {
        alert('Ürün bulunamadı');
        return;
    }
    
    try {
        showLoading(`${platform} yayınlanıyor...`);
        
        switch(platform) {
            case 'etsy':
                await publishToEtsy(product);
                break;
            case 'amazon':
                await publishToAmazon(product);
                break;
            case 'shopify':
                await publishToShopify(product);
                break;
            default:
                throw new Error('Desteklenmeyen platform');
        }
        
        hideLoading();
        showSuccess(`✅ Ürün ${platform} yayınlandı!`);
        
        // Ürünleri yenile
        await loadUserProducts();
        
    } catch (error) {
        hideLoading();
        console.error('Publish error:', error);
        alert(`${platform} yayınlama başarısız: ${error.message}`);
    }
};

// Etsy yayınlama
async function publishToEtsy(product) {
    if (!isEtsyConnected || !etsyService) {
        throw new Error('Etsy bağlantısı yok');
    }
    
    // Etsy shop bilgilerini al
    const { data: etsyShop } = await supabase
        .from('etsy_shops')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_active', true)
        .single();
    
    // Listing oluştur
    const listingData = {
        quantity: 1,
        title: product.title,
        description: product.description,
        price: product.price,
        who_made: 'i_did',
        when_made: 'made_to_order',
        taxonomy_id: getEtsyTaxonomyId(product.category),
        tags: product.tags.slice(0, 13), // Etsy max 13 tag
        materials: ['premium material'],
        is_supply: false,
        shipping_profile_id: etsyShop?.shipping_profile_id || 1
    };
    
    const result = await etsyService.createListing(listingData);
    
    // Ürünü güncelle
    await supabase
        .from('products')
        .update({
            etsy_listing_id: result.listing_id,
            status: 'published',
            published_at: new Date().toISOString()
        })
        .eq('id', product.id);
}

// Amazon yayınlama
async function publishToAmazon(product) {
    // api_tools'dan Amazon servisini al
    const { data: amazonService, error } = await supabase
        .from('api_tools')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('tool_type', 'amazon')
        .eq('is_active', true)
        .single();
    
    if (error) throw new Error('Amazon servisi bulunamadı');
    
    // Amazon API çağrısı
    // ... Amazon listing oluşturma kodu
}

// ==================== UI FONKSİYONLARI ====================
function showTrendAnalysisModal(trends) {
    const modalHtml = `
        <div class="modal active" id="trends-modal">
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h2>📈 Etsy Trend Analizi</h2>
                    <button class="modal-close" onclick="closeModal('trends-modal')">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="trends-grid">
                        ${trends.map((trend, index) => `
                            <div class="trend-card">
                                <div class="trend-image">
                                    <img src="${trend.primary_image}" alt="${trend.title}">
                                    <div class="trend-score">Skor: ${trend.total_score.toFixed(1)}</div>
                                </div>
                                
                                <div class="trend-content">
                                    <h3>${trend.title}</h3>
                                    <div class="trend-meta">
                                        <span class="price">$${trend.price}</span>
                                        <span class="category">${trend.category}</span>
                                        <span class="competition ${trend.competition_level.toLowerCase()}">
                                            ${trend.competition_level}
                                        </span>
                                    </div>
                                    
                                    <div class="trend-stats">
                                        <div>👁️ ${trend.views} görüntülenme</div>
                                        <div>❤️ ${trend.favorites} favori</div>
                                        <div>📅 ${new Date(trend.created_date * 1000).toLocaleDateString()}</div>
                                    </div>
                                    
                                    <div class="trend-tags">
                                        ${trend.tags.slice(0, 5).map(tag => 
                                            `<span class="tag">${tag}</span>`
                                        ).join('')}
                                    </div>
                                    
                                    <div class="trend-actions">
                                        <button class="btn btn-primary" onclick="createSimilarProduct(${index})">
                                            BENZERİNİ OLUŞTUR
                                        </button>
                                        <button class="btn btn-outline" onclick="analyzeTrendDetails(${index})">
                                            DETAYLI ANALİZ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <p>${trends.length} trend ürün bulundu. "BENZERİNİ OLUŞTUR" butonu ile orijinalden farklı ama benzer ürünler oluşturabilirsiniz.</p>
                </div>
            </div>
        </div>
    `;
    
    // Eski modalı temizle
    const oldModal = document.getElementById('trends-modal');
    if (oldModal) oldModal.remove();
    
    // Yeni modalı ekle
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ==================== YARDIMCI FONKSİYONLAR ====================
// AI servis çağrısı
async function callAIService(apiKey, endpoint, data) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('AI servis hatası');
    return await response.json();
}

// Görsel AI servis çağrısı
async function callImageAIService(apiKey, endpoint, prompt, size) {
    // Stable Diffusion/DALL-E/Midjourney API çağrısı
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            size: size,
            n: 1
        })
    });
    
    const data = await response.json();
    return data.data[0].url; // OpenAI/DALL-E formatı
}

// Mockup servis çağrısı
async function callMockupService(apiKey, endpoint, imageUrl, productType) {
    // Placeit/Mediamodifier/MockupWorld API
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            template_id: getMockupTemplateId(productType),
            image_url: imageUrl,
            output_format: 'jpg'
        })
    });
    
    const data = await response.json();
    return data.mockup_urls;
}

// ESKİ KODUNUZDAKİ showLoading/hideLoading
function showLoading(message = 'Loading...') {
    // Mevcut loading sisteminizi kullanın
    if (typeof window.showLoadingIndicator === 'function') {
        window.showLoadingIndicator(message);
    } else {
        // Basit loading
        let loader = document.getElementById('global-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                        <p style="margin-top: 10px;">${message}</p>
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'block';
    }
}

function hideLoading() {
    if (typeof window.hideLoadingIndicator === 'function') {
        window.hideLoadingIndicator();
    } else {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

function showSuccess(message) {
    alert(message); // veya toast notification
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Analyze trends button
    const analyzeBtn = document.getElementById('analyze-trends-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', window.analyzeTopSellers);
    }
    
    // Publish buttons
    document.querySelectorAll('.publish-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.dataset.productId;
            const platform = this.dataset.platform;
            window.publishToPlatform(productId, platform);
        });
    });
}

// ==================== PRODUCT LOADING ====================
// loadUserProducts FONKSİYONUNU ESKİ KODUNUZA GÖRE DÜZENLEYİN
async function loadUserProducts() {
    try {
        showLoading('Loading products...');
        
        // ESKİ KODUNUZDAKİ DATABASE BAĞLANTISI
        const supabaseClient = window.supabaseClient || window.supabase;
        if (!supabaseClient) {
            throw new Error('Database connection not available');
        }
        
        const { data: products, error } = await supabaseClient
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
        window.productsSystem.products = currentProducts;
        window.productsSystem.filteredProducts = [...currentProducts];
        
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
// ESKİ KODUNUZDAKİ showNotification FONKSİYONU
function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Mevcut notification sisteminizi kullanın
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        // Basit notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            border-radius: 4px;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
}
// ESKİ KODUNUZDAKİ updateUI FONKSİYONU
function updateUI() {
    // Update user info
    const userEmail = document.getElementById('user-email');
    if (userEmail && currentUser) {
        userEmail.textContent = currentUser.email;
    }
    
    // Update stats
    updateProductStats();
}

// ESKİ KODUNUZDAKİ updateProductStats FONKSİYONU
function updateProductStats() {
    const totalProducts = document.getElementById('total-products');
    const activeProducts = document.getElementById('active-products');
    const totalRevenue = document.getElementById('total-revenue');
    
    if (totalProducts) {
        totalProducts.textContent = currentProducts.length || 0;
    }
    
    if (activeProducts) {
        const activeCount = currentProducts.filter(p => p.status === 'active').length;
        activeProducts.textContent = activeCount;
    }
    
    if (totalRevenue) {
        const revenue = currentProducts.reduce((sum, product) => {
            const monthlySales = product.rating_stats?.[0]?.monthly_sales_estimate || 0;
            return sum + (monthlySales * (product.price || 0));
        }, 0);
        totalRevenue.textContent = `$${revenue.toFixed(0)}`;
    }
}
function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    const html = products.map(product => `
        <div class="product-card" data-id="${product.id}">
            <img src="${product.images?.[0] || 'placeholder.jpg'}" alt="${product.title}">
            <h3>${product.title}</h3>
            <p>$${product.price} • ${product.category}</p>
            <div class="product-actions">
                ${product.etsy_listing_id ? `
                    <a href="https://etsy.com/listing/${product.etsy_listing_id}" target="_blank" class="btn">
                        Etsy'de Gör
                    </a>
                ` : `
                    <select onchange="window.publishToPlatform('${product.id}', this.value)" class="publish-select">
                        <option value="">Yayınla...</option>
                        <option value="etsy">Etsy</option>
                        <option value="amazon">Amazon</option>
                        <option value="shopify">Shopify</option>
                    </select>
                `}
            </div>
        </div>
    `).join('');
    
    grid.innerHTML = html;
}

// ==================== GLOBAL EXPORTS ====================
window.createSimilarProduct = createSimilarProduct;
window.publishToPlatform = publishToPlatform;
window.analyzeTopSellers = analyzeTopSellers;

console.log('🎯 Products System: Etsy → AI → Publish pipeline ready');
