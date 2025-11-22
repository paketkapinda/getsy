// supabase/functions/processCryptoPayment.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { amount, currency, crypto_type, wallet_address } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user } } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!user) {
      throw new Error('Invalid user');
    }

    // Simulate crypto payment processing
    const transactionId = `CRYPTO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create payment record
    const { data: payment, error } = await supabaseClient
      .from('payments')
      .insert({
        user_id: user.id,
        amount,
        currency,
        status: 'pending', // Crypto payments need confirmations
        payment_method: 'crypto',
        stripe_payment_id: transactionId
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        payment,
        transaction_id: transactionId,
        crypto_address: getCryptoAddress(crypto_type),
        message: 'Send crypto to the address below'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

function getCryptoAddress(cryptoType: string): string {
  const addresses: { [key: string]: string } = {
    'usdt': Deno.env.get('CRYPTO_USDT_WALLET') ?? '0xUSDT_WALLET_ADDRESS',
    'eth': Deno.env.get('CRYPTO_ETH_WALLET') ?? '0xETH_WALLET_ADDRESS',
    'btc': Deno.env.get('CRYPTO_BTC_WALLET') ?? '1BTC_WALLET_ADDRESS'
  };
  return addresses[cryptoType.toLowerCase()] || addresses.usdt;
}