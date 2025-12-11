// mockup.js - Mockup Giydirme Sistemi
let currentProduct = null;

async function generateProductMockups(productId) {
    try {
        showLoading('Mockup görselleri oluşturuluyor...');
        
        // Ürün bilgilerini al
        const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        
        if (!product) throw new Error('Ürün bulunamadı');
        
        currentProduct = product;
        
        // POD sağlayıcısını kontrol et
        const { data: podProvider } = await supabase
            .from('pod_providers')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_active', true)
            .single();
        
        let mockups = [];
        
        if (podProvider && podProvider.api_key) {
            // Gerçek POD API entegrasyonu
            mockups = await generateRealMockups(product, podProvider);
        } else {
            // Simüle mockup üretimi
            mockups = generateSimulatedMockups(product);
        }
        
        // Mockup'ları kaydet
        await saveMockups(productId, mockups);
        
        // Mockup galerisini göster
        displayMockupGallery(mockups);
        
        showNotification(`${mockups.length} mockup görseli oluşturuldu!`, 'success');
        
    } catch (error) {
        console.error('Mockup oluşturma hatası:', error);
        showNotification('Mockup oluşturulamadı: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function generateRealMockups(product, podProvider) {
    try {
        // Printful/Printify API için mockup verileri
        const mockupData = {
            product_id: product.id,
            design_url: product.images?.[0] || '',
            product_type: getProductType(product.category),
            mockup_type: 'all_angles',
            variants: [
                { size: 'S', color: 'white' },
                { size: 'M', color: 'black' },
                { size: 'L', color: 'gray' }
            ],
            angles: ['front', 'back', 'side', '3-4'],
            models: [
                { gender: 'male', age: 'adult' },
                { gender: 'female', age: 'adult' }
            ]
        };
        
        // Mock API response - gerçek implementasyonda değiştirilecek
        const mockResponse = {
            success: true,
            mockups: [
                {
                    id: 'mockup-1',
                    url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop',
                    angle: 'front',
                    style: 'male',
                    variant: 'S-white',
                    product_type: 'tshirt'
                },
                {
                    id: 'mockup-2',
                    url: 'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=600&h=800&fit=crop',
                    angle: 'back',
                    style: 'male',
                    variant: 'S-white',
                    product_type: 'tshirt'
                },
                {
                    id: 'mockup-3',
                    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop',
                    angle: 'front',
                    style: 'female',
                    variant: 'M-black',
                    product_type: 'tshirt'
                },
                {
                    id: 'mockup-4',
                    url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=800&fit=crop',
                    angle: 'side',
                    style: 'female',
                    variant: 'M-black',
                    product_type: 'tshirt'
                },
                {
                    id: 'mockup-5',
                    url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&h=800&fit=crop',
                    angle: '3-4',
                    style: 'lifestyle',
                    variant: 'L-gray',
                    product_type: 'tshirt'
                },
                {
                    id: 'mockup-6',
                    url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=800&fit=crop',
                    angle: 'flat',
                    style: 'flat',
                    variant: 'flat',
                    product_type: 'tshirt'
                }
            ]
        };
        
        return mockResponse.mockups;
        
    } catch (error) {
        console.error('Gerçek mockup API hatası:', error);
        // Hata durumunda simüle mockup dön
        return generateSimulatedMockups(product);
    }
}

function generateSimulatedMockups(product) {
    const angles = ['front', 'back', 'side', '3-4', 'flat'];
    const styles = ['male', 'female', 'child', 'lifestyle'];
    const colors = ['white', 'black', 'gray', 'navy', 'red'];
    const sizes = ['S', 'M', 'L', 'XL'];
    
    const mockups = [];
    
    // 6 farklı mockup oluştur
    for (let i = 0; i < 6; i++) {
        const angle = angles[i % angles.length];
        const style = styles[Math.floor(Math.random() * styles.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        
        // Mock görsel URL'i oluştur
        let imageUrl;
        
        if (style === 'lifestyle') {
            imageUrl = `https://images.unsplash.com/photo-155${6900000 + i}?w=600&h=800&fit=crop`;
        } else if (style === 'flat') {
            imageUrl = `https://images.unsplash.com/photo-152${1572000 + i}?w=600&h=600&fit=crop`;
        } else {
            imageUrl = `https://images.unsplash.com/photo-150${3342000 + i}?w=600&h=800&fit=crop`;
        }
        
        mockups.push({
            id: `sim-mockup-${i}`,
            url: imageUrl,
            angle: angle,
            style: style,
            variant: `${size}-${color}`,
            product_type: getProductType(product.category),
            is_simulated: true
        });
    }
    
    return mockups;
}

function getProductType(category) {
    const typeMap = {
        'Apparel': 'tshirt',
        'Home & Living': 'mug',
        'Accessories': 'phone_case',
        'Jewelry': 'jewelry',
        'Art & Collectibles': 'poster'
    };
    
    return typeMap[category] || 'tshirt';
}

async function saveMockups(productId, mockups) {
    try {
        // Mockup URL'lerini products tablosuna kaydet
        const mockupUrls = mockups.map(mockup => ({
            url: mockup.url,
            angle: mockup.angle,
            style: mockup.style,
            variant: mockup.variant,
            product_type: mockup.product_type
        }));
        
        const { error } = await supabase
            .from('products')
            .update({ mockup_urls: mockupUrls })
            .eq('id', productId);
        
        if (error) throw error;
        
        // product_mockups tablosuna da kaydet
        for (const mockup of mockups) {
            await supabase.from('product_mockups').insert({
                product_id: productId,
                image_url: mockup.url,
                angle: mockup.angle,
                style: mockup.style,
                created_at: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('Mockup kaydetme hatası:', error);
    }
}

function displayMockupGallery(mockups) {
    const modal = document.getElementById('mockupModal');
    if (!modal) return;
    
    let html = `
        <div class="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="text-2xl font-bold">
                            <i class="fas fa-tshirt mr-3"></i>Mockup Görselleri
                        </h3>
                        <p class="text-blue-100 mt-1">${mockups.length} mockup oluşturuldu</p>
                    </div>
                    <button onclick="closeModal('mockupModal')" class="text-white hover:text-blue-200 text-2xl">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="p-4 bg-gray-50 border-b">
                <div class="flex flex-wrap gap-2">
                    <button onclick="filterMockups('all')" class="px-4 py-2 bg-blue-600 text-white rounded-lg">
                        Tümü
                    </button>
                    <button onclick="filterMockups('male')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                        <i class="fas fa-male mr-2"></i>Erkek
                    </button>
                    <button onclick="filterMockups('female')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                        <i class="fas fa-female mr-2"></i>Kadın
                    </button>
                    <button onclick="filterMockups('flat')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                        <i class="fas fa-square mr-2"></i>Düz
                    </button>
                    <button onclick="filterMockups('lifestyle')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                        <i class="fas fa-image mr-2"></i>Lifestyle
                    </button>
                </div>
            </div>
            
            <div class="p-6 overflow-y-auto max-h-[60vh]">
                <div id="mockupGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    `;
    
    mockups.forEach((mockup, index) => {
        const styleClass = getMockupStyleClass(mockup.style);
        
        html += `
            <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden" data-style="${mockup.style}">
                <div class="relative h-64 bg-gray-100">
                    <img src="${mockup.url}" alt="Mockup ${index + 1}"
                         class="w-full h-full object-cover">
                    
                    <div class="absolute top-3 right-3 ${styleClass} px-3 py-1 rounded-full text-xs font-semibold">
                        ${getMockupStyleText(mockup.style)}
                    </div>
                    
                    <div class="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-xs">
                        ${mockup.angle.toUpperCase()} • ${mockup.variant}
                    </div>
                </div>
                
                <div class="p-4">
                    <div class="flex justify-between items-center">
                        <div>
                            <h4 class="font-medium text-gray-800">${getAngleText(mockup.angle)} Görünüm</h4>
                            <p class="text-sm text-gray-600">${mockup.variant}</p>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="downloadMockup('${mockup.url}', 'mockup-${index + 1}')" 
                                    class="text-blue-600 hover:text-blue-800 p-2"
                                    title="İndir">
                                <i class="fas fa-download"></i>
                            </button>
                            <button onclick="useMockupAsMain(${index})" 
                                    class="text-green-600 hover:text-green-800 p-2"
                                    title="Ana Görsel Yap">
                                <i class="fas fa-star"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
                </div>
            </div>
            
            <div class="bg-gray-50 p-4 border-t">
                <div class="flex justify-between items-center">
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-info-circle mr-2"></i>
                        Mockup'ları indirebilir veya ana görsel olarak kullanabilirsiniz
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal('mockupModal')" 
                                class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                            Kapat
                        </button>
                        <button onclick="regenerateMockups()" 
                                class="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90">
                            <i class="fas fa-sync mr-2"></i>Yeniden Oluştur
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    modal.classList.remove('hidden');
}

function getMockupStyleClass(style) {
    const classMap = {
        'male': 'bg-blue-100 text-blue-800',
        'female': 'bg-pink-100 text-pink-800',
        'child': 'bg-green-100 text-green-800',
        'lifestyle': 'bg-purple-100 text-purple-800',
        'flat': 'bg-gray-100 text-gray-800'
    };
    
    return classMap[style] || 'bg-gray-100 text-gray-800';
}

function getMockupStyleText(style) {
    const textMap = {
        'male': 'Erkek',
        'female': 'Kadın',
        'child': 'Çocuk',
        'lifestyle': 'Lifestyle',
        'flat': 'Düz'
    };
    
    return textMap[style] || style;
}

function getAngleText(angle) {
    const textMap = {
        'front': 'Ön',
        'back': 'Arka',
        'side': 'Yan',
        '3-4': '3/4',
        'flat': 'Düz'
    };
    
    return textMap[angle] || angle;
}

// Global fonksiyonlar
window.filterMockups = function(filter) {
    const cards = document.querySelectorAll('#mockupGrid > div');
    
    cards.forEach(card => {
        if (filter === 'all') {
            card.style.display = '';
        } else {
            const style = card.getAttribute('data-style');
            card.style.display = style === filter ? '' : 'none';
        }
    });
};

window.downloadMockup = function(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Mockup indiriliyor...', 'success');
};

window.useMockupAsMain = async function(index) {
    if (!currentProduct) return;
    
    try {
        showLoading('Ana görsel güncelleniyor...');
        
        const mockup = currentProduct.mockup_urls?.[index];
        if (!mockup) throw new Error('Mockup bulunamadı');
        
        // Ana görseli güncelle
        const { error } = await supabase
            .from('products')
            .update({ 
                images: [mockup.url],
                updated_at: new Date().toISOString()
            })
            .eq('id', currentProduct.id);
        
        if (error) throw error;
        
        showNotification('Ana görsel başarıyla güncellendi!', 'success');
        
    } catch (error) {
        showNotification('Görsel güncellenemedi: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.regenerateMockups = function() {
    if (!currentProduct) return;
    
    generateProductMockups(currentProduct.id);
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.innerHTML = '';
        currentProduct = null;
    }
};