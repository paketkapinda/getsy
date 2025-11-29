// integrations.js - Tüm Edge Function entegrasyonlarını yönetir
import { analyzeTopSellers } from './ai-top-seller.js';
import { generateSEOContent, initSEOButtons } from './ai-seo.js';
import { generateMockups, showMockupGenerator } from './ai-mockup.js';
import { generateAIResponse, initMessageAI } from './ai-messagereply.js';
import { sendToPOD, initPODButtons } from './pod-order.js';
import { distributePayment } from './payments-distribute.js';

// Tüm entegrasyonları başlat
export function initAllIntegrations() {
  // SEO butonlarını başlat
  initSEOButtons();
  
  // Message AI butonlarını başlat
  initMessageAI();
  
  // POD butonlarını başlat
  initPODButtons();
  
  // Global fonksiyonları tanımla
  window.analyzeTopSellers = analyzeTopSellers;
  window.generateSEOContent = generateSEOContent;
  window.generateMockups = generateMockups;
  window.showMockupGenerator = showMockupGenerator;
  window.generateAIResponse = generateAIResponse;
  window.sendToPOD = sendToPOD;
  window.distributePayment = distributePayment;
}

// Sayfa yüklendiğinde entegrasyonları başlat
document.addEventListener('DOMContentLoaded', initAllIntegrations);