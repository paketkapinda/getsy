// Edge Function: POD webhook handler
// Receives webhook from POD provider, updates orders, triggers notifications

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

    // Verify HMAC signature (if provided)
    const signature = req.headers.get('x-pod-signature');
    const webhookSecret = Deno.env.get('POD_WEBHOOK_SECRET');
    if (webhookSecret && signature) {
      // HMAC verification logic here (simplified for demo)
      // In production, verify signature matches payload
    }

    const payload = await req.json();
    const { order_id, tracking_number, status } = payload;

    // Update order
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        tracking_number,
        status: status || 'shipped',
      })
      .eq('etsy_order_id', order_id);

    if (updateError) throw updateError;

    // Trigger customer feedback email job (enqueue)
    await supabaseClient.from('job_queue').insert({
      job_type: 'customer_feedback',
      status: 'pending',
      payload: { order_id },
    });

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

