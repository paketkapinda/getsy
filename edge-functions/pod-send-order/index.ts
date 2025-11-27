// Edge Function: Send order to POD provider
// Routes order to selected POD provider and updates tracking

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

    // Get producer (or auto-select)
    let producer;
    if (producer_id) {
      const { data, error } = await supabaseClient
        .from('producers')
        .select('*')
        .eq('id', producer_id)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      producer = data;
    } else {
      // Auto-select first active producer
      const { data, error } = await supabaseClient
        .from('producers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();
      if (error) throw new Error('No active producer found');
      producer = data;
    }

    // Mock mode
    if (Deno.env.get('MOCK_PROVIDER') === 'true') {
      const mockTracking = `MOCK${Date.now()}`;
      await supabaseClient
        .from('orders')
        .update({
          status: 'shipped',
          tracking_number: mockTracking,
        })
        .eq('id', order_id);

      return new Response(
        JSON.stringify({ success: true, tracking_number: mockTracking, status: 'shipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Real mode: send to POD provider
    const apiKey = atob(producer.api_key_encrypted || '');
    const response = await fetch(`${producer.base_url}/orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.etsy_order_id,
        items: order.items,
        shipping_address: order.shipping_address,
      }),
    });

    if (!response.ok) {
      throw new Error('POD API error');
    }

    const podResponse = await response.json();

    await supabaseClient
      .from('orders')
      .update({
        status: 'shipped',
        tracking_number: podResponse.tracking_number,
      })
      .eq('id', order_id);

    return new Response(
      JSON.stringify({ success: true, tracking_number: podResponse.tracking_number, status: 'shipped' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});


