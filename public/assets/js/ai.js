// ai.js - Complete AI Assistant with All Features
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

// ===== PRODUCT CONTENT GENERATION =====
window.generateProductDescription = async function(productData) {
    try {
        showNotification('Generating product description...', 'info');
        
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/generate-description', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                productName: productData.name,
                productType: productData.type,
                keywords: productData.keywords,
                targetAudience: productData.audience,
                style: productData.style || 'professional'
            })
        });

        if (!response.ok) throw new Error('Description generation failed');
        
        const result = await response.json();
        showNotification('Product description generated successfully!', 'success');
        return result.description;
    } catch (error) {
        console.error('Error generating description:', error);
        showNotification('Error generating product description', 'error');
        return null;
    }
};

window.generateProductTitle = async function(productData) {
    try {
        showNotification('Generating product title...', 'info');
        
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/generate-title', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                productType: productData.type,
                keywords: productData.keywords,
                style: productData.style || 'catchy',
                characterLimit: productData.characterLimit || 60
            })
        });

        if (!response.ok) throw new Error('Title generation failed');
        
        const result = await response.json();
        showNotification('Product title generated successfully!', 'success');
        return result.titles; // Array of title options
    } catch (error) {
        console.error('Error generating title:', error);
        showNotification('Error generating product title', 'error');
        return null;
    }
};

window.generateSEOTags = async function(productData) {
    try {
        showNotification('Generating SEO tags and metadata...', 'info');
        
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/generate-seo-tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                productName: productData.name,
                productType: productData.type,
                keywords: productData.keywords,
                description: productData.description,
                targetPlatform: productData.platform || 'etsy'
            })
        });

        if (!response.ok) throw new Error('SEO generation failed');
        
        const result = await response.json();
        showNotification('SEO tags generated successfully!', 'success');
        return {
            metaDescription: result.metaDescription,
            tags: result.tags,
            categories: result.categories
        };
    } catch (error) {
        console.error('Error generating SEO tags:', error);
        showNotification('Error generating SEO tags', 'error');
        return null;
    }
};

window.generateProductTags = async function(productData) {
    try {
        showNotification('Generating product tags...', 'info');
        
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/generate-tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                productName: productData.name,
                productType: productData.type,
                category: productData.category,
                style: productData.style,
                materials: productData.materials,
                maxTags: productData.maxTags || 13
            })
        });

        if (!response.ok) throw new Error('Tags generation failed');
        
        const result = await response.json();
        showNotification('Product tags generated successfully!', 'success');
        return result.tags;
    } catch (error) {
        console.error('Error generating product tags:', error);
        showNotification('Error generating product tags', 'error');
        return null;
    }
};

// ===== PRODUCT DESIGN GENERATION =====
window.generateProductDesign = async function(designPrompt, style = 'modern', colors = [], dimensions = '1000x1000') {
    try {
        showNotification('Generating product design...', 'info');
        
        // Show design generation progress
        const progressHTML = `
            <div class="connection-progress" style="position: fixed; top: 20px; right: 20px; background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 1000;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top: 2px solid #ea580c; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <span>Generating AI design...</span>
                </div>
            </div>
        `;
        
        const progressContainer = document.createElement('div');
        progressContainer.innerHTML = progressHTML;
        document.body.appendChild(progressContainer);

        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/generate-design', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                prompt: designPrompt,
                style: style,
                colorPalette: colors,
                dimensions: dimensions,
                aspectRatio: '1:1'
            })
        });

        if (!response.ok) throw new Error('Design generation failed');
        
        const result = await response.json();
        
        // Remove progress indicator
        document.body.removeChild(progressContainer);
        
        showNotification('Product design generated successfully!', 'success');
        return {
            imageUrl: result.designUrl,
            prompt: designPrompt,
            style: style,
            colors: colors
        };
    } catch (error) {
        console.error('Error generating design:', error);
        showNotification('Error generating product design', 'error');
        return null;
    }
};

