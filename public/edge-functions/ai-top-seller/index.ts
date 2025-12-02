// Edge Function: Top-seller analysis with time-series forecast
// Uses reviews, favorites, variant pricing + AI for 3-month forecast

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

    const { shop_id, months = 12 } = await req.json();

    // Get top sellers from Etsy (mock or real)
    // Mock mode
    if (Deno.env.get('MOCK_PROVIDER') === 'true') {
      const mockAnalysis = {
        trend_scores: [
          { product_id: 'mock_1', trend_score: 85, monthly_sales_estimate: 120 },
          { product_id: 'mock_2', trend_score: 72, monthly_sales_estimate: 95 },
        ],
        forecasts: {
          'mock_1': { month_1: 125, month_2: 130, month_3: 135 },
          'mock_2': { month_1: 98, month_2: 102, month_3: 105 },
        },
      };

      // Store in top_seller_analysis table
      for (const item of mockAnalysis.trend_scores) {
        await supabaseClient.from('top_seller_analysis').upsert({
          user_id: user.id,
          product_id: item.product_id,
          trend_score: item.trend_score,
          monthly_sales_estimate: item.monthly_sales_estimate,
          forecast_3month: mockAnalysis.forecasts[item.product_id as keyof typeof mockAnalysis.forecasts],
        }, { onConflict: 'user_id,product_id' });
      }

      return new Response(
        JSON.stringify({ success: true, analysis_id: 'mock_analysis', ...mockAnalysis }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Real mode: fetch from Etsy, analyze with AI
    const { data: etsyAccount } = await supabaseClient
      .from('etsy_shops')
      .select('*')
      .eq('user_id', user.id)
      .eq('shop_id', shop_id)
      .single();

    if (!etsyAccount) {
      throw new Error('Etsy account not found');
    }

    // Fetch listings with reviews/favorites (simplified)
    const accessToken = atob(etsyAccount.access_token_encrypted);
    const response = await fetch(`https://api.etsy.com/v3/application/shops/${shop_id}/listings/active`, {
      headers: { 'x-api-key': Deno.env.get('ETSY_CLIENT_ID')!, 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Etsy API error');
    }

    const listings = await response.json();

    // Analyze with OpenAI for trend prediction
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const analysisResults = [];

    for (const listing of listings.results.slice(0, 10)) {
      // Calculate trend score from reviews, favorites, price
      const trendScore = Math.min(100, (listing.num_favorers || 0) * 2 + (listing.views || 0) * 0.1);
      const monthlyEstimate = (listing.num_favorers || 0) * 0.3;

      // Generate 3-month forecast via AI
      const forecastPrompt = `Predict sales for next 3 months for product with ${listing.num_favorers} favorites, ${listing.views} views. Return JSON: {month_1: number, month_2: number, month_3: number}`;
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: forecastPrompt }],
          response_format: { type: 'json_object' },
        }),
      });

      let forecast = { month_1: monthlyEstimate, month_2: monthlyEstimate * 1.05, month_3: monthlyEstimate * 1.1 };
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        forecast = JSON.parse(aiData.choices[0].message.content);
      }

      analysisResults.push({
        product_id: listing.listing_id.toString(),
        trend_score: trendScore,
        monthly_sales_estimate: monthlyEstimate,
        forecast,
      });

      // Store in DB
      await supabaseClient.from('top_seller_analysis').upsert({
        user_id: user.id,
        product_id: listing.listing_id.toString(),
        trend_score: trendScore,
        monthly_sales_estimate: monthlyEstimate,
        forecast_3month: forecast,
      }, { onConflict: 'user_id,product_id' });
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis_id: `analysis_${Date.now()}`,
        trend_scores: analysisResults,
        forecasts: Object.fromEntries(analysisResults.map(r => [r.product_id, r.forecast])),
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



