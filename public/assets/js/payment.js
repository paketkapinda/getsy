// payment.js - Tam Revize Edilmiş Versiyon
let currentUser = null;
let allPayments = [];

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Payments sayfası yükleniyor...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    await initializePaymentsPage();
});

async function initializePaymentsPage() {
    setupEventListeners();
    await loadPayments();
    setupEtsySyncButton();
    updateStats();
}

function setupEventListeners() {
    // Durum filtreleri
    document.querySelectorAll('.status-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            const status = this.getAttribute('data-status');
            filterPaymentsByStatus(status);
            updateActiveFilterButton(this);
        });
    });
    
    // Tarih filtreleri
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            filterPaymentsByDate(this.value);
        });
    }
    
    // Arama
    const searchInput = document.getElementById('searchPayments');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchPayments(this.value);
        });
    }
    
    // Dışa aktar
    const exportBtn = document.getElementById('exportPayments');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPaymentsToCSV);
    }
}

function setupEtsySyncButton() {
    const etsySyncBtn = document.getElementById('etsySyncBtn');
    if (etsySyncBtn) {
        etsySyncBtn.addEventListener('click', async function() {
            const btn = this;
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Senkronize Ediliyor...';
            btn.disabled = true;
            
            try {
                await syncEtsyPayments();
                await loadPayments();
            } catch (error) {
                showNotification('Etsy senkronizasyonu başarısız: ' + error.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
}

async function loadPayments() {
    try {
        showLoading('Ödemeler yükleniyor...');
        
        const { data: payments, error } = await supabase
            .from('payments')
            .select(`
                *,
                orders (
                    order_number,
                    etsy_order_id,
                    total_amount,
                    shipping_address,
                    customer_name,
                    customer_email
                ),
                profiles:producer_id (
                    full_name,
                    email
                )
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allPayments = payments || [];
        displayPayments(allPayments);
        updateStats();
        
    } catch (error) {
        console.error('Ödemeler yükleme hatası:', error);
        showNotification('Ödemeler yüklenirken hata oluştu: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function syncEtsyPayments() {
    try {
        showLoading('Etsy ödemeleri senkronize ediliyor...');
        
        // 1. Aktif Etsy mağazasını kontrol et
        const { data: etsyShop } = await supabase
            .from('etsy_shops')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true)
            .single();
        
        if (!etsyShop) {
            throw new Error('Aktif Etsy mağazanız bulunamadı');
        }
        
        // 2. Etsy API'den siparişleri çek
        const etsyOrders = await fetchEtsyOrders(etsyShop);
        
        if (!etsyOrders || etsyOrders.length === 0) {
            showNotification('Etsy\'de yeni sipariş bulunamadı.', 'info');
            return;
        }
        
        // 3. Siparişleri işle
        let processedCount = 0;
        
        for (const etsyOrder of etsyOrders) {
            try {
                // Sipariş zaten var mı kontrol et
                const { data: existingOrder } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('etsy_order_id', etsyOrder.receipt_id.toString())
                    .single();
                
                if (!existingOrder) {
                    // Yeni sipariş oluştur
                    const newOrder = await createOrderFromEtsy(etsyOrder);
                    if (newOrder) {
                        await createPaymentForOrder(newOrder, etsyOrder);
                        processedCount++;
                    }
                }
            } catch (orderError) {
                console.error('Sipariş işleme hatası:', orderError);
            }
        }
        
        if (processedCount > 0) {
            showNotification(`${processedCount} yeni ödeme senkronize edildi.`, 'success');
        } else {
            showNotification('Yeni ödeme bulunamadı.', 'info');
        }
        
    } catch (error) {
        console.error('Etsy senkronizasyon hatası:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

async function fetchEtsyOrders(etsyShop) {
    try {
        // Mock Etsy API response - gerçek implementasyonda değiştirilecek
        const mockOrders = generateMockEtsyOrders(5);
        return mockOrders;
        
        // Gerçek Etsy API implementasyonu:
        /*
        const response = await fetch(`/api/etsy/orders?shop_id=${etsyShop.id}`, {
            headers: {
                'x-api-key': etsyShop.api_key
            }
        });
        
        if (!response.ok) throw new Error('Etsy API hatası');
        const data = await response.json();
        return data.results || [];
        */
        
    } catch (error) {
        console.error('Etsy sipariş çekme hatası:', error);
        // Hata durumunda mock veri dön
        return generateMockEtsyOrders(3);
    }
}

function generateMockEtsyOrders(count) {
    const orders = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const orderDate = new Date(now);
        orderDate.setDate(now.getDate() - daysAgo);
        
        orders.push({
            receipt_id: 1000000000 + i,
            name: `Müşteri ${i + 1}`,
            first_line: `Örnek Adres ${i + 1}`,
            city: 'İstanbul',
            country_iso: 'TR',
            buyer_email: `customer${i + 1}@example.com`,
            grandtotal: (25 + Math.random() * 75).toFixed(2),
            total_shipping_cost: (5 + Math.random() * 10).toFixed(2),
            total_tax_cost: (2 + Math.random() * 5).toFixed(2),
            created_timestamp: Math.floor(orderDate.getTime() / 1000),
            transactions: [
                {
                    listing_id: 2000000000 + i,
                    title: `Mock Ürün ${i + 1}`,
                    price: (15 + Math.random() * 50).toFixed(2),
                    quantity: Math.floor(Math.random() * 3) + 1
                }
            ]
        });
    }
    
    return orders;
}

async function createOrderFromEtsy(etsyOrder) {
    try {
        const orderData = {
            user_id: currentUser.id,
            producer_id: currentUser.id, // Varsayılan olarak kullanıcının kendisi
            order_number: `ETSY-${etsyOrder.receipt_id}`,
            etsy_order_id: etsyOrder.receipt_id.toString(),
            customer_name: etsyOrder.name,
            customer_email: etsyOrder.buyer_email,
            shipping_address: `${etsyOrder.first_line}, ${etsyOrder.city}, ${etsyOrder.country_iso}`,
            subtotal_amount: parseFloat(etsyOrder.grandtotal) - parseFloat(etsyOrder.total_shipping_cost || 0) - parseFloat(etsyOrder.total_tax_cost || 0),
            shipping_amount: parseFloat(etsyOrder.total_shipping_cost || 0),
            tax_amount: parseFloat(etsyOrder.total_tax_cost || 0),
            total_amount: parseFloat(etsyOrder.grandtotal),
            status: 'paid',
            payment_method: 'etsy',
            payment_status: 'paid',
            order_date: new Date(etsyOrder.created_timestamp * 1000).toISOString(),
            metadata: etsyOrder
        };
        
        const { data: order, error } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();
        
        if (error) throw error;
        return order;
        
    } catch (error) {
        console.error('Sipariş oluşturma hatası:', error);
        return null;
    }
}

async function createPaymentForOrder(order, etsyOrder) {
    try {
        const amount = order.total_amount;
        const producerCost = amount * 0.5;
        const platformFee = amount * 0.15;
        const gatewayFee = (amount * 0.03) + 0.25;
        const netPayout = amount - producerCost - platformFee - gatewayFee;
        
        const paymentData = {
            user_id: currentUser.id,
            order_id: order.id,
            producer_id: order.producer_id,
            amount: amount,
            producer_cost: producerCost,
            platform_fee: platformFee,
            payment_gateway_fee: gatewayFee,
            net_payout: netPayout,
            status: 'completed',
            settlement_date: new Date().toISOString(),
            etsy_receipt_id: etsyOrder.receipt_id?.toString(),
            payment_method: 'etsy'
        };
        
        const { error } = await supabase
            .from('payments')
            .insert(paymentData);
        
        if (error) throw error;
        return true;
        
    } catch (error) {
        console.error('Ödeme oluşturma hatası:', error);
        return false;
    }
}

function displayPayments(payments) {
    const table = document.getElementById('paymentsTable');
    if (!table) return;
    
    const tbody = table.querySelector('tbody') || table;
    
    if (!payments || payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-12">
                    <div class="text-gray-500">
                        <i class="fas fa-receipt text-4xl mb-4"></i>
                        <p class="text-lg">Henüz ödeme kaydı bulunmuyor</p>
                        <p class="text-sm mt-2">Etsy senkronizasyon butonuna tıklayarak başlayın</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    payments.forEach(payment => {
        const order = payment.orders || {};
        
        html += `
            <tr>
                <td class="payment-date">
                    ${formatDate(payment.created_at)}
                </td>
                <td>
                    <span class="order-id">${order.order_number || payment.id.substring(0, 8)}</span>
                </td>
                <td class="amount">
                    $${parseFloat(payment.amount).toFixed(2)}
                </td>
                <td>
                    <div class="fees-breakdown">
                        <div>Prod: $${parseFloat(payment.producer_cost).toFixed(2)}</div>
                        <div>Platform: $${parseFloat(payment.platform_fee).toFixed(2)}</div>
                        <div>Gateway: $${parseFloat(payment.payment_gateway_fee || 0).toFixed(2)}</div>
                    </div>
                </td>
                <td class="payout positive">
                    $${parseFloat(payment.net_payout).toFixed(2)}
                </td>
                <td>
                    <span class="payment-status ${getStatusClass(payment.status)}">
                        ${getStatusText(payment.status)}
                    </span>
                </td>
                <td class="payment-actions">
                    <button class="btn btn-sm btn-outline" onclick="viewPaymentDetails('${payment.id}')">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                    </button>
                    ${payment.status === 'pending' ? `
                    <button class="btn btn-sm btn-primary" onclick="processPayment('${payment.id}')">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function updateStats() {
    if (!allPayments || allPayments.length === 0) {
        document.getElementById('totalRevenue').textContent = '$0.00';
        document.getElementById('totalPayout').textContent = '$0.00';
        document.getElementById('pendingPayments').textContent = '0';
        document.getElementById('avgPayout').textContent = '$0.00';
        return;
    }
    
    const totalRevenue = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalPayout = allPayments.reduce((sum, p) => sum + parseFloat(p.net_payout || 0), 0);
    const pendingCount = allPayments.filter(p => p.status === 'pending').length;
    const avgPayout = allPayments.length > 0 ? totalPayout / allPayments.length : 0;
    
    document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('totalPayout').textContent = `$${totalPayout.toFixed(2)}`;
    document.getElementById('pendingPayments').textContent = pendingCount.toString();
    document.getElementById('avgPayout').textContent = `$${avgPayout.toFixed(2)}`;
}

function filterPaymentsByStatus(status) {
    const rows = document.querySelectorAll('#paymentsTable tbody tr');
    
    rows.forEach(row => {
        if (row.cells.length < 7) return;
        
        if (status === 'all') {
            row.style.display = '';
        } else {
            const statusCell = row.cells[5];
            if (statusCell) {
                const statusSpan = statusCell.querySelector('span');
                if (statusSpan) {
                    const rowStatus = getStatusFromText(statusSpan.textContent.trim());
                    row.style.display = rowStatus === status ? '' : 'none';
                }
            }
        }
    });
}

// GÜNCELLENMİŞ: filterPaymentsByDate fonksiyonu
function filterPaymentsByDate(dateValue) {
    if (!dateValue) {
        // Tüm ödemeleri göster
        const rows = document.querySelectorAll('#paymentsTable tbody tr');
        rows.forEach(row => row.style.display = '');
        return;
    }
    
    const selectedDate = new Date(dateValue);
    const rows = document.querySelectorAll('#paymentsTable tbody tr');
    
    rows.forEach(row => {
        if (row.cells.length < 7) return;
        
        const dateCell = row.cells[0];
        if (dateCell) {
            const dateText = dateCell.textContent.trim();
            if (dateText) {
                const paymentDate = parseDate(dateText);
                const isSameDay = paymentDate.toDateString() === selectedDate.toDateString();
                row.style.display = isSameDay ? '' : 'none';
            }
        }
    });
}

function searchPayments(query) {
    const rows = document.querySelectorAll('#paymentsTable tbody tr');
    const searchTerm = query.toLowerCase().trim();
    
    rows.forEach(row => {
        if (searchTerm === '') {
            row.style.display = '';
        } else {
            const rowText = row.textContent.toLowerCase();
            row.style.display = rowText.includes(searchTerm) ? '' : 'none';
        }
    });
}

function updateActiveFilterButton(activeBtn) {
    document.querySelectorAll('.status-filter').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
    activeBtn.classList.add('bg-blue-600', 'text-white');
}

// Yardımcı fonksiyonlar
function getStatusClass(status) {
    const classMap = {
        'completed': 'status-completed',
        'pending': 'status-pending',
        'failed': 'status-failed',
        'refunded': 'status-processing'
    };
    return classMap[status] || 'status-pending';
}

function getStatusText(status) {
    const textMap = {
        'completed': 'Completed',
        'pending': 'Pending',
        'failed': 'Failed',
        'refunded': 'Refunded'
    };
    return textMap[status] || status;
}

function getStatusFromText(text) {
    const reverseMap = {
        'completed': 'completed',
        'pending': 'pending',
        'failed': 'failed',
        'refunded': 'refunded'
    };
    return reverseMap[text.toLowerCase()] || text;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function parseDate(dateString) {
    try {
        return new Date(dateString);
    } catch {
        return new Date();
    }
}

function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

// Global fonksiyonlar
window.viewPaymentDetails = async function(paymentId) {
    // Ödeme detaylarını göster
    showNotification('Ödeme detayları gösterilecek', 'info');
};

window.processPayment = async function(paymentId) {
    if (!confirm('Bu ödemeyi onaylamak istediğinize emin misiniz?')) return;
    
    try {
        showLoading('Ödeme işleniyor...');
        
        const { error } = await supabase
            .from('payments')
            .update({
                status: 'completed',
                settlement_date: new Date().toISOString()
            })
            .eq('id', paymentId);
        
        if (error) throw error;
        
        showNotification('Ödeme başarıyla onaylandı!', 'success');
        await loadPayments();
        
    } catch (error) {
        showNotification('Ödeme işlenirken hata oluştu: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.exportPaymentsToCSV = async function() {
    try {
        if (!allPayments || allPayments.length === 0) {
            showNotification('Dışa aktarılacak ödeme bulunamadı.', 'warning');
            return;
        }
        
        const headers = ['Payment ID', 'Order No', 'Customer', 'Amount ($)', 'Net Payout ($)', 'Status', 'Date'];
        const rows = allPayments.map(p => [
            p.id.substring(0, 8),
            p.orders?.order_number || '',
            p.orders?.customer_name || '',
            p.amount,
            p.net_payout,
            getStatusText(p.status),
            formatDate(p.created_at)
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `payments_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification(`${allPayments.length} payments exported as CSV.`, 'success');
        
    } catch (error) {
        showNotification('Export error: ' + error.message, 'error');
    }
};

// Loading ve notification fonksiyonları
function showLoading(message = 'Loading...') {
    let loadingEl = document.getElementById('loadingOverlay');
    if (!loadingEl) {
        loadingEl = document.createElement('div');
        loadingEl.id = 'loadingOverlay';
        loadingEl.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        loadingEl.innerHTML = `
            <div class="bg-white rounded-lg p-8 flex flex-col items-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p class="text-gray-700">${message}</p>
            </div>
        `;
        document.body.appendChild(loadingEl);
    }
}

function hideLoading() {
    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) {
        loadingEl.remove();
    }
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-3"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// GLOBAL FONKSİYON TANIMLARI - EN SONA EKLEYİN
window.syncAllPayments = syncEtsyPayments;
window.processAllPayouts = async function() {
    if (!allPayments || allPayments.length === 0) {
        showNotification('No payments to process.', 'warning');
        return;
    }
    
    try {
        const pendingPayments = allPayments.filter(p => p.status === 'pending');
        
        if (pendingPayments.length === 0) {
            showNotification('No pending payments found.', 'info');
            return;
        }
        
        if (!confirm(`Process ${pendingPayments.length} pending payments?`)) {
            return;
        }
        
        showLoading(`Processing ${pendingPayments.length} payments...`);
        
        let processedCount = 0;
        let errorCount = 0;
        
        for (const payment of pendingPayments) {
            try {
                const { error } = await supabase
                    .from('payments')
                    .update({
                        status: 'completed',
                        settlement_date: new Date().toISOString()
                    })
                    .eq('id', payment.id);
                
                if (error) throw error;
                processedCount++;
                
            } catch (error) {
                console.error(`Error processing payment ${payment.id}:`, error);
                errorCount++;
            }
        }
        
        if (processedCount > 0) {
            showNotification(`${processedCount} payments processed successfully. ${errorCount > 0 ? `${errorCount} payments failed.` : ''}`, 
                           errorCount > 0 ? 'warning' : 'success');
            await loadPayments();
        }
        
    } catch (error) {
        showNotification('Error processing payments: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
};
window.searchPayments = searchPayments;
window.filterPaymentsByDate = filterPaymentsByDate;
window.exportPaymentsToCSV = exportPaymentsToCSV;
window.viewPaymentDetails = viewPaymentDetails;
window.processPayment = processPayment;
window.loadPayments = loadPayments;