window.generateDesignVariations = async function(baseDesign, variations = 4) {
    try {
        showNotification(`Generating ${variations} design variations...`, 'info');
        
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/generate-design-variations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                baseDesign: baseDesign,
                variations: variations,
                styles: ['minimal', 'vintage', 'modern', 'abstract']
            })
        });

        if (!response.ok) throw new Error('Design variations generation failed');
        
        const result = await response.json();
        showNotification(`${variations} design variations generated!`, 'success');
        return result.variations;
    } catch (error) {
        console.error('Error generating design variations:', error);
        showNotification('Error generating design variations', 'error');
        return null;
    }
};

// ===== PRICE & BUSINESS INTELLIGENCE =====
window.recommendPrice = async function(productData, marketData = {}) {
    try {
        showNotification('Analyzing market for price recommendation...', 'info');
        
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/recommend-price', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                productCost: productData.cost,
                productType: productData.type,
                competitionPrices: marketData.competition || [],
                targetMargin: marketData.margin || 0.4,
                platform: marketData.platform || 'etsy'
            })
        });

        if (!response.ok) throw new Error('Price recommendation failed');
        
        const result = await response.json();
        showNotification('Price recommendation generated!', 'success');
        return {
            recommendedPrice: result.recommendedPrice,
            minPrice: result.minPrice,
            maxPrice: result.maxPrice,
            profitMargin: result.profitMargin,
            competitionAnalysis: result.competitionAnalysis
        };
    } catch (error) {
        console.error('Error generating price recommendation:', error);
        showNotification('Error generating price recommendation', 'error');
        return null;
    }
};

window.analyzeProductPerformance = async function(productId) {
    try {
        showNotification('Analyzing product performance...', 'info');
        
        // Get product data
        const { data: productData, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (productError) throw productError;

        // Get sales data
        const { data: salesData, error: salesError } = await supabase
            .from('orders')
            .select('total_amount, created_at, status')
            .eq('product_id', productId);

        if (salesError) throw salesError;

        // Get view data
        const { data: viewData, error: viewError } = await supabase
            .from('product_analytics')
            .select('views, clicks, conversions')
            .eq('product_id', productId);

        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/analyze-performance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                productData: productData,
                salesData: salesData || [],
                viewData: viewData || [],
                timePeriod: '30d'
            })
        });

        if (!response.ok) throw new Error('Performance analysis failed');
        
        const result = await response.json();
        showNotification('Product analysis completed!', 'success');
        return result.analysis;
    } catch (error) {
        console.error('Error analyzing product performance:', error);
        showNotification('Error analyzing product performance', 'error');
        return null;
    }
};

// ===== CONTENT OPTIMIZATION =====
window.optimizeProductListing = async function(productData) {
    try {
        showNotification('Optimizing product listing...', 'info');
        
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/optimize-listing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                title: productData.title,
                description: productData.description,
                tags: productData.tags,
                category: productData.category,
                platform: productData.platform || 'etsy'
            })
        });

        if (!response.ok) throw new Error('Listing optimization failed');
        
        const result = await response.json();
        showNotification('Listing optimization completed!', 'success');
        return {
            optimizedTitle: result.optimizedTitle,
            optimizedDescription: result.optimizedDescription,
            suggestedTags: result.suggestedTags,
            seoScore: result.seoScore,
            improvements: result.improvements
        };
    } catch (error) {
        console.error('Error optimizing product listing:', error);
        showNotification('Error optimizing product listing', 'error');
        return null;
    }
};

window.generateMarketingCopy = async function(productData, platform = 'etsy') {
    try {
        showNotification('Generating marketing copy...', 'info');
        
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/generate-marketing-copy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                productName: productData.name,
                productDescription: productData.description,
                targetAudience: productData.audience,
                platform: platform,
                tone: productData.tone || 'enthusiastic'
            })
        });

        if (!response.ok) throw new Error('Marketing copy generation failed');
        
        const result = await response.json();
        showNotification('Marketing copy generated!', 'success');
        return {
            socialMediaPosts: result.socialMediaPosts,
            emailTemplates: result.emailTemplates,
            adCopy: result.adCopy
        };
    } catch (error) {
        console.error('Error generating marketing copy:', error);
        showNotification('Error generating marketing copy', 'error');
        return null;
    }
};

