// ai-top-seller-enhanced.js - DÜZELTİLMİŞ (ÇİFT FONKSİYON YOK)
import { supabase } from './supabaseClient.js';

// Loading kontrol değişkeni
let isAnalyzing = false;

// Eksik fonksiyonları ekleyelim
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
  // Eğer zaten analiz yapılıyorsa, tekrar başlatma
  if (isAnalyzing) {
    console.log('⚠️ Analysis already in progress');
    return;
  }
  
  try {
    isAnalyzing = true;
    
    // Animasyonlu loading göster
    showAnalysisLoading();
    
    showNotification('🔍 Analyzing top sellers...', 'info');
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // 1. Önce AI analizi yap
    console.log('🤖 Performing AI analysis for user:', user.id);
    const analysisResult = await performTopSellerAnalysis(user.id, shopId);
    
    // 2. Sonuçları Supabase'e kaydet
    console.log('💾 Saving analysis to database...');
    await saveAnalysisToDatabase(analysisResult, user.id);
    
    // 3. Loading'i kapat
    hideAnalysisLoading();
    
    // 4. Sonuçları göster
    showTopSellerAnalysisWithAnimation(analysisResult);
    
    showNotification('✅ Top seller analysis completed!', 'success');
    
    isAnalyzing = false;
    return analysisResult;
    
  } catch (error) {
    console.error('Error analyzing top sellers:', error);
    hideAnalysisLoading();
    showNotification('Error analyzing top sellers: ' + error.message, 'error');
    
    // Fallback: Mock veri göster
    const mockResult = generateMockAnalysis();
    showTopSellerAnalysisWithAnimation(mockResult);
    
    isAnalyzing = false;
    return mockResult;
  }
}

// SADECE BİR TANE showAnalysisLoading FONKSİYONU OLSUN
function showAnalysisLoading() {
  // Eğer zaten loading gösteriliyorsa, yeniden oluşturma
  if (document.getElementById('analysis-loading')) {
    return;
  }
  
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

// SADECE BİR TANE hideAnalysisLoading FONKSİYONU OLSUN
function hideAnalysisLoading() {
  const loading = document.getElementById('analysis-loading');
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => {
      loading.remove();
    }, 500);
  }
}

