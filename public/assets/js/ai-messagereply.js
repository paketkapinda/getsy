// ai-messagereply.js
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

export async function generateAIResponse(messageId) {
  try {
    showNotification('Generating AI response...', 'info');
    
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/ai-messagereply', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message_id: messageId
      })
    });

    if (!response.ok) throw new Error('AI response generation failed');
    
    const result = await response.json();
    showNotification('AI response generated', 'success');
    
    return result.reply;
  } catch (error) {
    console.error('Error generating AI response:', error);
    showNotification('Error generating AI response', 'error');
  }
}

export function initMessageAI() {
  // Messages sayfasında AI reply butonlarına event listener ekle
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-ai-reply')) {
      const messageId = e.target.dataset.messageId;
      const reply = await generateAIResponse(messageId);
      
      if (reply) {
        // Reply textarea'sını güncelle
        const replyTextarea = document.querySelector(`[data-message-id="${messageId}"] textarea`);
        if (replyTextarea) {
          replyTextarea.value = reply;
        }
      }
    }
  });
}