// ===== BULK OPERATIONS =====
window.bulkGenerateDescriptions = async function(products) {
    try {
        showNotification(`Generating descriptions for ${products.length} products...`, 'info');
        
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/bulk-generate-descriptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                products: products,
                batchSize: 5
            })
        });

        if (!response.ok) throw new Error('Bulk description generation failed');
        
        const result = await response.json();
        showNotification(`Generated descriptions for ${result.processed} products!`, 'success');
        return result.descriptions;
    } catch (error) {
        console.error('Error in bulk description generation:', error);
        showNotification('Error generating bulk descriptions', 'error');
        return null;
    }
};

// ===== AI CHAT ASSISTANT =====
// ai.js - Düzeltilmiş sendAIChatMessage fonksiyonu
// ai.js - Gerçek AI API bağlantılı
window.sendAIChatMessage = async function(message, conversationHistory = []) {
    try {
        console.log('💬 Sending to AI API:', message);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('No authentication session');
        }

        const response = await fetch('/api/ai-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                message: message,
                history: conversationHistory,
                context: 'etsy_business'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'AI service error');
        }

        const result = await response.json();
        console.log('✅ AI response received');
        return result.response;
        
    } catch (error) {
        console.error('❌ AI Chat Error:', error);
        throw new Error('Unable to connect to AI services. Please check your API keys and try again.');
    }
};

// Özel Etsy fonksiyonları
window.generateProductDescriptionAI = async function(productData) {
    const prompt = `Create an Etsy product description for:
Product: ${productData.name}
Type: ${productData.type}
Keywords: ${productData.keywords?.join(', ')}
Target Audience: ${productData.audience}

Please create a compelling description that includes:
- Engaging opening
- Key features and benefits
- Technical specifications
- Usage suggestions
- Emotional appeal
- Call to action`;

    return await window.sendAIChatMessage(prompt);
};

window.generateSEOTagsAI = async function(productData) {
    const prompt = `Generate SEO-optimized tags and metadata for Etsy:
Product: ${productData.name}
Category: ${productData.category}
Materials: ${productData.materials}
Style: ${productData.style}

Provide:
1. Primary keywords (3-5)
2. Long-tail keywords (5-7)
3. Meta description
4. Product tags (13 max for Etsy)`;

    return await window.sendAIChatMessage(prompt);
};

window.analyzeSalesAI = async function(salesData) {
    const prompt = `Analyze this Etsy sales data and provide insights:
Total Sales: ${salesData.totalSales}
Conversion Rate: ${salesData.conversionRate}%
Average Order Value: $${salesData.averageOrderValue}
Top Products: ${salesData.topProducts?.join(', ')}

Provide:
- Performance analysis
- Growth opportunities
- Recommendations for improvement
- Seasonal trends if visible`;

    return await window.sendAIChatMessage(prompt);
};

