import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { orderId } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SERVICE_ROLE_KEY')!
  )

  // 1️⃣ Sipariş
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!order || !order.tracking_number) {
    return new Response(JSON.stringify({ error: 'Tracking not ready' }), { status: 400 })
  }

  // 2️⃣ Entegrasyon
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', order.user_id)
    .eq('provider', order.marketplace_provider)
    .eq('status', 'active')
    .single()

  if (!integration) {
    return new Response(JSON.stringify({ error: 'Integration not found' }), { status: 404 })
  }

  // 3️⃣ Marketplace API (örnek Etsy)
  if (order.marketplace_provider === 'etsy') {
    await fetch(`https://openapi.etsy.com/v3/application/shops/${integration.shop_id}/receipts/${order.marketplace_order_id}/tracking`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tracking_code: order.tracking_number,
        carrier_name: 'Other'
      })
    })
  }

  // 4️⃣ Güncelle
  await supabase.from('orders').update({
    marketplace_sync_status: 'synced'
  }).eq('id', orderId)

  return new Response(JSON.stringify({ success: true }))
})

