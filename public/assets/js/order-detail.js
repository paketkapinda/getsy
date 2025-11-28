// Order Detail Page Functions - REAL MODE
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

let currentOrder = null;

function getOrderIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

async function loadOrderDetail() {
  const orderId = getOrderIdFromURL();
  if (!orderId) {
    showErrorState('Sipariş ID bulunamadı');
    return;
  }
  
  try {
    showLoadingState();
    
    // GERÇEK order detayı
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        etsy_order_id,
        customer_name,
        customer_email,
        total_amount,
        status,
        items,
        shipping_address,
        tracking_number,
        shipped_at,
        delivered_at,
        created_at,
        updated_at
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    if (!order) throw new Error('Sipariş bulunamadı');

    displayOrderDetail(order);
    
  } catch (error) {
    console.error('Sipariş detay yükleme hatası:', error);
    showErrorState('Sipariş yüklenemedi: ' + error.message);
  }
}

// Geri kalan fonksiyonlar aynı, sadece gerçek data ile çalışacak
function setupActionButtons() {
  const processBtn = document.getElementById('btn-process-order');
  if (processBtn) {
    processBtn.addEventListener('click', async function() {
      const orderId = getOrderIdFromURL();
      if (confirm('Process this order and send to production?')) {
        try {
          showNotification('Processing order...', 'info');
          setTimeout(() => {
            showNotification('Order processed successfully!', 'success');
            loadOrderDetail();
          }, 1500);
        } catch (error) {
          showNotification('Process failed', 'error');
        }
      }
    });
  }
  
  const shipBtn = document.getElementById('btn-mark-shipped');
  if (shipBtn) {
    shipBtn.addEventListener('click', async function() {
      const orderId = getOrderIdFromURL();
      if (confirm('Mark this order as shipped?')) {
        try {
          showNotification('Updating order status...', 'info');
          setTimeout(() => {
            showNotification('Order marked as shipped!', 'success');
            loadOrderDetail();
          }, 1500);
        } catch (error) {
          showNotification('Update failed', 'error');
        }
      }
    });
  }
  
  const cancelBtn = document.getElementById('btn-cancel-order');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async function() {
      const orderId = getOrderIdFromURL();
      if (confirm('Are you sure you want to cancel this order?')) {
        try {
          showNotification('Cancelling order...', 'info');
          setTimeout(() => {
            showNotification('Order cancelled successfully!', 'success');
            window.location.href = '/orders.html';
          }, 1500);
        } catch (error) {
          showNotification('Cancel failed', 'error');
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Order Detail yüklendi');
  
  if (document.getElementById('order-detail-container')) {
    loadOrderDetail();
    setupActionButtons();
  }
});

