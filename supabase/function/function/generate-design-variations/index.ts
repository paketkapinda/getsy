// supabase/functions/generate-design-variations/index.ts
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    const body = await req.json()
    const { baseProduct, variations = 4 } = body

    if (!baseProduct?.title) {
      throw new Error('Base product data missing')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) throw new Error('OPENAI_API_KEY missing')

    const results = []

    for (let i = 0; i < variations; i++) {
      const seed = Math.floor(Math.random() * 1_000_000)

      const prompt = `
Create a unique POD print design inspired by:
Title: ${baseProduct.title}
Category: ${baseProduct.category || 'generic'}
Style: modern, high-conversion, commercial POD design
Variation seed: ${seed}

Rules:
- DO NOT copy original artwork
- Change composition, colors, layout
- Flat printable design
- White background
`

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt,
          size: '1024x1024'
        })
      }).then(r => r.json())

      const imageBase64 = response.data?.[0]?.b64_json
      if (!imageBase64) continue

      // Supabase'e kaydet (örnek tablo)
      const { data: saved } = await supabase
        .from('product_designs')
        .insert({
          title: baseProduct.title,
          variation_seed: seed,
          image_base64: imageBase64,
          source_listing_id: baseProduct.listing_id,
          status: 'generated'
        })
        .select()
        .single()

      results.push(saved)
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: results.length,
        designs: results
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