// Fallback yanıt üretici
function generateFallbackResponse(message, history) {
    const lowerMessage = message.toLowerCase();
    
    // Ürün açıklama istekleri
    if (lowerMessage.includes('description') || lowerMessage.includes('describe') || lowerMessage.includes('product')) {
        return "I'd be happy to help you create a product description! For a compelling Etsy listing, focus on:\n\n• The unique features of your product\n• Materials and craftsmanship\n• Size and specifications\n• How it benefits the customer\n• What makes it special\n\nCould you tell me more about the product you'd like to describe?";
    }
    
    // SEO istekleri
    if (lowerMessage.includes('seo') || lowerMessage.includes('tag') || lowerMessage.includes('keyword')) {
        return "Great! For Etsy SEO optimization, consider these strategies:\n\n• Use all 13 tags effectively\n• Include long-tail keywords\n• Mention product attributes (color, size, material)\n• Use seasonal and occasion keywords\n• Research competitor tags\n\nWhat type of product are you optimizing?";
    }
    
    // Fiyat istekleri
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
        return "For pricing your Etsy products, consider:\n\n• Material costs × 2-3\n• Labor time × your hourly rate\n• Etsy fees (5% + payment processing)\n• Shipping and packaging\n• Desired profit margin\n• Competitor pricing\n\nA good starting point is materials × 3 + labor + fees.";
    }
    
    // Satış analizi
    if (lowerMessage.includes('sales') || lowerMessage.includes('analyze') || lowerMessage.includes('performance')) {
        return "To analyze your sales performance:\n\n• Track conversion rates\n• Monitor listing views and favorites\n• Analyze seasonal trends\n• Review customer reviews\n• Check competitor performance\n• Optimize based on data\n\nWould you like me to help analyze specific metrics?";
    }
    
    // Tasarım istekleri
    if (lowerMessage.includes('design') || lowerMessage.includes('create') || lowerMessage.includes('mockup')) {
        return "For product design inspiration:\n\n• Research trending designs on Etsy\n• Consider your target audience\n• Use color psychology\n• Create multiple variations\n• Test different styles\n• Get customer feedback\n\nWhat type of design are you working on?";
    }
    
    // Genel Etsy tavsiyeleri
    if (lowerMessage.includes('etsy') || lowerMessage.includes('shop') || lowerMessage.includes('store')) {
        return "For Etsy shop success:\n\n• Use high-quality photos (5+ per listing)\n• Write detailed descriptions\n• Offer excellent customer service\n• Use all available tags\n• Update listings regularly\n• Promote on social media\n• Consider Etsy Ads for top listings\n\nWhat specific aspect of your Etsy shop would you like to improve?";
    }
    
    // Selamlama
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        return "Hello! I'm your Etsy AI Assistant. I can help you with:\n\n• Product descriptions and SEO\n• Pricing strategies\n• Sales analysis\n• Design inspiration\n• Marketing tips\n• Customer service templates\n\nWhat would you like help with today?";
    }
    
    // Varsayılan yanıt
    return "I'm here to help with your Etsy business! I can assist with:\n\n📝 Product descriptions and listings\n🔍 SEO optimization and tags\n💰 Pricing strategies\n📈 Sales analysis and insights\n🎨 Design inspiration\n📱 Marketing and social media\n\nWhat specific area would you like to focus on?";
}

// AI Tool butonları için hızlı fonksiyonlar
window.quickGenerateDescription = async function() {
    return "I'd be happy to help you create a product description! For a compelling Etsy listing, focus on:\n\n• The unique features of your product\n• Materials and craftsmanship\n• Size and specifications\n• How it benefits the customer\n• What makes it special\n\nCould you tell me more about the product you'd like to describe?";
};

window.quickGenerateSEO = async function() {
    return "Great! For Etsy SEO optimization, consider these strategies:\n\n• Use all 13 tags effectively\n• Include long-tail keywords\n• Mention product attributes (color, size, material)\n• Use seasonal and occasion keywords\n• Research competitor tags\n\nWhat type of product are you optimizing?";
};

window.quickAnalyzePerformance = async function() {
    return "To analyze your sales performance:\n\n• Track conversion rates\n• Monitor listing views and favorites\n• Analyze seasonal trends\n• Review customer reviews\n• Check competitor performance\n• Optimize based on data\n\nWould you like me to help analyze specific metrics?";
};
// ===== HELPER FUNCTIONS =====
async function getSalesData(productId) {
    const { data, error } = await supabase
        .from('orders')
        .select('total_amount, created_at, status')
        .eq('product_id', productId);
    
    if (error) throw error;
    return data;
}

