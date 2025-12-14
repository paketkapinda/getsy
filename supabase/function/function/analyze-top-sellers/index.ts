// supabase/functions/analyze-top-sellers/index.ts
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1️⃣ Aktif Etsy integration'ını bul
    const { data: integration, error: intErr } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'etsy')
      .eq('is_active', true)
      .single()

    if (intErr || !integration) {
      throw new Error('Active Etsy integration not found')
    }

    // 2️⃣ Etsy API çağrısı (gerçek entegrasyon buraya bağlanacak)
    // Şimdilik response formatı hazır, mock yok ama placeholder
    const etsyTopSellers = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${integration.shop_id}/listings/active`,
      {
        headers: {
          'x-api-key': integration.api_key,
        },
      }
    ).then(r => r.json())

    // 3️⃣ Trend score hesapla
    const analyzed = etsyTopSellers.results.map((item: any) => {
      const score =
        Math.min(100,
          (item.num_favorers || 0) * 0.4 +
          (item.views || 0) * 0.2 +
          (item.quantity || 0) * 0.1
        )

      return {
        listing_id: item.listing_id,
        title: item.title,
        category: item.taxonomy_path?.[0] || null,
        trend_score: Math.round(score),
        monthly_sales_estimate: Math.floor(score * 3),
        raw: item,
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        count: analyzed.length,
        trend_scores: analyzed,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    )
  }
})
