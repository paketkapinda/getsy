// Edge Function: Sync orders from Etsy
// Polls Etsy API and updates orders table

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

    const { shop_id } = await req.json();

    // Get Etsy account
    const { data: etsyAccount, error: accountError } = await supabaseClient
      .from('etsy_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('shop_id', shop_id)
      .single();

    if (accountError || !etsyAccount) {
      throw new Error('Etsy account not found');
    }

    // Mock mode
    if (Deno.env.get('MOCK_PROVIDER') === 'true') {
      const mockOrders = [
        {
          etsy_order_id: `mock_${Date.now()}`,
          customer_name: 'Mock Customer',
          total_amount: 29.99,
          status: 'pending',
          items: [{ product_title: 'Mock Product', quantity: 1, price: 29.99 }],
        },
      ];

      for (const order of mockOrders) {
        await supabaseClient.from('orders').upsert({
          user_id: user.id,
          etsy_order_id: order.etsy_order_id,
          customer_name: order.customer_name,
          total_amount: order.total_amount,
          status: order.status,
          items: order.items,
        }, { onConflict: 'etsy_order_id' });
      }

      return new Response(
        JSON.stringify({ success: true, synced: mockOrders.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Real mode: fetch from Etsy API
    const accessToken = atob(etsyAccount.access_token_encrypted);
    const response = await fetch(`https://api.etsy.com/v3/application/shops/${shop_id}/receipts`, {
      headers: { 'x-api-key': Deno.env.get('ETSY_CLIENT_ID')!, 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Etsy API error');
    }

    const etsyOrders = await response.json();

    // Transform and insert orders
    let synced = 0;
    for (const etsyOrder of etsyOrders.results || []) {
      await supabaseClient.from('orders').upsert({
        user_id: user.id,
        etsy_order_id: etsyOrder.receipt_id.toString(),
        customer_name: `${etsyOrder.buyer_name || ''}`,
        total_amount: parseFloat(etsyOrder.grandtotal || '0'),
        status: 'pending',
        items: etsyOrder.transactions?.map((t: any) => ({
          product_title: t.title,
          quantity: t.quantity,
          price: parseFloat(t.price || '0'),
        })) || [],
      }, { onConflict: 'etsy_order_id' });
      synced++;
    }

    return new Response(
      JSON.stringify({ success: true, synced }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});


