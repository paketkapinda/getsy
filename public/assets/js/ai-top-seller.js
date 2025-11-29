// ai-top-seller.js
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

export async function analyzeTopSellers(shopId) {
  try {
    showNotification('Analyzing top sellers...', 'info');
    
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
    
    // Analysis sonuçlarını göster
    showTopSellerAnalysisModal(result);
    return result;
  } catch (error) {
    console.error('Error analyzing top sellers:', error);
    showNotification('Error analyzing top sellers', 'error');
  }
}

function showTopSellerAnalysisModal(analysis) {
  const modalHTML = `
    <div class="modal-overlay">
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h3 class="modal-title">Top Seller Analysis</h3>
          <button class="modal-close" onclick="closeTopSellerModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="analysis-stats">
            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-value">${analysis.trend_scores.length}</div>
                <div class="stat-label">Products Analyzed</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${Math.max(...analysis.trend_scores.map(t => t.trend_score))}</div>
                <div class="stat-label">Highest Trend Score</div>
              </div>
            </div>
          </div>
          
          <div class="trending-products">
            <h4>Trending Products</h4>
            <div class="products-grid">
              ${analysis.trend_scores.map(product => `
                <div class="trend-product-card">
                  <div class="trend-score">
                    <span class="score ${getTrendScoreClass(product.trend_score)}">
                      ${product.trend_score}
                    </span>
                  </div>
                  <div class="product-info">
                    <div class="product-title">Product ${product.product_id}</div>
                    <div class="sales-estimate">
                      Est. ${product.monthly_sales_estimate} sales/month
                    </div>
                    <div class="forecast">
                      <div class="forecast-title">3-Month Forecast:</div>
                      <div class="forecast-months">
                        <span>M1: ${analysis.forecasts[product.product_id]?.month_1 || 0}</span>
                        <span>M2: ${analysis.forecasts[product.product_id]?.month_2 || 0}</span>
                        <span>M3: ${analysis.forecasts[product.product_id]?.month_3 || 0}</span>
                      </div>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-primary" onclick="generateSimilarProduct('${product.product_id}')">
                    Create Similar
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);

  window.closeTopSellerModal = () => {
    document.body.removeChild(modalContainer);
  };
}

function getTrendScoreClass(score) {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

window.generateSimilarProduct = async (productId) => {
  showNotification('Generating similar product design...', 'info');
  // AI tasarım generation'a yönlendir
  window.location.href = `/products.html?generate_similar=${productId}`;
};