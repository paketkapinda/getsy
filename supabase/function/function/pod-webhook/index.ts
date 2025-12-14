import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const payload = await req.json()

  /*
    payload example:
    {
      order_id: "pod_123",
      status: "shipped",
      tracking_number: "RR123456789",
      tracking_url: "https://tracking.com/..."
    }
  */

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('pod_order_id', payload.order_id)
    .single()

  if (!order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 })
  }

  const updates: any = {
    pod_status: payload.status,
    fulfillment_status: payload.status === 'delivered' ? 'fulfilled' : 'processing',
    updated_at: new Date().toISOString()
  }

  if (payload.status === 'shipped') {
    updates.tracking_number = payload.tracking_number
    updates.tracking_url = payload.tracking_url
    updates.shipped_at = new Date().toISOString()
  }

  if (payload.status === 'delivered') {
    updates.delivered_at = new Date().toISOString()
  }

  await supabase.from('orders').update(updates).eq('id', order.id)

  return new Response(JSON.stringify({ success: true }))
})
