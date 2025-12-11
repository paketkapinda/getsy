// Siparişleri POD firmasına gönderme
async function sendOrderToPOD(orderId) {
    try {
        const { data: order } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (*)
                )
            `)
            .eq('id', orderId)
            .single();
        
        // POD sağlayıcısını seç
        const { data: podProvider } = await supabase
            .from('pod_providers')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true)
            .single();
        
        if (!podProvider) {
            showNotification('Aktif POD sağlayıcısı bulunamadı.', 'error');
            return;
        }
        
        // POD API'sine sipariş oluştur
        const podOrder = {
            external_id: order.etsy_order_id || order.id,
            shipping: {
                name: order.shipping_name,
                address1: order.shipping_address,
                city: order.shipping_city,
                country_code: order.shipping_country,
                zip: order.shipping_zip
            },
            items: order.order_items.map(item => ({
                variant_id: getPODVariantId(item.products),
                quantity: item.quantity,
                files: [
                    {
                        url: item.products.images[0],
                        type: 'default'
                    }
                ],
                options: {
                    size: item.size,
                    color: item.color
                }
            }))
        };
        
        // Printful/Printify API çağrısı
        const response = await fetch(`https://api.printful.com/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${podProvider.api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(podOrder)
        });
        
        const podResponse = await response.json();
        
        if (podResponse.code === 200) {
            // Sipariş durumunu güncelle
            await supabase
                .from('orders')
                .update({
                    status: 'processing',
                    pod_order_id: podResponse.result.id,
                    pod_provider: podProvider.provider_name,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);
            
            // Ödeme kaydı oluştur
            await createPaymentRecord(order);
            
            showNotification('Sipariş POD firmasına başarıyla gönderildi!', 'success');
        }
    } catch (error) {
        console.error('POD sipariş hatası:', error);
        showNotification(`POD gönderme hatası: ${error.message}`, 'error');
    }
}

// POD varyant ID'sini bulma
function getPODVariantId(product) {
    // Bu fonksiyon ürün bilgisine göre POD varyant ID'sini döndürmeli
    // Örnek: Printful varyant ID'leri
    const variantMap = {
        'Gildan 64000 Unisex Softstyle T-Shirt': 4011,
        'Bella + Canvas 3001 Unisex Jersey Short Sleeve Tee': 4367,
        'Unisex Heavy Cotton Tee': 4383
    };
    
    return variantMap[product.title] || 4011; // Varsayılan
}
