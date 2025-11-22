// supabase/functions/processIBANTransfer.ts
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

    const { amount, currency, iban, reference } = await req.json();
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

    // Simulate bank transfer processing
    // In production, integrate with actual banking API
    const transactionId = `IBAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create payment record
    const { data: payment, error } = await supabaseClient
      .from('payments')
      .insert({
        user_id: user.id,
        amount,
        currency,
        status: 'completed',
        payment_method: 'iban_transfer',
        stripe_payment_id: transactionId
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        payment,
        transaction_id: transactionId,
        message: 'IBAN transfer initiated successfully'
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