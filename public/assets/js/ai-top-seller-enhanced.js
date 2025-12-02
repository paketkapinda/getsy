// ai-top-seller-enhanced.js
import { supabase } from './supabaseClient.js';

// Eksik showNotification fonksiyonunu ekleyin
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 500);
  }, 3000);
}

export async function analyzeTopSellersWithAnimation(shopId) {
  try {
    // Animasyonlu loading göster
    showAnalysisLoading();
    
    showNotification('🔍 Analyzing top sellers...', 'info');
    
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // 1. Önce AI analizi yap (simüle edilmiş veri veya gerçek API)
    const analysisResult = await performTopSellerAnalysis(user.id, shopId);
    
    // 2. Sonuçları Supabase'e kaydet
    await saveAnalysisToDatabase(analysisResult, user.id);
    
    // 3. Loading'i kapat ve sonuçları göster
    hideAnalysisLoading();
    
    showNotification('✅ Top seller analysis completed!', 'success');
    
    // 4. Sonuçları göster
    showTopSellerAnalysisWithAnimation(analysisResult);
    
    return analysisResult;
    
  } catch (error) {
    console.error('Error analyzing top sellers:', error);
    hideAnalysisLoading();
    showNotification('Error analyzing top sellers: ' + error.message, 'error');
    
    // Fallback: Mock veri göster
    const mockResult = generateMockAnalysis();
    showTopSellerAnalysisWithAnimation(mockResult);
    return mockResult;
  }
}

async function performTopSellerAnalysis(userId, shopId) {
  try {
    // Burada gerçek AI analizi yapılacak
    // Şimdilik mock data döndürelim
    console.log('🤖 Performing AI analysis for user:', userId);
    
    // Mock AI analiz verisi
    return {
      analysis_id: 'analysis-' + Date.now(),
      user_id: userId,
      shop_id: shopId,
      analysis_date: new Date().toISOString(),
      trend_scores: [
        {
          product_id: 'prod-1',
          listing_title: 'Personalized Coffee Mug',
          trend_score: 92,
          monthly_sales_estimate: 245,
          competition_level: 'Medium',
          price_range: '$15-25',
          category: 'Home & Living',
          seasonality: 'High (Year-round)'
        },
        {
          product_id: 'prod-2',
          listing_title: 'Minimalist T-Shirt Design',
          trend_score: 88,
          monthly_sales_estimate: 189,
          competition_level: 'High',
          price_range: '$20-30',
          category: 'Apparel',
          seasonality: 'Medium'
        },
        {
          product_id: 'prod-3',
          listing_title: 'Custom Pet Portrait',
          trend_score: 85,
          monthly_sales_estimate: 156,
          competition_level: 'Low',
          price_range: '$30-50',
          category: 'Art & Collectibles',
          seasonality: 'Low'
        },
        {
          product_id: 'prod-4',
          listing_title: 'Vintage Style Poster',
          trend_score: 78,
          monthly_sales_estimate: 134,
          competition_level: 'Medium',
          price_range: '$12-20',
          category: 'Home Decor',
          seasonality: 'High (Seasonal)'
        },
        {
          product_id: 'prod-5',
          listing_title: 'Personalized Keychain',
          trend_score: 75,
          monthly_sales_estimate: 98,
          competition_level: 'Very High',
          price_range: '$8-15',
          category: 'Accessories',
          seasonality: 'Year-round'
        }
      ],
      forecasts: {
        'prod-1': { month_1: 260, month_2: 275, month_3: 290 },
        'prod-2': { month_1: 200, month_2: 210, month_3: 220 },
        'prod-3': { month_1: 165, month_2: 175, month_3: 185 },
        'prod-4': { month_1: 140, month_2: 150, month_3: 160 },
        'prod-5': { month_1: 105, month_2: 110, month_3: 115 }
      },
      insights: {
        best_category: 'Home & Living',
        best_price_range: '$15-30',
        recommended_tags: ['personalized', 'custom', 'gift', 'unique', 'handmade'],
        seasonal_trends: 'Q4 (Oct-Dec) shows 40% increase in sales',
        growth_opportunities: ['Bundle products', 'Expand to related categories', 'Improve product photography']
      }
    };
    
  } catch (error) {
    console.error('AI analysis failed:', error);
    throw error;
  }
}

