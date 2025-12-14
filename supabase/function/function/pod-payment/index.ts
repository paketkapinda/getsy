import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { orderId, podProviderId } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1️⃣ Sipariş çek
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 })
  }

  // 2️⃣ POD ödeme (simülasyon – gerçek API buraya)
  const podPaymentId = 'pod_' + crypto.randomUUID()

  // 3️⃣ Siparişi güncelle
  await supabase.from('orders').update({
    pod_payment_id: podPaymentId,
    pod_payment_status: 'paid',
    pod_paid_at: new Date().toISOString(),
    payout_confirmed: true,
    status: 'processing',
    pod_status: 'processing'
  }).eq('id', orderId)

  // 4️⃣ POD’a gönder (sonraki fonksiyon)
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-to-pod`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({ orderId })
  })

  return new Response(JSON.stringify({ success: true }))
})
