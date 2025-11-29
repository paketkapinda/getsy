// dashboard-activities.js - Recent Activity için
import { supabase } from './supabaseClient.js';

export async function loadRecentActivities() {
  const container = document.getElementById('activity-feed');
  if (!container) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Son aktiviteleri getir (products, orders, payments)
    const [productsResult, ordersResult, paymentsResult] = await Promise.all([
      supabase
        .from('products')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
      
      supabase
        .from('orders')
        .select('id, etsy_order_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
      
      supabase
        .from('payments')
        .select('id, amount, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)
    ]);

    const activities = [
      ...(productsResult.data || []).map(p => ({
        type: 'product',
        icon: 'product',
        title: 'New Product Created',
        description: p.title,
        time: p.created_at
      })),
      ...(ordersResult.data || []).map(o => ({
        type: 'order',
        icon: 'order',
        title: 'New Order Received',
        description: `Order #${o.etsy_order_id?.slice(-8) || o.id.slice(-8)}`,
        time: o.created_at
      })),
      ...(paymentsResult.data || []).map(p => ({
        type: 'payment',
        icon: 'payment',
        title: 'Payment Processed',
        description: `$${p.amount} - ${p.status}`,
        time: p.created_at
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

    if (activities.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No recent activity</p>
          <small>Your activities will appear here</small>
        </div>
      `;
      return;
    }

    container.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon ${activity.icon}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            ${getActivityIcon(activity.type)}
          </svg>
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-description">${activity.description}</div>
        </div>
        <div class="activity-time">${formatTimeAgo(activity.time)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading activities:', error);
    container.innerHTML = '<p>Error loading activities</p>';
  }
}

function getActivityIcon(type) {
  const icons = {
    product: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>',
    order: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>',
    payment: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>'
  };
  return icons[type] || icons.product;
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}