// Validation, formatting, date helpers

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function truncate(str, length = 100) {
  if (!str || str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function getStatusColor(status) {
  const colors = {
    pending: 'pill-warning',
    processing: 'pill-info',
    shipped: 'bg-purple-100 text-purple-700 border-purple-200',
    delivered: 'pill-success',
    cancelled: 'pill-danger',
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    listed: 'pill-success',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getStatusLabel(status) {
  const labels = {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    draft: 'Draft',
    listed: 'Listed',
  };
  return labels[status] || status;
}

