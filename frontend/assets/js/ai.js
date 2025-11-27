// AI client calls: mockups, SEO, top-seller analysis

import { api } from './api.js';
import { showNotification } from './ui.js';

export async function generateDescription(productId, context) {
  try {
    const result = await api.post('/functions/v1/ai-seo', {
      product_id: productId,
      type: 'description',
      context,
    });
    return result;
  } catch (error) {
    console.error('Error generating description:', error);
    showNotification('Failed to generate description', 'error');
    return null;
  }
}

export async function generateSEOTags(productId, title) {
  try {
    const result = await api.post('/functions/v1/ai-seo', {
      product_id: productId,
      type: 'tags',
      title,
    });
    return result;
  } catch (error) {
    console.error('Error generating SEO tags:', error);
    showNotification('Failed to generate SEO tags', 'error');
    return null;
  }
}

export async function analyzeTopSeller(shopId, months = 12) {
  try {
    showNotification('Analyzing top sellers...', 'info');
    const result = await api.post('/functions/v1/ai-top-seller', {
      shop_id: shopId,
      months,
    });
    if (result.error) throw new Error(result.error);
    showNotification('Top seller analysis completed', 'success');
    return result;
  } catch (error) {
    console.error('Error analyzing top sellers:', error);
    showNotification('Failed to analyze top sellers', 'error');
    return null;
  }
}

// Chat interface
export function initAIChat() {
  const messagesContainer = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send-chat');
  const btnDescription = document.getElementById('btn-generate-description');
  const btnSEO = document.getElementById('btn-generate-seo');
  const btnTopSeller = document.getElementById('btn-analyze-top-seller');

  function addMessage(text, isUser = false) {
    if (!messagesContainer) return;
    const msg = document.createElement('div');
    msg.className = `rounded-lg p-3 text-sm ${isUser ? 'bg-emerald-500/10 text-emerald-300 ml-8' : 'bg-slate-800/60 text-slate-300'}`;
    msg.textContent = text;
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function sendMessage(text) {
    if (!text.trim()) return;
    addMessage(text, true);
    input.value = '';

    // Simple mock response for now
    addMessage('I can help you generate product descriptions, SEO tags, and analyze top sellers. Please use the quick action buttons above for specific tasks.');
  }

  if (btnSend && input) {
    btnSend.addEventListener('click', () => {
      sendMessage(input.value);
    });
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage(input.value);
      }
    });
  }

  if (btnDescription) {
    btnDescription.addEventListener('click', async () => {
      addMessage('Generating product description...', true);
      // In real implementation, would prompt for product ID
      addMessage('Please select a product first to generate its description.');
    });
  }

  if (btnSEO) {
    btnSEO.addEventListener('click', async () => {
      addMessage('Generating SEO tags...', true);
      // In real implementation, would prompt for product ID
      addMessage('Please select a product first to generate SEO tags.');
    });
  }

  if (btnTopSeller) {
    btnTopSeller.addEventListener('click', async () => {
      addMessage('Analyzing top sellers...', true);
      const result = await analyzeTopSeller(null, 12);
      if (result) {
        addMessage(`Analysis complete. Found ${result.trend_scores?.length || 0} trending products.`);
      } else {
        addMessage('Analysis failed. Please try again.');
      }
    });
  }
}

// Initialize on page load
if (document.getElementById('chat-messages')) {
  initAIChat();
}




