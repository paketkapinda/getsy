// Edge Function: Calculate POD cost
// Calculates cost from POD provider for a product

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

    const { product_id, producer_id, quantity = 1 } = await req.json();

    // Mock mode
    if (Deno.env.get('MOCK_PROVIDER') === 'true') {
      return new Response(
        JSON.stringify({
          success: true,
          cost_per_unit: 5.50,
          shipping: 3.99,
          total: 5.50 * quantity + 3.99,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Real mode: call POD provider API
    const { data: producer, error: producerError } = await supabaseClient
      .from('producers')
      .select('*')
      .eq('id', producer_id)
      .eq('user_id', user.id)
      .single();

    if (producerError || !producer) {
      throw new Error('Producer not found');
    }

    // Call provider-specific API (example for Printify)
    const apiKey = atob(producer.api_key_encrypted || '');
    const response = await fetch(`${producer.base_url}/calculate-cost`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id, quantity }),
    });

    if (!response.ok) {
      throw new Error('POD API error');
    }

    const costData = await response.json();

    return new Response(
      JSON.stringify({ success: true, ...costData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

