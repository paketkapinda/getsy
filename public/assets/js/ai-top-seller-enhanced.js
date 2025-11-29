// ai-top-seller-enhanced.js
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

export async function analyzeTopSellersWithAnimation(shopId) {
  try {
    // Animasyonlu loading göster
    showAnalysisLoading();
    
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/ai-top-seller', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shop_id: shopId,
        months: 3
      })
    });

    if (!response.ok) throw new Error('Analysis failed');
    
    const result = await response.json();
    
    // Loading'i kapat ve sonuçları göster
    hideAnalysisLoading();
    showTopSellerAnalysisWithAnimation(result);
    return result;
  } catch (error) {
    console.error('Error analyzing top sellers:', error);
    hideAnalysisLoading();
    showNotification('Error analyzing top sellers', 'error');
  }
}

function showAnalysisLoading() {
  const loadingHTML = `
    <div class="analysis-loading-overlay">
      <div class="analysis-loading-content">
        <div class="loading-animation">
          <div class="pulse-circle"></div>
          <div class="pulse-circle delay-1"></div>
          <div class="pulse-circle delay-2"></div>
        </div>
        <h3>Analyzing Top Sellers</h3>
        <p>Scanning Etsy trends and predicting sales...</p>
        <div class="loading-steps">
          <div class="step active">🔍 Gathering product data</div>
          <div class="step">📊 Analyzing trends</div>
          <div class="step">🤖 AI forecasting</div>
          <div class="step">🎯 Generating insights</div>
        </div>
      </div>
    </div>
  `;

  const loadingContainer = document.createElement('div');
  loadingContainer.innerHTML = loadingHTML;
  loadingContainer.id = 'analysis-loading';
  document.body.appendChild(loadingContainer);

  // Adım animasyonu
  let stepIndex = 0;
  const steps = document.querySelectorAll('.loading-steps .step');
  const stepInterval = setInterval(() => {
    if (stepIndex > 0) {
      steps[stepIndex - 1].classList.remove('active');
    }
    if (stepIndex < steps.length) {
      steps[stepIndex].classList.add('active');
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

function showTopSellerAnalysisWithAnimation(analysis) {
  const modalHTML = `
    <div class="modal-overlay analysis-result-modal">
      <div class="modal-content" style="max-width: 1000px;">
        <div class="modal-header">
          <h3 class="modal-title">🎯 Top Seller Analysis</h3>
          <div class="analysis-badge">AI Powered</div>
          <button class="modal-close" onclick="closeTopSellerModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="analysis-hero">
            <div class="hero-stats">
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
            <h4>🔥 Trending Products</h4>
            <div class="products-scroll-container">
              ${analysis.trend_scores.map((product, index) => `
                <div class="trend-product-card animated-card" style="animation-delay: ${index * 0.1}s">
                  <div class="product-header">
                    <div class="trend-score ${getTrendScoreClass(product.trend_score)}">
                      <span class="score">${product.trend_score}</span>
                      <div class="trend-indicator">
                        ${product.trend_score >= 80 ? '🚀' : product.trend_score >= 60 ? '📈' : '📊'}
                      </div>
                    </div>
                    <div class="product-actions">
                      <button class="btn-icon" onclick="createSimilarProduct('${product.product_id}')" title="Create Similar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div class="product-content">
                    <div class="product-title">Trending Product #${index + 1}</div>
                    <div class="sales-metric">
                      <div class="metric-value">${Math.round(product.monthly_sales_estimate)}</div>
                      <div class="metric-label">sales/month</div>
                    </div>
                    
                    <div class="forecast-chart">
                      <div class="chart-title">3-Month Forecast</div>
                      <div class="chart-bars">
                        <div class="chart-bar">
                          <div class="bar-fill" style="height: ${(analysis.forecasts[product.product_id]?.month_1 || 0) / product.monthly_sales_estimate * 100}%"></div>
                          <span>M1</span>
                        </div>
                        <div class="chart-bar">
                          <div class="bar-fill" style="height: ${(analysis.forecasts[product.product_id]?.month_2 || 0) / product.monthly_sales_estimate * 100}%"></div>
                          <span>M2</span>
                        </div>
                        <div class="chart-bar">
                          <div class="bar-fill" style="height: ${(analysis.forecasts[product.product_id]?.month_3 || 0) / product.monthly_sales_estimate * 100}%"></div>
                          <span>M3</span>
                        </div>
                      </div>
                    </div>
                    
                    <div class="forecast-numbers">
                      <div class="forecast-item">
                        <span>Month 1:</span>
                        <strong>${Math.round(analysis.forecasts[product.product_id]?.month_1 || 0)}</strong>
                      </div>
                      <div class="forecast-item">
                        <span>Month 2:</span>
                        <strong>${Math.round(analysis.forecasts[product.product_id]?.month_2 || 0)}</strong>
                      </div>
                      <div class="forecast-item">
                        <span>Month 3:</span>
                        <strong>${Math.round(analysis.forecasts[product.product_id]?.month_3 || 0)}</strong>
                      </div>
                    </div>
                  </div>
                  
                  <button class="btn btn-primary btn-full" onclick="generateProductFromTrend('${product.product_id}')">
                    Create This Product
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="analysis-actions">
            <button class="btn btn-outline" onclick="exportAnalysis()">
              📊 Export Analysis
            </button>
            <button class="btn btn-primary" onclick="generateMultipleProducts()">
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
    const cards = document.querySelectorAll('.animated-card');
    cards.forEach(card => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
  }, 100);

  window.closeTopSellerModal = () => {
    document.body.removeChild(modalContainer);
  };
}

function getTrendScoreClass(score) {
  if (score >= 80) return 'trend-high';
  if (score >= 60) return 'trend-medium';
  return 'trend-low';
}

window.createSimilarProduct = async (productId) => {
  showNotification('Creating similar product...', 'info');
  // Products sayfasına yönlendir ve AI tasarım başlat
  window.location.href = `/products.html?action=create_similar&product_id=${productId}`;
};

window.generateProductFromTrend = async (productId) => {
  showNotification('Generating product from trend analysis...', 'info');
  // Tam ürün generation flow'u başlat
  window.location.href = `/products.html?action=generate_from_trend&product_id=${productId}`;
};