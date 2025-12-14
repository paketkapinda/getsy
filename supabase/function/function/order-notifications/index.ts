import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()

  // 1️⃣ Ödeme süresi yaklaşan siparişler (son 10 dk)
  const warningTime = new Date(now.getTime() + 10 * 60000).toISOString()

  const { data: orders } = await supabase
    .from('orders')
    .select('id,user_id,payout_deadline')
    .eq('payout_confirmed', false)
    .gte('payout_deadline', now.toISOString())
    .lte('payout_deadline', warningTime)

  if (!orders || orders.length === 0) {
    return new Response(JSON.stringify({ message: 'No notifications needed' }))
  }

  for (const order of orders) {
    await supabase.from('notifications').insert({
      user_id: order.user_id,
      type: 'PAYOUT_FINAL_WARNING',
      title: '⚠️ Son 10 Dakika!',
      message: 'Siparişiniz POD ödemesi yapılmazsa otomatik iptal edilecektir.',
      related_order_id: order.id
    })
  }

  return new Response(JSON.stringify({ notified: orders.length }))
})
