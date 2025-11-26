// Edge Function: Generate multi-angle mockups
// Calls OpenAI/vision or internal render pipeline, saves to Storage

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

    const { product_id, design_base64, presets } = await req.json();
    const { category, angles = ['front'] } = presets || {};

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

    // Mock mode: generate placeholder images
    if (Deno.env.get('MOCK_PROVIDER') === 'true') {
      const mockUrls: string[] = [];
      for (const angle of angles) {
        // In real implementation, would generate actual mockup
        // For demo, return placeholder URLs
        const mockUrl = `https://via.placeholder.com/800x800/1e293b/64748b?text=Mockup+${angle}`;
        mockUrls.push(mockUrl);
      }

      // Update product with mockup URLs
      await supabaseClient
        .from('products')
        .update({ mockup_urls: mockUrls })
        .eq('id', product_id);

      // Log AI operation
      await supabaseClient.from('ai_logs').insert({
        user_id: user.id,
        product_id,
        operation_type: 'mockup',
        status: 'completed',
        input_data: { angles, category },
        output_data: { urls: mockUrls },
      });

      return new Response(
        JSON.stringify({ success: true, storage_urls: mockUrls, mockup_ids: mockUrls.map((_, i) => `mock_${i}`) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Real mode: call OpenAI or render pipeline
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const storageUrls: string[] = [];
    const mockupIds: string[] = [];

    for (const angle of angles) {
      // Call OpenAI DALL-E or vision API (simplified)
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Product mockup ${angle} angle for ${category} with design overlay`,
          size: '1024x1024',
        }),
      });

      if (!response.ok) {
        throw new Error('OpenAI API error');
      }

      const imageData = await response.json();
      const imageUrl = imageData.data[0].url;

      // Download and upload to Supabase Storage
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      const fileName = `mockups/${product_id}/${angle}_${Date.now()}.png`;

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('mockups')
        .upload(fileName, imageBlob, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('mockups')
        .getPublicUrl(fileName);

      storageUrls.push(publicUrl);
      mockupIds.push(fileName);
    }

    // Update product
    await supabaseClient
      .from('products')
      .update({ mockup_urls: storageUrls })
      .eq('id', product_id);

    // Log AI operation
    await supabaseClient.from('ai_logs').insert({
      user_id: user.id,
      product_id,
      operation_type: 'mockup',
      status: 'completed',
      input_data: { angles, category, design_base64: design_base64?.substring(0, 100) },
      output_data: { urls: storageUrls },
      model_used: 'dall-e-3',
    });

    return new Response(
      JSON.stringify({ success: true, storage_urls: storageUrls, mockup_ids: mockupIds }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