async function saveAnalysisToDatabase(analysis, userId) {
  try {
    console.log('💾 Saving analysis to database...');
    
    // Top Seller Analysis tablosuna ana analiz kaydı
    const { data: analysisRecord, error: analysisError } = await supabase
      .from('top_seller_analysis')
      .insert({
        user_id: userId,
        analysis_date: new Date().toISOString(),
        trend_scores: analysis.trend_scores,
        forecasts: analysis.forecasts,
        insights: analysis.insights,
        metadata: {
          shop_id: analysis.shop_id,
          total_products: analysis.trend_scores.length,
          average_trend_score: analysis.trend_scores.reduce((sum, item) => sum + item.trend_score, 0) / analysis.trend_scores.length
        }
      })
      .select()
      .single();

    if (analysisError) throw analysisError;
    
    console.log('✅ Analysis saved with ID:', analysisRecord.id);
    
    // Her bir ürün için ayrı kayıt (opsiyonel)
    for (const product of analysis.trend_scores) {
      const { error: productError } = await supabase
        .from('top_seller_analysis')
        .insert({
          user_id: userId,
          product_id: product.product_id,
          listing_title: product.listing_title,
          trend_score: product.trend_score,
          monthly_sales_estimate: product.monthly_sales_estimate,
          forecast_3month: analysis.forecasts[product.product_id],
          analysis_date: new Date().toISOString(),
          metadata: {
            competition_level: product.competition_level,
            price_range: product.price_range,
            category: product.category,
            seasonality: product.seasonality
          }
        });
        
      if (productError) {
        console.warn('⚠️ Could not save individual product:', productError.message);
      }
    }
    
    return analysisRecord;
    
  } catch (error) {
    console.error('❌ Error saving to database:', error);
    throw error;
  }
}

function showAnalysisLoading() {
  const loadingHTML = `
    <div class="analysis-loading-overlay" id="analysis-loading">
      <div class="analysis-loading-content">
        <div class="loading-animation">
          <div class="pulse-circle"></div>
          <div class="pulse-circle delay-1"></div>
          <div class="pulse-circle delay-2"></div>
        </div>
        <h3 style="color: white; margin-bottom: 1rem;">Analyzing Top Sellers</h3>
        <p style="color: #d1d5db; margin-bottom: 2rem;">Scanning Etsy trends and predicting sales...</p>
        <div class="loading-steps">
          <div class="step">🔍 Gathering product data</div>
          <div class="step">📊 Analyzing trends</div>
          <div class="step">🤖 AI forecasting</div>
          <div class="step">🎯 Generating insights</div>
        </div>
      </div>
    </div>
  `;

  const loadingContainer = document.createElement('div');
  loadingContainer.innerHTML = loadingHTML;
  document.body.appendChild(loadingContainer);

  // Adım animasyonu
  let stepIndex = 0;
  const steps = document.querySelectorAll('.loading-steps .step');
  steps.forEach(step => step.style.opacity = '0.5');
  
  const stepInterval = setInterval(() => {
    if (stepIndex > 0) {
      steps[stepIndex - 1].style.opacity = '0.5';
      steps[stepIndex - 1].style.transform = 'translateX(0)';
    }
    if (stepIndex < steps.length) {
      steps[stepIndex].style.opacity = '1';
      steps[stepIndex].style.transform = 'translateX(10px)';
      stepIndex++;
    } else {
      clearInterval(stepInterval);
    }
  }, 800);
}

function hideAnalysisLoading() {
  const loading = document.getElementById('analysis-loading');
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => {
      loading.remove();
    }, 500);
  }
}

function generateMockAnalysis() {
  return {
    analysis_id: 'mock-analysis-' + Date.now(),
    trend_scores: [
      { product_id: 'mock-1', listing_title: 'Best Selling Mug', trend_score: 92, monthly_sales_estimate: 250 },
      { product_id: 'mock-2', listing_title: 'Popular T-Shirt', trend_score: 88, monthly_sales_estimate: 180 },
      { product_id: 'mock-3', listing_title: 'Custom Poster', trend_score: 85, monthly_sales_estimate: 150 },
      { product_id: 'mock-4', listing_title: 'Personalized Gift', trend_score: 78, monthly_sales_estimate: 120 },
      { product_id: 'mock-5', listing_title: 'Minimalist Art', trend_score: 75, monthly_sales_estimate: 95 }
    ],
    forecasts: {
      'mock-1': { month_1: 265, month_2: 280, month_3: 295 },
      'mock-2': { month_1: 190, month_2: 200, month_3: 210 },
      'mock-3': { month_1: 160, month_2: 170, month_3: 180 },
      'mock-4': { month_1: 130, month_2: 140, month_3: 150 },
      'mock-5': { month_1: 100, month_2: 105, month_3: 110 }
    },
    insights: {
      best_category: 'Home Decor',
      best_price_range: '$20-35',
      seasonal_trends: 'Peak sales in November-December'
    }
  };
}

