// Supabase client initialisation for browser
// Uses anon key and URL from window globals injected by env.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

// Wait for env.js to load credentials if needed
async function waitForCredentials() {
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    return;
  }
  
  if (window.__SUPABASE_ENV_PROMISE__) {
    await window.__SUPABASE_ENV_PROMISE__;
  } else {
    // Wait a short time for env.js to load
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

await waitForCredentials();

const supabaseUrl = window.SUPABASE_URL;
const supabaseAnonKey = window.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabaseClient] Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
    'Make sure env.js is loaded before supabaseClient.js. ' +
    'Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment variables.'
  );
  throw new Error('Supabase credentials not loaded');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});

// ==================== REFERRAL SYSTEM FUNCTIONS ====================

// Rastgele referral code oluşturma fonksiyonu
export function generateReferralCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Referans kodunu oluştur (artık UUID kullanıyoruz)
export function getReferralCode(userId) {
    if (!userId) return null;
    
    // UUID'yi kısaltılmış ve URL-safe hale getir
    // Örnek: "3daf728d-ac33-4e8e-b8c7-5287b3c6fa93" -> "3daf728d"
    const shortId = userId.split('-')[0];
    return shortId.toLowerCase();
}

// URL'den referral code çıkarma fonksiyonu
export function getReferralCodeFromURL() {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (!refCode) return null;
    
    // Referans kodunu tam UUID'ye çevir
    // Kullanıcı ID formatına uygun hale getir
    return refCode.toLowerCase();
}

// Referans kaydı oluşturma fonksiyonu (güncellendi)
export async function createProfileWithReferral(user, referralCode = null) {
    try {
        let referredBy = null;
        
        // Eğer referral code varsa, referans veren kullanıcıyı bul
        if (referralCode) {
            // Referans kodunu UUID formatına çevir
            const fullUserId = await findUserByReferralCode(referralCode);
            
            if (fullUserId) {
                referredBy = fullUserId;
                console.log(`Referans bulundu: ${referredBy} yeni kullanıcıyı refer etti`);
            }
        }
        
        // Kullanıcı profili oluştur - UUID'yi referral code olarak kullan
        const userReferralCode = getReferralCode(user.id);
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || '',
                referral_code: userReferralCode, // Kısaltılmış UUID
                referred_by: referredBy,
                referral_balance: 0,
                total_referrals: 0,
                role: 'admin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id',
                ignoreDuplicates: false
            })
            .select()
            .single();
        
        if (profileError) {
            console.error('Profil oluşturma hatası:', profileError);
            throw profileError;
        }
        
        console.log('Profil başarıyla oluşturuldu. Referral code:', userReferralCode);
        
        // Eğer referans varsa, referans veren kullanıcının bakiyesini güncelle
        if (referredBy) {
            await addReferralBonus(referredBy);
        }
        
        return profile;
    } catch (error) {
        console.error('Profil oluşturma hatası:', error);
        throw error;
    }
}

