// main-integrations.js
import { analyzeTopSellersWithAnimation } from './ai-top-seller-enhanced.js';
import { showProductContentGenerator } from './ai-product-content.js';
import { loadDashboardPayments } from './dashboard-payments.js';
import { loadRecentActivities } from './dashboard-activities.js';

// Dashboard'da tüm entegrasyonları başlat
document.addEventListener('DOMContentLoaded', function() {
  // Payments verilerini yükle
  loadDashboardPayments();
  
  // Recent activities yükle
  loadRecentActivities();
  
  // AI Top Seller butonu
  const analyzeBtn = document.getElementById('btn-analyze-top-seller');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      analyzeTopSellersWithAnimation('current_shop');
    });
  }
  
  // AI Assistant kartlarına event listener'lar ekle
  const aiCards = document.querySelectorAll('.ai-tool-card');
  aiCards.forEach(card => {
    card.addEventListener('click', function() {
      const cardId = this.id;
      handleAICardClick(cardId);
    });
  });
});

function handleAICardClick(cardId) {
  switch(cardId) {
    case 'btn-generate-description':
      showNotification('Redirecting to product creation...', 'info');
      window.location.href = '/products.html?action=generate_description';
      break;
      
    case 'btn-generate-seo':
      showNotification('Redirecting to product creation...', 'info');
      window.location.href = '/products.html?action=generate_seo';
      break;
      
    case 'btn-analyze-top-seller':
      analyzeTopSellersWithAnimation('current_shop');
      break;
      
    default:
      showNotification('AI feature coming soon!', 'info');
  }
}

// Global fonksiyonlar
window.analyzeTopSellersWithAnimation = analyzeTopSellersWithAnimation;
window.showProductContentGenerator = showProductContentGenerator;