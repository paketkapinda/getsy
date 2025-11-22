// supabase/functions/updateOrderStatus.ts
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

    const { order_id, status, business_notes } = await req.json();
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

    // Check if user owns the restaurant
    const { data: order } = await supabaseClient
      .from('restaurant_orders')
      .select(`
        *,
        restaurants!inner (
          business_id,
          businesses!inner (
            owner_id
          )
        )
      `)
      .eq('id', order_id)
      .single();

    if (!order || order.restaurants.businesses.owner_id !== user.id) {
      throw new Error('Order not found or access denied');
    }

    const updateData: any = { status };
    
    if (business_notes) {
      updateData.business_notes = business_notes;
    }

    if (status === 'preparing') {
      updateData.preparation_started_at = new Date().toISOString();
    } else if (status === 'ready') {
      updateData.estimated_ready_at = new Date().toISOString();
    } else if (status === 'dispatched') {
      updateData.estimated_delivery_time = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    } else if (status === 'delivered') {
      updateData.actual_delivery_time = new Date().toISOString();
    }

    const { data: updatedOrder, error } = await supabaseClient
      .from('restaurant_orders')
      .update(updateData)
      .eq('id', order_id)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ order: updatedOrder }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});