async function getViewData(productId) {
    const { data, error } = await supabase
        .from('product_analytics')
        .select('views, clicks, conversions, created_at')
        .eq('product_id', productId);
    
    if (error) throw error;
    return data;
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🤖 AI Assistant initialized with all features');
    
    // Initialize AI action buttons
    initializeAIActions();
});

function initializeAIActions() {
    // Product page AI buttons
    const aiActionButtons = [
        { selector: '[data-ai-action="generate-title"]', action: 'generateTitle' },
        { selector: '[data-ai-action="generate-description"]', action: 'generateDescription' },
        { selector: '[data-ai-action="generate-tags"]', action: 'generateTags' },
        { selector: '[data-ai-action="generate-seo"]', action: 'generateSEO' },
        { selector: '[data-ai-action="generate-design"]', action: 'generateDesign' },
        { selector: '[data-ai-action="optimize-listing"]', action: 'optimizeListing' }
    ];

    aiActionButtons.forEach(({ selector, action }) => {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(button => {
            button.addEventListener('click', async function() {
                await handleAIAction(action, this);
            });
        });
    });
}

async function handleAIAction(action, element) {
    const productData = getProductDataFromPage();
    
    switch(action) {
        case 'generateTitle':
            const titles = await generateProductTitle(productData);
            if (titles) {
                showTitleSelectionModal(titles);
            }
            break;
            
        case 'generateDescription':
            const description = await generateProductDescription(productData);
            if (description) {
                document.getElementById('product-description').value = description;
            }
            break;
            
        case 'generateTags':
            const tags = await generateProductTags(productData);
            if (tags) {
                document.getElementById('product-tags').value = tags.join(', ');
            }
            break;
            
        case 'generateSEO':
            const seoData = await generateSEOTags(productData);
            if (seoData) {
                showSEOModal(seoData);
            }
            break;
            
        case 'generateDesign':
            const designPrompt = prompt('Enter design description:');
            if (designPrompt) {
                const design = await generateProductDesign(designPrompt);
                if (design) {
                    showDesignModal(design);
                }
            }
            break;
            
        case 'optimizeListing':
            const optimization = await optimizeProductListing(productData);
            if (optimization) {
                showOptimizationModal(optimization);
            }
            break;
            
        default:
            console.log('Unknown AI action:', action);
    }
}

function getProductDataFromPage() {
    // Extract product data from form fields
    return {
        name: document.getElementById('product-name')?.value || '',
        type: document.getElementById('product-type')?.value || '',
        category: document.getElementById('product-category')?.value || '',
        description: document.getElementById('product-description')?.value || '',
        keywords: document.getElementById('product-keywords')?.value?.split(',') || [],
        cost: parseFloat(document.getElementById('product-cost')?.value) || 0
    };
}

// Modal functions for AI results
function showTitleSelectionModal(titles) {
    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Select a Title</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${titles.map((title, index) => `
                        <div class="ai-option" onclick="selectTitle('${title}')">
                            ${title}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    showModal(modalHTML);
}

function showSEOModal(seoData) {
    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>SEO Recommendations</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="seo-section">
                        <h4>Meta Description</h4>
                        <p>${seoData.metaDescription}</p>
                    </div>
                    <div class="seo-section">
                        <h4>Tags</h4>
                        <p>${seoData.tags.join(', ')}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    showModal(modalHTML);
}

// Utility functions
function showModal(html) {
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = html;
    document.body.appendChild(modalContainer);
}

window.closeModal = function() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => modal.remove());
};

window.selectTitle = function(title) {
    document.getElementById('product-name').value = title;
    closeModal();
};

console.log('✅ AI Assistant loaded with all features:');
console.log('   - Product Content Generation');
console.log('   - Design Generation');
console.log('   - Price Intelligence');
console.log('   - SEO Optimization');
console.log('   - Marketing Copy');
console.log('   - Bulk Operations');
console.log('   - Chat Assistant');


