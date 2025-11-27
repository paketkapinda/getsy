// Edge Function: Admin reports and KPIs
// Generates dashboard data for admin/producer panels

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

    // Get KPIs
    const { count: productsCount } = await supabaseClient
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: ordersCount } = await supabaseClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: payments } = await supabaseClient
      .from('payments')
      .select('net_payout')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    const monthlyRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.net_payout || '0'), 0) || 0;

    return new Response(
      JSON.stringify({
        success: true,
        kpis: {
          total_products: productsCount || 0,
          total_orders: ordersCount || 0,
          monthly_revenue: monthlyRevenue,
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


