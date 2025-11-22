// supabase/functions/createOrder.ts
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

    const { restaurant_id, items, delivery_type, delivery_address, total_price, special_instructions } = await req.json();
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

    // Create order
    const { data: order, error } = await supabaseClient
      .from('restaurant_orders')
      .insert({
        user_id: user.id,
        restaurant_id,
        items,
        delivery_type,
        delivery_address,
        total_price,
        special_instructions,
        status: 'pending',
        payment_status: 'pending',
        estimated_delivery_time: new Date(Date.now() + 45 * 60 * 1000).toISOString() // 45 minutes from now
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ order }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});