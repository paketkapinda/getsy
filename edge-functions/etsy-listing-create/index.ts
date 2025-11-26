// Edge Function: Create Etsy listing
// Creates listing on Etsy and updates product status

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

    const { product_id, shop_id } = await req.json();

    // Get product
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('user_id', user.id)
      .single();

    if (productError || !product) {
      throw new Error('Product not found');
    }

    // Get active Etsy account
    const { data: etsyAccount, error: accountError } = await supabaseClient
      .from('etsy_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq(shop_id ? 'shop_id' : 'is_active', shop_id || true)
      .single();

    if (accountError || !etsyAccount) {
      throw new Error('Active Etsy account not found');
    }

    // Mock mode
    if (Deno.env.get('MOCK_PROVIDER') === 'true') {
      const mockListingId = `mock_listing_${Date.now()}`;
      await supabaseClient
        .from('products')
        .update({
          status: 'listed',
          etsy_listing_id: mockListingId,
        })
        .eq('id', product_id);

      return new Response(
        JSON.stringify({ success: true, listing_id: mockListingId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Real mode: create listing via Etsy API
    const accessToken = atob(etsyAccount.access_token_encrypted);
    const response = await fetch(`https://api.etsy.com/v3/application/shops/${etsyAccount.shop_id}/listings`, {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ETSY_CLIENT_ID')!,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quantity: 1,
        title: product.title,
        description: product.description || '',
        price: product.price,
        who_made: 'i_did',
        when_made: '2020_2024',
        taxonomy_id: 69150467, // Default category
      }),
    });

    if (!response.ok) {
      throw new Error('Etsy API error');
    }

    const listingData = await response.json();
    const listingId = listingData.listing_id;

    await supabaseClient
      .from('products')
      .update({
        status: 'listed',
        etsy_listing_id: listingId.toString(),
      })
      .eq('id', product_id);

    return new Response(
      JSON.stringify({ success: true, listing_id: listingId.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

