// Edge Function: Etsy OAuth authentication
// Handles OAuth flow and stores tokens encrypted

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

    const { code, shop_id } = await req.json();

    // Mock mode: return fake token
    if (Deno.env.get('MOCK_PROVIDER') === 'true') {
      const mockToken = `mock_etsy_token_${Date.now()}`;
      const { error: insertError } = await supabaseClient
        .from('etsy_accounts')
        .upsert({
          user_id: user.id,
          shop_id: shop_id || 'mock_shop_123',
          access_token_encrypted: btoa(mockToken), // Simple encoding for demo
          refresh_token_encrypted: btoa(`mock_refresh_${Date.now()}`),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          is_active: true,
        }, { onConflict: 'user_id,shop_id' });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true, shop_id: shop_id || 'mock_shop_123' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Real mode: exchange code for token via Etsy API
    const etsyClientId = Deno.env.get('ETSY_CLIENT_ID');
    const etsyClientSecret = Deno.env.get('ETSY_CLIENT_SECRET');
    const redirectUri = Deno.env.get('ETSY_REDIRECT_URI');

    const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: etsyClientId!,
        client_secret: etsyClientSecret!,
        code,
        redirect_uri: redirectUri!,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Etsy token exchange failed');
    }

    const tokenData = await tokenResponse.json();

    // Encrypt and store tokens
    const { error: insertError } = await supabaseClient
      .from('etsy_accounts')
      .upsert({
        user_id: user.id,
        shop_id: tokenData.shop_id,
        access_token_encrypted: btoa(tokenData.access_token),
        refresh_token_encrypted: btoa(tokenData.refresh_token),
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        is_active: true,
      }, { onConflict: 'user_id,shop_id' });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, shop_id: tokenData.shop_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

