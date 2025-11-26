// Edge Function: Upload image to Etsy listing
// Uploads product mockup images to Etsy

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

    const { listing_id, image_url } = await req.json();

    // Get Etsy account
    const { data: etsyAccount, error: accountError } = await supabaseClient
      .from('etsy_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (accountError || !etsyAccount) {
      throw new Error('Etsy account not found');
    }

    // Mock mode
    if (Deno.env.get('MOCK_PROVIDER') === 'true') {
      return new Response(
        JSON.stringify({ success: true, image_id: `mock_image_${Date.now()}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Real mode: upload to Etsy
    const accessToken = atob(etsyAccount.access_token_encrypted);
    const imageResponse = await fetch(image_url);
    const imageBlob = await imageResponse.blob();

    const formData = new FormData();
    formData.append('image', imageBlob);

    const response = await fetch(`https://api.etsy.com/v3/application/shops/${etsyAccount.shop_id}/listings/${listing_id}/images`, {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ETSY_CLIENT_ID')!,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Etsy image upload failed');
    }

    const imageData = await response.json();

    return new Response(
      JSON.stringify({ success: true, image_id: imageData.listing_image_id.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

