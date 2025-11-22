// supabase/functions/walletWithdraw.ts
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

    const { amount, destination } = await req.json();
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

    // Check user balance (simplified)
    const { data: payments } = await supabaseClient
      .from('payments')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .eq('payment_method', 'wallet');

    const totalBalance = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    if (totalBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Create withdrawal transaction
    const { data: transaction, error } = await supabaseClient
      .from('payments')
      .insert({
        user_id: user.id,
        amount: -amount, // Negative for withdrawal
        currency: 'USD',
        status: 'completed',
        payment_method: 'wallet',
        stripe_payment_id: `WITHDRAW_${Date.now()}`
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        transaction,
        message: 'Withdrawal processed successfully'
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