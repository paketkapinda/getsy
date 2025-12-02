// main-integrations.js
import { analyzeTopSellersWithAnimation } from './ai-top-seller-enhanced.js';
import { loadDashboardPayments } from './dashboard-payments.js';
import { loadRecentActivities } from './dashboard-activities.js';

// main-integrations.js - DÜZELTİLMİŞ VERSİYON

// Sadece gerekli import'lar
let analyzeTopSellersWithAnimation;

// DOM yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
  // Butona event listener ekle (bir kere)
  const analyzeBtn = document.getElementById('btn-analyze-top-seller');
  if (analyzeBtn) {
    // Mevcut event listener'ları kaldır
    analyzeBtn.replaceWith(analyzeBtn.cloneNode(true));
    
    // Yeni event listener ekle
    document.getElementById('btn-analyze-top-seller').addEventListener('click', async function() {
      console.log('🎯 Analyze button clicked');
      
      // Butonu disable et (çoklu tıklamayı önle)
      this.disabled = true;
      this.innerHTML = '<span>Analyzing...</span>';
      
      try {
        // Dinamik import
        const module = await import('./ai-top-seller-enhanced.js');
        analyzeTopSellersWithAnimation = module.analyzeTopSellersWithAnimation;
        
        // Analizi başlat
        await analyzeTopSellersWithAnimation('current_shop');
      } catch (error) {
        console.error('Error:', error);
        showNotification('Analysis failed: ' + error.message, 'error');
      } finally {
        // Butonu tekrar aktif et
        this.disabled = false;
        this.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>Analyze Top Sellers';
      }
    });
  }
  
  // AI kartlarına basit yönlendirme
  document.querySelectorAll('.ai-tool-card').forEach(card => {
    card.addEventListener('click', function(e) {
      const cardId = this.id;
      if (cardId !== 'btn-analyze-top-seller') {
        e.preventDefault();
        window.location.href = '/products.html';
      }
    });
  });
});

// Basit notification fonksiyonu
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

// Global'e ata
window.showNotification = showNotification;
