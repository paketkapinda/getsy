// Reusable UI widgets: modals, notifications, loading states

export function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  const colors = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  notification.className = `fixed top-4 right-4 z-50 rounded-lg border-2 px-4 py-3 shadow-xl ${colors[type] || colors.info}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

export function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

export function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

export function setupModalClose(modalId, closeButtonId) {
  const modal = document.getElementById(modalId);
  const closeBtn = document.getElementById(closeButtonId);
  if (closeBtn) {
    closeBtn.addEventListener('click', () => hideModal(modalId));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal(modalId);
      }
    });
  }
}

export function showLoading(element) {
  if (element) {
    element.innerHTML = '<div class="flex items-center justify-center p-8"><div class="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div></div>';
  }
}

export function hideLoading(element, content) {
  if (element) {
    element.innerHTML = content || '';
  }
}

export function confirmAction(message) {
  return window.confirm(message);
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

