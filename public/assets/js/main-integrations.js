// main-integrations.js
import { analyzeTopSellersWithAnimation } from './ai-top-seller-enhanced.js';
import { showProductContentGenerator } from './ai-product-content.js';
import { loadDashboardPayments } from './dashboard-payments.js';

// Dashboard'da AI analiz butonu
document.addEventListener('DOMContentLoaded', function() {
  // Payments verilerini yükle
  loadDashboardPayments();
  
  // AI Top Seller butonu
  const analyzeBtn = document.getElementById('btn-analyze-top-seller');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      analyzeTopSellersWithAnimation('current_shop');
    });
  }
  
  // Product content generator butonu
  const contentBtn = document.getElementById('btn-generate-content');
  if (contentBtn) {
    contentBtn.addEventListener('click', () => {
      const productId = contentBtn.dataset.productId;
      const mockupUrls = JSON.parse(contentBtn.dataset.mockupUrls || '[]');
      showProductContentGenerator(productId, mockupUrls);
    });
  }
});

// Global fonksiyonlar
window.analyzeTopSellersWithAnimation = analyzeTopSellersWithAnimation;
window.showProductContentGenerator = showProductContentGenerator;