function showTopSellerAnalysisWithAnimation(analysis) {
  const modalHTML = `
    <div class="modal-overlay analysis-result-modal" id="analysis-modal">
      <div class="modal-content" style="max-width: 1000px; background: white; border-radius: 12px; overflow: hidden;">
        <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #fef7f0, #fef3f2);">
          <div>
            <h3 class="modal-title" style="font-size: 1.5rem; font-weight: 600; color: #111827; margin: 0;">🎯 Top Seller Analysis</h3>
            <p style="color: #6b7280; margin: 0.5rem 0 0 0;">AI-powered market insights for your Etsy shop</p>
          </div>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span class="analysis-badge" style="background: linear-gradient(135deg, #ea580c, #c2410c); color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">AI Powered</span>
            <button class="modal-close" onclick="closeTopSellerModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">&times;</button>
          </div>
        </div>
        
        <div class="modal-body" style="padding: 2rem; max-height: 70vh; overflow-y: auto;">
          <div class="analysis-hero">
            <div class="hero-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
              <div class="hero-stat">
                <div class="stat-number">${analysis.trend_scores.length}</div>
                <div class="stat-label">Products Analyzed</div>
              </div>
              <div class="hero-stat">
                <div class="stat-number">${Math.round(analysis.trend_scores.reduce((acc, curr) => acc + curr.monthly_sales_estimate, 0))}</div>
                <div class="stat-label">Total Monthly Sales</div>
              </div>
              <div class="hero-stat">
                <div class="stat-number">${Math.max(...analysis.trend_scores.map(t => t.trend_score))}%</div>
                <div class="stat-label">Top Trend Score</div>
              </div>
            </div>
          </div>
          
          <div class="trending-products-grid">
            <h4 style="font-size: 1.25rem; font-weight: 600; color: #111827; margin-bottom: 1.5rem;">🔥 Trending Products</h4>
            <div class="products-scroll-container" style="display: flex; overflow-x: auto; gap: 1rem; padding: 1rem 0; scrollbar-width: thin;">
              ${analysis.trend_scores.map((product, index) => `
                <div class="trend-product-card animated-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; min-width: 280px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); animation-delay: ${index * 0.1}s; opacity: 0; transform: translateY(30px); transition: all 0.6s ease;">
                  <div class="product-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div class="trend-score ${getTrendScoreClass(product.trend_score)}" style="color: white; padding: 0.5rem 1rem; border-radius: 20px; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; ${getTrendScoreStyle(product.trend_score)}">
                      <span class="score">${product.trend_score}%</span>
                      <div class="trend-indicator">
                        ${product.trend_score >= 80 ? '🚀' : product.trend_score >= 60 ? '📈' : '📊'}
                      </div>
                    </div>
                    <div class="product-actions">
                      <button class="btn-icon" onclick="createSimilarProduct('${product.product_id}')" title="Create Similar" style="background: none; border: none; padding: 0.5rem; border-radius: 6px; color: #6b7280; cursor: pointer;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div class="product-content">
                    <div class="product-title" style="font-weight: 600; color: #111827; margin-bottom: 1rem; font-size: 1.125rem;">${product.listing_title}</div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                      <div>
                        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Monthly Sales</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #ea580c;">${Math.round(product.monthly_sales_estimate)}</div>
                      </div>
                      <div>
                        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Category</div>
                        <div style="font-weight: 500; color: #374151;">${product.category || 'Various'}</div>
                      </div>
                    </div>
                    
                    ${analysis.forecasts && analysis.forecasts[product.product_id] ? `
                    <div class="forecast-chart" style="margin-bottom: 1.5rem;">
                      <div class="chart-title" style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">3-Month Forecast</div>
                      <div class="chart-bars" style="display: flex; gap: 0.5rem; align-items: end; height: 60px;">
                        <div class="chart-bar" style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                          <div class="bar-fill" style="background: linear-gradient(to top, #ea580c, #fdba74); border-radius: 4px 4px 0 0; width: 20px; min-height: 10px; height: ${(analysis.forecasts[product.product_id]?.month_1 || 0) / product.monthly_sales_estimate * 100}%; transition: height 0.3s ease;"></div>
                          <span style="margin-top: 0.5rem; font-size: 0.75rem; color: #6b7280;">M1</span>
                        </div>
                        <div class="chart-bar" style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                          <div class="bar-fill" style="background: linear-gradient(to top, #ea580c, #fdba74); border-radius: 4px 4px 0 0; width: 20px; min-height: 10px; height: ${(analysis.forecasts[product.product_id]?.month_2 || 0) / product.monthly_sales_estimate * 100}%; transition: height 0.3s ease;"></div>
                          <span style="margin-top: 0.5rem; font-size: 0.75rem; color: #6b7280;">M2</span>
                        </div>
                        <div class="chart-bar" style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                          <div class="bar-fill" style="background: linear-gradient(to top, #ea580c, #fdba74); border-radius: 4px 4px 0 0; width: 20px; min-height: 10px; height: ${(analysis.forecasts[product.product_id]?.month_3 || 0) / product.monthly_sales_estimate * 100}%; transition: height 0.3s ease;"></div>
                          <span style="margin-top: 0.5rem; font-size: 0.75rem; color: #6b7280;">M3</span>
                        </div>
                      </div>
                    </div>
                    
                    <div class="forecast-numbers" style="display: grid; gap: 0.5rem; margin-bottom: 1.5rem;">
                      <div class="forecast-item" style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                        <span>Month 1:</span>
                        <strong>${Math.round(analysis.forecasts[product.product_id]?.month_1 || 0)}</strong>
                      </div>
                      <div class="forecast-item" style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                        <span>Month 2:</span>
                        <strong>${Math.round(analysis.forecasts[product.product_id]?.month_2 || 0)}</strong>
                      </div>
                      <div class="forecast-item" style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                        <span>Month 3:</span>
                        <strong>${Math.round(analysis.forecasts[product.product_id]?.month_3 || 0)}</strong>
                      </div>
                    </div>
                    ` : ''}
                  </div>
                  
                  <button class="btn btn-primary btn-full" onclick="generateProductFromTrend('${product.product_id}')" style="width: 100%; padding: 0.75rem; border-radius: 8px; background: linear-gradient(135deg, #ea580c, #c2410c); color: white; border: none; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                    Create This Product
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
          
          ${analysis.insights ? `
          <div style="margin-top: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h4 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;">📈 Key Insights</h4>
            <div style="display: grid; gap: 1rem;">
              <div>
                <div style="font-size: 0.875rem; color: #6b7280;">Best Performing Category</div>
                <div style="font-weight: 600; color: #374151;">${analysis.insights.best_category}</div>
              </div>
              <div>
                <div style="font-size: 0.875rem; color: #6b7280;">Optimal Price Range</div>
                <div style="font-weight: 600; color: #374151;">${analysis.insights.best_price_range}</div>
              </div>
              ${analysis.insights.seasonal_trends ? `
              <div>
                <div style="font-size: 0.875rem; color: #6b7280;">Seasonal Trends</div>
                <div style="font-weight: 600; color: #374151;">${analysis.insights.seasonal_trends}</div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
          
          <div class="analysis-actions" style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb;">
            <button class="btn btn-outline" onclick="exportAnalysis()" style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; border-radius: 8px; background: white; color: #374151; cursor: pointer;">
              📊 Export Analysis
            </button>
            <button class="btn btn-primary" onclick="generateMultipleProducts()" style="padding: 0.75rem 1.5rem; border-radius: 8px; background: linear-gradient(135deg, #ea580c, #c2410c); color: white; border: none; font-weight: 600; cursor: pointer;">
              🚀 Generate All Top Products
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);

  // Animasyonları başlat
  setTimeout(() => {
    const cards = modalContainer.querySelectorAll('.animated-card');
    cards.forEach(card => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
  }, 100);

  // Global fonksiyonlar
  window.closeTopSellerModal = () => {
    const modal = document.getElementById('analysis-modal');
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };

  window.generateProductFromTrend = (productId) => {
    showNotification('Redirecting to product creation...', 'info');
    window.location.href = `/products.html?action=create_from_trend&product_id=${productId}`;
  };

  window.exportAnalysis = () => {
    showNotification('Exporting analysis data...', 'info');
    // Export işlemleri buraya
  };

  window.generateMultipleProducts = () => {
    showNotification('Generating multiple products from trends...', 'info');
    // Batch product generation
  };
}

function getTrendScoreClass(score) {
  if (score >= 80) return 'trend-high';
  if (score >= 60) return 'trend-medium';
  return 'trend-low';
}

function getTrendScoreStyle(score) {
  if (score >= 80) return 'background: linear-gradient(135deg, #10b981, #059669);';
  if (score >= 60) return 'background: linear-gradient(135deg, #f59e0b, #d97706);';
  return 'background: linear-gradient(135deg, #6b7280, #4b5563);';
}
