import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = new Date().toISOString()

    // 1️⃣ Süresi dolmuş ve ödeme yapılmamış siparişler
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('payout_confirmed', false)
      .lte('payout_deadline', now)
      .in('status', ['pending', 'paid'])

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ message: 'No expired orders' }))
    }

    for (const order of orders) {
      // 2️⃣ Siparişi otomatik iptal / merkeze çek
      await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          pod_status: 'cancelled',
          fulfillment_status: 'unfulfilled',
          auto_handled_by: 'system',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        auto_handled_orders: orders.length
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
