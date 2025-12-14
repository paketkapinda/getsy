// supabase/functions/publish-to-marketplace/index.ts
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    const { product_id, user_id } = await req.json()
    if (!product_id || !user_id) {
      throw new Error('product_id and user_id are required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1️⃣ Ürünü al
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single()

    if (!product) throw new Error('Product not found')

    // 2️⃣ Kullanıcı profili
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user_id)
      .single()

    if (!profile) throw new Error('Profile not found')

    // 3️⃣ Doğru integration seç
    const integrationQuery = supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'etsy')
      .eq('is_active', true)

    if (profile.subscription_type === 'free') {
      integrationQuery.eq('user_id', user_id)
    } else {
      // shared → merkez hesabı
      integrationQuery.is('user_id', null)
    }

    const { data: integration } = await integrationQuery.single()
    if (!integration) throw new Error('Etsy integration not found')

    // 4️⃣ Etsy ürün oluştur
    const etsyResponse = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${integration.shop_id}/listings`,
      {
        method: 'POST',
        headers: {
          'x-api-key': integration.api_key,
          'Authorization': `Bearer ${integration.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: product.title,
          description: product.description,
          price: product.price,
          quantity: product.stock || 999,
          taxonomy_id: product.taxonomy_id,
          who_made: 'i_did',
          is_supply: false,
          when_made: 'made_to_order'
        })
      }
    )

    const etsyData = await etsyResponse.json()
    if (!etsyData.listing_id) {
      throw new Error('Etsy listing failed')
    }

    // 5️⃣ Ürünü güncelle
    await supabase
      .from('products')
      .update({
        marketplace: 'etsy',
        marketplace_listing_id: etsyData.listing_id,
        status: 'active',
        published_at: new Date().toISOString()
      })
      .eq('id', product_id)

    return new Response(
      JSON.stringify({
        success: true,
        listing_id: etsyData.listing_id,
        status: 'active'
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
