// supabase/functions/track-shipment/index.ts
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1️⃣ Takip edilmesi gereken siparişler
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .in('pod_status', ['processing', 'printing'])

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ message: 'No active shipments' }))
    }

    for (const order of orders) {
      // 2️⃣ POD API çağrısı (mock)
      const shipmentUpdate = {
        status: 'shipped',
        tracking_number: 'TRK' + Math.floor(Math.random() * 1000000),
        carrier: 'UPS'
      }

      // 3️⃣ Siparişi güncelle
      await supabase
        .from('orders')
        .update({
          pod_status: shipmentUpdate.status,
          fulfillment_status: 'fulfilled',
          tracking_number: shipmentUpdate.tracking_number,
          shipping_carrier: shipmentUpdate.carrier,
          shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated_orders: orders.length
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
