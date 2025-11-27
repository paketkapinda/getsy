// Edge Function: Calculate and distribute payments
// Computes splits (platform fee, producer cost, gateway fees) and stores in payments table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const { order_id, producer_id } = await req.json();

    // Get order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Get producer
    const { data: producer, error: producerError } = await supabaseClient
      .from('producers')
      .select('*')
      .eq('id', producer_id)
      .eq('user_id', user.id)
      .single();

    if (producerError || !producer) {
      throw new Error('Producer not found');
    }

    // Calculate costs
    const basePrice = parseFloat(order.total_amount || '0');
    const platformFeePercent = 0.15; // 15%
    const paymentGatewayFeePercent = 0.03; // 3%
    const platformFee = basePrice * platformFeePercent;
    const paymentGatewayFee = basePrice * paymentGatewayFeePercent;

    // Get POD cost (from producer_products or estimate)
    const { data: producerProduct } = await supabaseClient
      .from('producer_products')
      .select('cost_per_unit')
      .eq('product_id', order.items[0]?.product_id || '')
      .eq('producer_id', producer_id)
      .single();

    const podCost = parseFloat(producerProduct?.cost_per_unit || '5.50');
    const shipping = 3.99; // Estimate

    // Payment gateway fees (Wise/Payoneer)
    const wiseFee = Deno.env.get('USE_WISE') === 'true' ? basePrice * 0.01 : 0;
    const payoneerFee = Deno.env.get('USE_PAYONEER') === 'true' ? basePrice * 0.015 : 0;

    const netPayout = basePrice - podCost - shipping - platformFee - paymentGatewayFee - wiseFee - payoneerFee;

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        order_id,
        user_id: user.id,
        producer_id,
        amount: basePrice,
        producer_cost: podCost,
        platform_fee: platformFee,
        payment_gateway_fee: paymentGatewayFee,
        wise_fee: wiseFee,
        payoneer_fee: payoneerFee,
        net_payout: netPayout,
        status: 'pending',
        currency: 'USD',
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        breakdown: {
          base_price: basePrice,
          pod_cost: podCost,
          shipping,
          platform_fee: platformFee,
          payment_gateway_fee: paymentGatewayFee,
          wise_fee: wiseFee,
          payoneer_fee: payoneerFee,
          net_payout: netPayout,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});


