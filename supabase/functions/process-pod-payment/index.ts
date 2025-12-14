// supabase/functions/process-pod-payment/index.ts
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { order_id, pod_provider } = await req.json()

    if (!order_id || !pod_provider) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!
    )

    // 1️⃣ Siparişi al
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (!order) {
      throw new Error('Order not found')
    }

    // 2️⃣ POD API çağrısı (mock – sonra gerçek bağlanır)
    const podOrderId = `POD-${Date.now()}`

    // 3️⃣ Siparişi güncelle
    await supabase
      .from('orders')
      .update({
        pod_provider,
        pod_order_id: podOrderId,
        pod_status: 'processing',
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)

    return new Response(
      JSON.stringify({
        success: true,
        pod_order_id: podOrderId
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

