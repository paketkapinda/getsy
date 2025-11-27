// Edge Function: Generate SEO tags and descriptions
// Uses OpenAI to generate optimized content

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

    const { product_id, type, title, context } = await req.json();

    // Mock mode
    if (Deno.env.get('MOCK_PROVIDER') === 'true') {
      if (type === 'description') {
        return new Response(
          JSON.stringify({
            success: true,
            description: `Beautiful ${title || 'product'} with high-quality design. Perfect for everyday use.`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (type === 'tags') {
        return new Response(
          JSON.stringify({
            success: true,
            tags: ['handmade', 'custom', 'unique', 'gift', 'artisan'],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Real mode: call OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = type === 'description'
      ? `Generate an Etsy product description for: ${title}. Context: ${context || ''}`
      : `Generate SEO tags for Etsy product: ${title}. Return as comma-separated list.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: type === 'description' ? 500 : 100,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API error');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Log AI operation
    await supabaseClient.from('ai_logs').insert({
      user_id: user.id,
      product_id,
      operation_type: 'seo',
      status: 'completed',
      input_data: { type, title, context },
      output_data: type === 'description' ? { description: content } : { tags: content.split(',') },
      model_used: 'gpt-4',
    });

    if (type === 'description') {
      return new Response(
        JSON.stringify({ success: true, description: content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } else {
      return new Response(
        JSON.stringify({ success: true, tags: content.split(',').map((t: string) => t.trim()) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});