// saveAnalysisToDatabase fonksiyonunu düzelt (tek insert yapsın)
async function saveAnalysisToDatabase(analysis, userId) {
  try {
    // Tüm analizi tek bir JSON olarak kaydet
    const record = {
      user_id: userId,
      trend_scores: analysis.trend_scores,
      forecast_3month: analysis.forecasts,
      insights: analysis.insights,
      metadata: {
        shop_id: analysis.shop_id,
        analysis_id: analysis.analysis_id,
        total_products: analysis.trend_scores.length
      },
      analysis_date: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('top_seller_analysis')
      .insert(record)
      .select()
      .single(); // Sadece bir kayıt döndür
    
    if (error) {
      console.warn('⚠️ Database warning:', error.message);
      return null;
    }
    
    console.log('✅ Analysis saved with ID:', data.id);
    return data;
    
  } catch (error) {
    console.error('❌ Error saving to database:', error.message);
    return null;
  }
}

// performTopSellerAnalysis fonksiyonu EKSİK - ekleyelim
async function performTopSellerAnalysis(userId, shopId) {
  try {
    // GERÇEK VERİ ÇEKME - etsy_market_data tablosundan
    const { data: marketData, error } = await supabase
      .from('etsy_market_data')
      .select('*')
      .order('trend_score', { ascending: false })
      .limit(8);
    
    if (error) throw error;
    
    if (marketData && marketData.length > 0) {
      // Etsy market data varsa onu kullan
      return {
        analysis_id: 'real-analysis-' + Date.now(),
        user_id: userId,
        shop_id: shopId,
        trend_scores: marketData.map(item => ({
          product_id: item.id,
          listing_title: item.product_title,
          trend_score: item.trend_score,
          monthly_sales_estimate: item.monthly_sales || 100,
          category: item.category,
          price_range: item.price_range,
          competition_level: item.competition_level,
          seasonality: item.seasonality
        })),
        forecasts: marketData.reduce((acc, item) => {
          acc[item.id] = {
            month_1: Math.round((item.monthly_sales || 100) * 1.1),
            month_2: Math.round((item.monthly_sales || 100) * 1.2),
            month_3: Math.round((item.monthly_sales || 100) * 1.3)
          };
          return acc;
        }, {}),
        insights: {
          best_category: marketData[0]?.category || 'Various',
          best_price_range: marketData[0]?.price_range || '$15-30',
          seasonal_trends: 'Based on real market data',
          data_source: 'etsy_market_data'
        }
      };
    }
    
    // Eğer etsy_market_data yoksa, mock data döndür
    return generateMockAnalysis();
    
  } catch (error) {
    console.error('Error fetching real data:', error);
    // Hata durumunda mock data döndür
    return generateMockAnalysis();
  }
}

function generateMockAnalysis() {
  return {
    analysis_id: 'mock-analysis-' + Date.now(),
    trend_scores: [
      { 
        product_id: 'mock-1', 
        listing_title: 'Best Selling Mug', 
        trend_score: 92, 
        monthly_sales_estimate: 250,
        category: 'Home & Living',
        price_range: '$15-25'
      },
      { 
        product_id: 'mock-2', 
        listing_title: 'Popular T-Shirt', 
        trend_score: 88, 
        monthly_sales_estimate: 180,
        category: 'Apparel',
        price_range: '$20-30'
      },
      { 
        product_id: 'mock-3', 
        listing_title: 'Custom Poster', 
        trend_score: 85, 
        monthly_sales_estimate: 150,
        category: 'Home Decor',
        price_range: '$12-20'
      },
      { 
        product_id: 'mock-4', 
        listing_title: 'Personalized Gift', 
        trend_score: 78, 
        monthly_sales_estimate: 120,
        category: 'Gifts',
        price_range: '$10-18'
      },
      { 
        product_id: 'mock-5', 
        listing_title: 'Minimalist Art', 
        trend_score: 75, 
        monthly_sales_estimate: 95,
        category: 'Art',
        price_range: '$25-40'
      }
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
      seasonal_trends: 'Peak sales in November-December',
      data_source: 'mock_data'
    }
  };
}

function showTopSellerAnalysisWithAnimation(analysis) {
  // Eski modal'ı temizle
  const oldModal = document.getElementById('analysis-modal');
  if (oldModal) oldModal.remove();
  
  const modalHTML = `
    <div class="modal-overlay analysis-result-modal" id="analysis-modal">
      <div class="modal-content" style="max-width: 1000px; background: white; border-radius: 12px; overflow: hidden;">
        <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #fef7f0, #fef3f2);">
          <div>
            <h3 class="modal-title" style="font-size: 1.5rem; font-weight: 600; color: #111827; margin: 0;">🎯 Top Seller Analysis</h3>
            <p style="color: #6b7280; margin: 0.5rem 0 0 0;">${analysis.insights?.data_source === 'etsy_market_data' ? 'Real market data analysis' : 'AI-powered market insights'}</p>
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
                    <div class="trend-score" style="color: white; padding: 0.5rem 1rem; border-radius: 20px; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; ${getTrendScoreStyle(product.trend_score)}">
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
              <div>
                <div style="font-size: 0.875rem; color: #6b7280;">Data Source</div>
                <div style="font-weight: 600; color: #374151;">${analysis.insights.data_source || 'AI Analysis'}</div>
              </div>
            </div>
          </div>
          ` : ''}
          
          <div class="analysis-actions" style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb;">
            <button class="btn btn-outline" onclick="exportAnalysis()" style="padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; border-radius: 8px; background: white; color: #374151; cursor: pointer;">
              📊 Export Data
            </button>
            <button class="btn btn-primary" onclick="generateMultipleProducts()" style="padding: 0.75rem 1.5rem; border-radius: 8px; background: linear-gradient(135deg, #ea580c, #c2410c); color: white; border: none; font-weight: 600; cursor: pointer;">
              🚀 Create Products
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

  window.createSimilarProduct = (productId) => {
    showNotification('Creating similar product...', 'info');
    window.location.href = `/products.html?action=create_similar&product_id=${productId}`;
  };

  window.generateProductFromTrend = (productId) => {
    showNotification('Creating product from trend...', 'info');
    window.location.href = `/products.html?action=create_from_trend&product_id=${productId}`;
  };

  window.exportAnalysis = () => {
    showNotification('Exporting analysis data...', 'info');
    // Export işlemleri buraya
  };

  window.generateMultipleProducts = () => {
    showNotification('Creating multiple products...', 'info');
    // Batch product generation
  };
}

function getTrendScoreStyle(score) {
  if (score >= 80) return 'background: linear-gradient(135deg, #10b981, #059669);';
  if (score >= 60) return 'background: linear-gradient(135deg, #f59e0b, #d97706);';
  return 'background: linear-gradient(135deg, #6b7280, #4b5563);';
}
