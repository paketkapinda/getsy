// pod-order.js
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

export async function sendToPOD(orderId, producerId = null) {
  try {
    showNotification('Sending order to POD provider...', 'info');
    
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/pod-send-order', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_id: orderId,
        producer_id: producerId
      })
    });

    if (!response.ok) throw new Error('POD order submission failed');
    
    const result = await response.json();
    showNotification('Order sent to POD provider successfully', 'success');
    
    // Order durumunu güncelle
    await updateOrderStatus(orderId, 'shipped', result.tracking_number);
    
    return result;
  } catch (error) {
    console.error('Error sending to POD:', error);
    showNotification('Error sending order to POD', 'error');
  }
}

async function updateOrderStatus(orderId, status, trackingNumber = null) {
  const updates = { status: status };
  if (trackingNumber) {
    updates.tracking_number = trackingNumber;
  }
  
  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order status:', error);
  }
}

export function initPODButtons() {
  // Orders sayfasında POD gönderme butonları
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-send-pod')) {
      const orderId = e.target.dataset.orderId;
      const producerSelect = document.querySelector(`[data-order-id="${orderId}"] select`);
      const producerId = producerSelect ? producerSelect.value : null;
      
      await sendToPOD(orderId, producerId);
    }
  });
}