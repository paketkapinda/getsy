// orders.js - Etsy ↔ POD Entegrasyonu
let currentUser = null;
let allOrders = [];
let podProviders = [];

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Orders sayfası yükleniyor...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    await initializeOrdersPage();
});

async function initializeOrdersPage() {
    await loadPodProviders();
    setupEventListeners();
    await loadOrders();
    updateOrderStats();
}

async function loadPodProviders() {
    try {
        const { data, error } = await supabase
            .from('pod_providers')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true);
        
        if (error) throw error;
        podProviders = data || [];
        
    } catch (error) {
        console.error('POD sağlayıcıları yükleme hatası:', error);
        podProviders = [];
    }
}

function setupEventListeners() {
    // Durum filtreleri
    document.querySelectorAll('.status-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            const status = this.getAttribute('data-status');
            filterOrdersByStatus(status);
            updateActiveFilterButton(this);
        });
    });
    
    // Tarih filtreleri
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            filterOrdersByDate(this.value);
        });
    }
    
    // Arama
    const searchInput = document.getElementById('searchOrders');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchOrders(this.value);
        });
    }
    
    // Etsy senkronizasyon
    const etsySyncBtn = document.getElementById('etsySyncBtn');
    if (etsySyncBtn) {
        etsySyncBtn.addEventListener('click', syncEtsyOrders);
    }
    
    // Toplu işlemler
    const selectAllBtn = document.getElementById('selectAllOrders');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', toggleSelectAllOrders);
    }
    
    const processSelectedBtn = document.getElementById('processSelectedOrders');
    if (processSelectedBtn) {
        processSelectedBtn.addEventListener('click', processSelectedOrders);
    }
}

