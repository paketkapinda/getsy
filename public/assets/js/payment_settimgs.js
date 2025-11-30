// payment_settings.js - Settings sayfası için ödeme kanalı ayarları
import { supabase } from './supabaseClient.js';
import { showNotification } from './ui.js';

export async function loadPaymentSettings() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Önce mevcut kaydı kontrol et
    const { data: existingSettings } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingSettings) {
      document.getElementById('wise-api-key').value = existingSettings.wise_api_key_encrypted || '';
      document.getElementById('payoneer-api-key').value = existingSettings.payoneer_api_key_encrypted || '';
      document.getElementById('bank-name').value = existingSettings.bank_name || '';
      document.getElementById('iban').value = existingSettings.iban || '';
      document.getElementById('swift-code').value = existingSettings.swift_code || '';
      document.getElementById('account-holder').value = existingSettings.account_holder_name || '';
    }
  } catch (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error loading payment settings:', error);
      showNotification('Error loading payment settings', 'error');
    }
  }
}

export function initPaymentSettings() {
  const form = document.getElementById('form-payment');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await savePaymentSettings();
  });
}

async function savePaymentSettings() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const wiseApiKey = document.getElementById('wise-api-key').value;
    const payoneerApiKey = document.getElementById('payoneer-api-key').value;
    const bankName = document.getElementById('bank-name').value;
    const iban = document.getElementById('iban').value;
    const swiftCode = document.getElementById('swift-code').value;
    const accountHolder = document.getElementById('account-holder').value;

    // Önce mevcut kaydı kontrol et
    const { data: existingSettings } = await supabase
      .from('payment_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let result;
    if (existingSettings) {
      // UPDATE işlemi
      result = await supabase
        .from('payment_settings')
        .update({
          wise_api_key_encrypted: wiseApiKey,
          payoneer_api_key_encrypted: payoneerApiKey,
          bank_name: bankName,
          iban: iban,
          swift_code: swiftCode,
          account_holder_name: accountHolder,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    } else {
      // INSERT işlemi
      result = await supabase
        .from('payment_settings')
        .insert({
          user_id: user.id,
          wise_api_key_encrypted: wiseApiKey,
          payoneer_api_key_encrypted: payoneerApiKey,
          bank_name: bankName,
          iban: iban,
          swift_code: swiftCode,
          account_holder_name: accountHolder
        });
    }

    if (result.error) throw result.error;

    showNotification('Payment settings saved successfully', 'success');
  } catch (error) {
    console.error('Error saving payment settings:', error);
    showNotification('Error saving payment settings', 'error');
  }
}

// Settings sayfası için initialize
if (document.getElementById('form-payment')) {
  loadPaymentSettings();
  initPaymentSettings();
}
