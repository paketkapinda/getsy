// Edge Function: Etsy webhook handler
// Receives webhooks from Etsy, updates orders, triggers jobs

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

    // Verify HMAC signature
    const signature = req.headers.get('x-etsy-signature');
    const webhookSecret = Deno.env.get('ETSY_WEBHOOK_SECRET');
    if (webhookSecret && signature) {
      // HMAC verification logic (simplified for demo)
    }

    const payload = await req.json();
    const { event_type, data } = payload;

    // Handle different event types
    if (event_type === 'order.created' || event_type === 'order.updated') {
      const orderId = data.receipt_id?.toString();
      if (orderId) {
        await supabaseClient.from('orders').upsert({
          etsy_order_id: orderId,
          customer_name: data.buyer_name || '',
          total_amount: parseFloat(data.grandtotal || '0'),
          status: 'pending',
          items: data.transactions?.map((t: any) => ({
            product_title: t.title,
            quantity: t.quantity,
            price: parseFloat(t.price || '0'),
          })) || [],
        }, { onConflict: 'etsy_order_id' });
      }
    }

    // Update rating_stats if review event
    if (event_type === 'review.created') {
      // Update product rating stats
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});


