// supabase/functions/apply-mockups/index.ts
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts'

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    const { design_id, mockup_type } = await req.json()

    if (!design_id || !mockup_type) {
      throw new Error('design_id and mockup_type are required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1️⃣ Design’i al
    const { data: design } = await supabase
      .from('product_designs')
      .select('*')
      .eq('id', design_id)
      .single()

    if (!design?.image_base64) {
      throw new Error('Design image not found')
    }

    // 2️⃣ Mockup template al (örnek tablo)
    const { data: mockup } = await supabase
      .from('mockup_templates')
      .select('*')
      .eq('type', mockup_type)
      .eq('is_active', true)
      .single()

    if (!mockup?.image_url) {
      throw new Error('Mockup template not found')
    }

    // 3️⃣ Görselleri yükle
    const designImage = await Image.decode(
      Uint8Array.from(atob(design.image_base64), c => c.charCodeAt(0))
    )

    const mockupImage = await Image.decode(
      new Uint8Array(await (await fetch(mockup.image_url)).arrayBuffer())
    )

    // 4️⃣ Design'i ölçekle & bindir
    const resized = designImage.resize(
      mockup.print_width,
      mockup.print_height
    )

    mockupImage.composite(
      resized,
      mockup.print_x,
      mockup.print_y
    )

    // 5️⃣ PNG çıktısı
    const finalImage = await mockupImage.encodePNG()

    const fileName = `mockups/${design_id}-${mockup_type}-${Date.now()}.png`

    // 6️⃣ Storage’a yükle
    await supabase.storage
      .from('product-mockups')
      .upload(fileName, finalImage, {
        contentType: 'image/png'
      })

    const { data: publicUrl } = supabase
      .storage
      .from('product-mockups')
      .getPublicUrl(fileName)

    // 7️⃣ DB’ye kaydet
    await supabase.from('product_mockups').insert({
      design_id,
      mockup_type,
      image_url: publicUrl.publicUrl,
      status: 'ready'
    })

    return new Response(
      JSON.stringify({
        success: true,
        image_url: publicUrl.publicUrl
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
