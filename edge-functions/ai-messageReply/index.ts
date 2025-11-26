// Edge Function: AI auto-reply to Etsy messages
// Generates AI response and saves to messages table

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

    const { message_id } = await req.json();

    // Get message
    const { data: message, error: messageError } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('id', message_id)
      .eq('user_id', user.id)
      .single();

    if (messageError || !message) {
      throw new Error('Message not found');
    }

    // Mock mode
    if (Deno.env.get('MOCK_PROVIDER') === 'true') {
      const mockReply = 'Thank you for your message! We appreciate your interest and will get back to you soon.';
      await supabaseClient
        .from('messages')
        .update({ ai_response: mockReply })
        .eq('id', message_id);

      return new Response(
        JSON.stringify({ success: true, reply: mockReply }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Real mode: generate AI reply
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Generate a friendly, professional customer service reply to this Etsy message: "${message.content}". Keep it concise and helpful.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API error');
    }

    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    // Save AI response
    await supabaseClient
      .from('messages')
      .update({ ai_response: aiReply })
      .eq('id', message_id);

    // Log AI operation
    await supabaseClient.from('ai_logs').insert({
      user_id: user.id,
      operation_type: 'message_reply',
      input_data: { message_id, original_message: message.content },
      output_data: { reply: aiReply },
      model_used: 'gpt-4',
      status: 'completed',
    });

    return new Response(
      JSON.stringify({ success: true, reply: aiReply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