// Referans kodu ile kullanıcı bul
async function findUserByReferralCode(referralCode) {
    try {
        // Tüm kullanıcıları getir ve referral_code'u kısaltılmış UUID olanları bul
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, referral_code');
        
        if (error) throw error;
        
        // Her kullanıcı için referral_code'u kontrol et
        for (const user of users) {
            if (user.referral_code === referralCode.toLowerCase()) {
                return user.id;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Find user by referral code error:', error);
        return null;
    }
}

// Kullanıcının referral bilgilerini getir (güncellendi)
export async function getUserReferralInfo(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('referral_code, referral_balance, total_referrals, full_name')
            .eq('id', userId)
            .single();
        
        if (error) {
            // Eğer kayıt yoksa, referral_code oluştur
            console.log('Profile not found, creating referral code...');
            const referralCode = getReferralCode(userId);
            return {
                referral_code: referralCode,
                referral_balance: 0,
                total_referrals: 0,
                full_name: ''
            };
        }
        
        // Eğer referral_code yoksa, oluştur
        if (!profile.referral_code) {
            const referralCode = getReferralCode(userId);
            
            // Database'i güncelle
            await supabase
                .from('profiles')
                .update({
                    referral_code: referralCode,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);
            
            profile.referral_code = referralCode;
        }
        
        return profile;
    } catch (error) {
        console.error('Referral info get error:', error);
        
        // Hata durumunda da referral code oluştur
        const referralCode = getReferralCode(userId);
        return {
            referral_code: referralCode,
            referral_balance: 0,
            total_referrals: 0,
            full_name: ''
        };
    }
}


// Referans bonusu ekleme fonksiyonu
async function addReferralBonus(referrerId) {
    try {
        // Referans bonusu: 29 USD'nin %30'u = 8.7 USD
        const referralBonus = 8.70;
        
        console.log(`Referans bonusu ekleniyor: $${referralBonus} kullanıcı ${referrerId}'ye`);
        
        // Önce referans verenin mevcut bakiyesini al
        const { data: referrerData } = await supabase
            .from('profiles')
            .select('referral_balance, total_referrals')
            .eq('id', referrerId)
            .single();
        
        if (referrerData) {
            // Bakiyeyi güncelle
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    referral_balance: (parseFloat(referrerData.referral_balance) || 0) + referralBonus,
                    total_referrals: (parseInt(referrerData.total_referrals) || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', referrerId);
            
            if (updateError) {
                console.error('Referans bonusu güncellenemedi:', updateError);
            } else {
                console.log(`Referans bonusu başarıyla eklendi: ${referrerId}`);
            }
        }
    } catch (error) {
        console.error('Referans bonusu ekleme hatası:', error);
    }
}

// Kullanıcının referral bilgilerini getir
export async function getUserReferralInfo(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('referral_code, referral_balance, total_referrals, full_name')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return profile;
    } catch (error) {
        console.error('Referral info get error:', error);
        return null;
    }
}

// Referans geçmişini getir
export async function getReferralHistory(userId) {
    try {
        const { data: referrals, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, created_at')
            .eq('referred_by', userId)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        return referrals || [];
    } catch (error) {
        console.error('Referral history error:', error);
        return [];
    }
}

// ==================== UTILITY FUNCTIONS ====================

// Bildirim gösterme fonksiyonu
export function showNotification(message, type = 'info') {
    if (typeof document === 'undefined') return;
    
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 10px;
        color: white;
        font-weight: 500;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    } else if (type === 'warning') {
        notification.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    }
    
    notification.textContent = message;
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    container.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
    
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Modal gizleme fonksiyonu
export function hideModal(modalId) {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Modal gösterme fonksiyonu
export function showModal(modalId) {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// ==================== EXISTING CODE - DO NOT MODIFY ====================

// Modal fonksiyonları - product-detail.js'ye ekle
function setupModal() {
  // Modal kapatma
  const modalClose = document.getElementById('modal-product-close');
  const cancelBtn = document.getElementById('btn-cancel-product');
  const modal = document.getElementById('modal-product');

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      hideModal('modal-product');
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      hideModal('modal-product');
    });
  }

  // Modal dışına tıklayınca kapat
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal('modal-product');
      }
    });
  }

  // Form submission
  const form = document.getElementById('form-product');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('product-id').value;
      const title = document.getElementById('product-title').value;
      const category = document.getElementById('product-category').value;
      const price = document.getElementById('product-price').value;
      const status = document.getElementById('product-status').value;
      const description = document.getElementById('product-description').value;

      if (!title || !category || !price) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }

      try {
        showNotification('Updating product...', 'info');
        
        const productData = {
          title,
          category,
          price: parseFloat(price),
          status: status || 'draft',
          description,
          updated_at: new Date().toISOString()
        };

        // Simüle edilmiş güncelleme
        setTimeout(() => {
          showNotification('Product updated successfully!', 'success');
          hideModal('modal-product');
          
          // Sayfayı yenile
          setTimeout(() => {
            loadProductDetail();
          }, 500);
          
        }, 1000);

      } catch (error) {
        console.error('❌ Update error:', error);
        showNotification('Update failed', 'error');
      }
    });
  }
}

// Sayfa yüklendiğinde modal setup'ını da çağır
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Product Detail yüklendi');
  
  if (document.getElementById('product-detail-container')) {
    loadProductDetail();
    setupActionButtons();
    setupModal(); // Modal setup'ını ekledik
  }
});