async function loadOrders() {
    try {
        showLoading('Siparişler yükleniyor...');
        
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (
                        title,
                        images,
                        price
                    )
                ),
                payments (
                    status,
                    amount,
                    net_payout
                )
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allOrders = orders || [];
        displayOrders(allOrders);
        
    } catch (error) {
        console.error('Siparişler yükleme hatası:', error);
        showNotification('Siparişler yüklenirken hata oluştu: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function displayOrders(orders) {
    const table = document.getElementById('ordersTable');
    if (!table) return;
    
    if (!orders || orders.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-12">
                    <div class="text-gray-500">
                        <i class="fas fa-shopping-cart text-4xl mb-4"></i>
                        <p class="text-lg">Henüz siparişiniz bulunmuyor</p>
                        <p class="text-sm mt-2">Etsy senkronizasyon butonuna tıklayarak siparişlerinizi çekin</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    orders.forEach(order => {
        const statusClass = getOrderStatusClass(order.status);
        const payment = order.payments?.[0];
        
        html += `
            <tr class="hover:bg-gray-50" data-order-id="${order.id}">
                <td class="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" class="order-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500" value="${order.id}">
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${order.order_number}</div>
                    <div class="text-sm text-gray-500">${formatDate(order.order_date)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${order.customer_name}</div>
                    <div class="text-sm text-gray-500">${order.customer_email}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                        ${order.order_items?.[0]?.products?.title || 'Ürün'}${order.order_items && order.order_items.length > 1 ? ` +${order.order_items.length - 1} more` : ''}
                    </div>
                    <div class="text-sm text-gray-500">${order.order_items?.length || 0} ürün</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    $${parseFloat(order.total_amount).toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${getOrderStatusText(order.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${payment ? `$${parseFloat(payment.net_payout).toFixed(2)}` : 'Ödeme bekliyor'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${order.pod_order_id ? 'Gönderildi' : 'Hazırlanıyor'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="viewOrderDetails('${order.id}')" 
                            class="text-blue-600 hover:text-blue-900 mr-3"
                            title="Detaylar">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${order.status === 'pending' ? `
                        <button onclick="processOrder('${order.id}')" 
                                class="text-green-600 hover:text-green-900 mr-3"
                                title="İşle">
                            <i class="fas fa-play"></i>
                        </button>
                    ` : ''}
                    ${order.status === 'processing' && !order.pod_order_id ? `
                        <button onclick="sendToPOD('${order.id}')" 
                                class="text-purple-600 hover:text-purple-900"
                                title="POD'a Gönder">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
    
    table.innerHTML = html;
}

async function syncEtsyOrders() {
    try {
        showLoading('Etsy siparişleri senkronize ediliyor...');
        
        // Etsy mağazasını kontrol et
        const { data: etsyShop } = await supabase
            .from('etsy_shops')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true)
            .single();
        
        if (!etsyShop) {
            throw new Error('Aktif Etsy mağazanız bulunamadı');
        }
        
        // Mock Etsy siparişleri
        const mockOrders = generateMockEtsyOrders(3);
        
        let newOrdersCount = 0;
        
        for (const etsyOrder of mockOrders) {
            // Sipariş zaten var mı kontrol et
            const { data: existingOrder } = await supabase
                .from('orders')
                .select('id')
                .eq('etsy_order_id', etsyOrder.receipt_id.toString())
                .single();
            
            if (!existingOrder) {
                await createOrderFromEtsy(etsyOrder, etsyShop);
                newOrdersCount++;
            }
        }
        
        if (newOrdersCount > 0) {
            showNotification(`${newOrdersCount} yeni sipariş senkronize edildi`, 'success');
            await loadOrders();
        } else {
            showNotification('Yeni sipariş bulunamadı', 'info');
        }
        
    } catch (error) {
        console.error('Etsy senkronizasyon hatası:', error);
        showNotification('Etsy senkronizasyonu başarısız: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function generateMockEtsyOrders(count) {
    const orders = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
        const daysAgo = Math.floor(Math.random() * 7);
        const orderDate = new Date(now);
        orderDate.setDate(now.getDate() - daysAgo);
        
        orders.push({
            receipt_id: 3000000000 + i,
            name: `Yeni Müşteri ${i + 1}`,
            first_line: `Yeni Adres ${i + 1}`,
            city: 'Ankara',
            country_iso: 'TR',
            buyer_email: `newcustomer${i + 1}@example.com`,
            grandtotal: (30 + Math.random() * 70).toFixed(2),
            total_shipping_cost: (6 + Math.random() * 12).toFixed(2),
            total_tax_cost: (3 + Math.random() * 6).toFixed(2),
            created_timestamp: Math.floor(orderDate.getTime() / 1000),
            transactions: [
                {
                    listing_id: 4000000000 + i,
                    title: `Yeni Ürün ${i + 1}`,
                    price: (20 + Math.random() * 40).toFixed(2),
                    quantity: Math.floor(Math.random() * 2) + 1
                }
            ]
        });
    }
    
    return orders;
}

async function createOrderFromEtsy(etsyOrder, etsyShop) {
    try {
        const orderData = {
            user_id: currentUser.id,
            producer_id: currentUser.id,
            order_number: `ETSY-${etsyOrder.receipt_id}`,
            etsy_order_id: etsyOrder.receipt_id.toString(),
            customer_name: etsyOrder.name,
            customer_email: etsyOrder.buyer_email,
            shipping_address: `${etsyOrder.first_line}, ${etsyOrder.city}, ${etsyOrder.country_iso}`,
            shipping_city: etsyOrder.city,
            shipping_country: etsyOrder.country_iso,
            subtotal_amount: parseFloat(etsyOrder.grandtotal) - parseFloat(etsyOrder.total_shipping_cost || 0) - parseFloat(etsyOrder.total_tax_cost || 0),
            shipping_amount: parseFloat(etsyOrder.total_shipping_cost || 0),
            tax_amount: parseFloat(etsyOrder.total_tax_cost || 0),
            total_amount: parseFloat(etsyOrder.grandtotal),
            status: 'paid',
            payment_method: 'etsy',
            payment_status: 'paid',
            order_date: new Date(etsyOrder.created_timestamp * 1000).toISOString(),
            metadata: {
                etsy_shop_id: etsyShop.id,
                etsy_shop_name: etsyShop.shop_name,
                etsy_order_data: etsyOrder
            }
        };
        
        const { data: order, error } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();
        
        if (error) throw error;
        
        // Sipariş öğelerini oluştur
        if (etsyOrder.transactions && etsyOrder.transactions.length > 0) {
            for (const transaction of etsyOrder.transactions) {
                await createOrderItem(order.id, transaction);
            }
        }
        
        return order;
        
    } catch (error) {
        console.error('Sipariş oluşturma hatası:', error);
        return null;
    }
}

async function createOrderItem(orderId, transaction) {
    try {
        // Ürünü bul veya oluştur
        let productId = null;
        
        if (transaction.listing_id) {
            const { data: existingProduct } = await supabase
                .from('products')
                .select('id')
                .eq('etsy_listing_id', transaction.listing_id.toString())
                .single();
            
            if (existingProduct) {
                productId = existingProduct.id;
            }
        }
        
        const orderItem = {
            order_id: orderId,
            product_id: productId,
            etsy_transaction_id: transaction.transaction_id?.toString(),
            product_title: transaction.title || 'Etsy Ürünü',
            quantity: transaction.quantity || 1,
            unit_price: parseFloat(transaction.price) || 0,
            total_price: parseFloat(transaction.price) * (transaction.quantity || 1),
            metadata: transaction
        };
        
        await supabase.from('order_items').insert(orderItem);
        
    } catch (error) {
        console.error('Sipariş öğesi oluşturma hatası:', error);
    }
}

async function processOrder(orderId) {
    if (!confirm('Bu siparişi işlemek istediğinize emin misiniz?')) return;
    
    try {
        showLoading('Sipariş işleniyor...');
        
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'processing',
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        showNotification('Sipariş başarıyla işlendi!', 'success');
        await loadOrders();
        
    } catch (error) {
        showNotification('Sipariş işlenirken hata oluştu: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function sendToPOD(orderId) {
    try {
        if (podProviders.length === 0) {
            throw new Error('Aktif POD sağlayıcınız bulunamadı');
        }
        
        const podProvider = podProviders[0]; // İlk aktif sağlayıcıyı kullan
        
        showLoading('POD firmasına gönderiliyor...');
        
        // Sipariş detaylarını al
        const { data: order } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (
                        title,
                        images,
                        variants
                    )
                )
            `)
            .eq('id', orderId)
            .single();
        
        if (!order) throw new Error('Sipariş bulunamadı');
        
        // POD API verilerini hazırla
        const podData = {
            order_id: order.order_number,
            customer: {
                name: order.customer_name,
                email: order.customer_email,
                address: order.shipping_address,
                city: order.shipping_city,
                country: order.shipping_country
            },
            items: order.order_items.map(item => ({
                product_title: item.product_title,
                quantity: item.quantity,
                unit_price: item.unit_price,
                image_url: item.products?.images?.[0] || '',
                variants: item.products?.variants || {}
            })),
            total_amount: order.total_amount
        };
        
        // Mock POD API çağrısı
        const podResponse = await sendToPODProvider(podProvider, podData);
        
        if (podResponse.success) {
            // Siparişi güncelle
            const { error } = await supabase
                .from('orders')
                .update({
                    pod_order_id: podResponse.pod_order_id,
                    pod_provider: podProvider.provider_name,
                    status: 'shipped',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);
            
            if (error) throw error;
            
            showNotification('Sipariş POD firmasına başarıyla gönderildi!', 'success');
            await loadOrders();
        } else {
            throw new Error(podResponse.error || 'POD gönderimi başarısız');
        }
        
    } catch (error) {
        console.error('POD gönderme hatası:', error);
        showNotification('POD\'a gönderilemedi: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function sendToPODProvider(podProvider, orderData) {
    // Mock POD API response
    // Gerçek implementasyonda Printful/Printify API çağrısı yapılacak
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                success: true,
                pod_order_id: `POD-${Date.now()}`,
                message: 'Sipariş başarıyla oluşturuldu',
                tracking_url: 'https://tracking.example.com/12345'
            });
        }, 2000);
    });
}

async function processSelectedOrders() {
    const selectedIds = getSelectedOrderIds();
    
    if (selectedIds.length === 0) {
        showNotification('Lütfen işlem yapmak için sipariş seçin', 'warning');
        return;
    }
    
    if (!confirm(`${selectedIds.length} siparişi işlemek istediğinize emin misiniz?`)) return;
    
    try {
        showLoading('Seçili siparişler işleniyor...');
        
        for (const orderId of selectedIds) {
            await processOrder(orderId);
        }
        
        showNotification(`${selectedIds.length} sipariş başarıyla işlendi!`, 'success');
        await loadOrders();
        
    } catch (error) {
        showNotification('Siparişler işlenirken hata oluştu: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function getSelectedOrderIds() {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function toggleSelectAllOrders() {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
    });
}

function filterOrdersByStatus(status) {
    const rows = document.querySelectorAll('#ordersTable tr[data-order-id]');
    
    rows.forEach(row => {
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

function filterOrdersByDate(range) {
    const rows = document.querySelectorAll('#ordersTable tr[data-order-id]');
    const now = new Date();
    
    rows.forEach(row => {
        const dateCell = row.cells[1].querySelector('.text-sm.text-gray-500');
        if (dateCell) {
            const dateText = dateCell.textContent.trim();
            const orderDate = parseDate(dateText);
            
            let show = true;
            switch (range) {
                case 'today':
                    show = isSameDay(orderDate, now);
                    break;
                case 'week':
                    const weekAgo = new Date(now);
                    weekAgo.setDate(now.getDate() - 7);
                    show = orderDate >= weekAgo;
                    break;
                case 'month':
                    const monthAgo = new Date(now);
                    monthAgo.setMonth(now.getMonth() - 1);
                    show = orderDate >= monthAgo;
                    break;
                default:
                    show = true;
            }
            
            row.style.display = show ? '' : 'none';
        }
    });
}

function searchOrders(query) {
    const rows = document.querySelectorAll('#ordersTable tr[data-order-id]');
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

function updateOrderStats() {
    if (!allOrders || allOrders.length === 0) {
        document.getElementById('totalOrders').textContent = '0';
        document.getElementById('pendingOrders').textContent = '0';
        document.getElementById('processingOrders').textContent = '0';
        document.getElementById('totalRevenue').textContent = '$0';
        return;
    }
    
    const total = allOrders.length;
    const pending = allOrders.filter(o => o.status === 'pending').length;
    const processing = allOrders.filter(o => o.status === 'processing').length;
    const revenue = allOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    
    document.getElementById('totalOrders').textContent = total.toString();
    document.getElementById('pendingOrders').textContent = pending.toString();
    document.getElementById('processingOrders').textContent = processing.toString();
    document.getElementById('totalRevenue').textContent = `$${revenue.toFixed(2)}`;
}

// Yardımcı fonksiyonlar
function getOrderStatusClass(status) {
    const classMap = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'processing': 'bg-blue-100 text-blue-800',
        'shipped': 'bg-green-100 text-green-800',
        'delivered': 'bg-gray-100 text-gray-800',
        'cancelled': 'bg-red-100 text-red-800'
    };
    return classMap[status] || 'bg-gray-100 text-gray-800';
}

function getOrderStatusText(status) {
    const textMap = {
        'pending': 'Bekliyor',
        'processing': 'İşleniyor',
        'shipped': 'Gönderildi',
        'delivered': 'Teslim Edildi',
        'cancelled': 'İptal Edildi',
        'paid': 'Ödendi'
    };
    return textMap[status] || status;
}

function getStatusFromText(text) {
    const reverseMap = {
        'bekliyor': 'pending',
        'işleniyor': 'processing',
        'gönderildi': 'shipped',
        'teslim edildi': 'delivered',
        'iptal edildi': 'cancelled',
        'ödendi': 'paid'
    };
    return reverseMap[text.toLowerCase()] || text;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
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
window.viewOrderDetails = async function(orderId) {
    showNotification('Sipariş detayları gösterilecek', 'info');
};

window.processOrder = processOrder;
window.sendToPOD = sendToPOD;
window.syncEtsyOrders = syncEtsyOrders;
window.processSelectedOrders = processSelectedOrders;
window.toggleSelectAllOrders = toggleSelectAllOrders;

// Loading ve notification fonksiyonları (aynı)
function showLoading(message = 'Yükleniyor...') {
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
