// main-integrations.js - Ana entegrasyon yönetimi

// İlk yükleme kontrolü - çift yüklemeyi önle
if (window.__MAIN_INTEGRATIONS_INITIALIZED__) {
  console.log('⚠️ main-integrations.js already initialized');
} else {
  window.__MAIN_INTEGRATIONS_INITIALIZED__ = true;
  
  // Değişkenleri tanımla
  let analyzeTopSellers, generateSEOContent, generateMockups, showMockupGenerator;
  let generateAIResponse, sendToPOD, distributePayment;
  let initSEOButtons, initMessageAI, initPODButtons;
  
  // Modülleri dinamik import et
  async function loadModules() {
    try {
      // AI Top Seller
      const aiTopSellerModule = await import('./ai-top-seller.js');
      analyzeTopSellers = aiTopSellerModule.analyzeTopSellers;
      
      // AI SEO
      const aiSeoModule = await import('./ai-seo.js');
      generateSEOContent = aiSeoModule.generateSEOContent;
      initSEOButtons = aiSeoModule.initSEOButtons;
      
      // AI Mockup
      const aiMockupModule = await import('./ai-mockup.js');
      generateMockups = aiMockupModule.generateMockups;
      showMockupGenerator = aiMockupModule.showMockupGenerator;
      
      // AI Message Reply
      const aiMessageModule = await import('./ai-messagereply.js');
      generateAIResponse = aiMessageModule.generateAIResponse;
      initMessageAI = aiMessageModule.initMessageAI;
      
      // POD Order
      const podModule = await import('./pod-order.js');
      sendToPOD = podModule.sendToPOD;
      initPODButtons = podModule.initPODButtons;
      
      // Payments
      const paymentsModule = await import('./payments-distribute.js');
      distributePayment = paymentsModule.distributePayment;
      
      console.log('✅ All modules loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error loading modules:', error);
      return false;
    }
  }
  
  // Global fonksiyonları tanımla
  function setupGlobalFunctions() {
    if (typeof window.analyzeTopSellers === 'undefined' && analyzeTopSellers) {
      window.analyzeTopSellers = analyzeTopSellers;
    }
    
    if (typeof window.generateSEOContent === 'undefined' && generateSEOContent) {
      window.generateSEOContent = generateSEOContent;
    }
    
    if (typeof window.generateMockups === 'undefined' && generateMockups) {
      window.generateMockups = generateMockups;
    }
    
    if (typeof window.showMockupGenerator === 'undefined' && showMockupGenerator) {
      window.showMockupGenerator = showMockupGenerator;
    }
    
    if (typeof window.generateAIResponse === 'undefined' && generateAIResponse) {
      window.generateAIResponse = generateAIResponse;
    }
    
    if (typeof window.sendToPOD === 'undefined' && sendToPOD) {
      window.sendToPOD = sendToPOD;
    }
    
    if (typeof window.distributePayment === 'undefined' && distributePayment) {
      window.distributePayment = distributePayment;
    }
  }
  
  // Tüm entegrasyonları başlat
  export async function initAllIntegrations() {
    console.log('🚀 Initializing all integrations...');
    
    // Modülleri yükle
    const loaded = await loadModules();
    if (!loaded) return;
    
    // Global fonksiyonları ayarla
    setupGlobalFunctions();
    
    // Buton event'lerini başlat
    if (initSEOButtons) {
      initSEOButtons();
      console.log('✅ SEO buttons initialized');
    }
    
    if (initMessageAI) {
      initMessageAI();
      console.log('✅ Message AI buttons initialized');
    }
    
    if (initPODButtons) {
      initPODButtons();
      console.log('✅ POD buttons initialized');
    }
    
    console.log('✅ All integrations initialized successfully');
    return true;
  }
  
  // Sayfa yüklendiğinde entegrasyonları başlat
  document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM Content Loaded - Starting integrations...');
    
    // 1 saniye bekle (diğer script'lerin yüklenmesi için)
    setTimeout(async () => {
      await initAllIntegrations();
    }, 1000);
  });
  
  // Ayrıca, eğer DOM zaten yüklendiyse
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log('⚡ DOM already ready - Starting integrations immediately...');
    setTimeout(async () => {
      await initAllIntegrations();
    }, 500);
  }
}
