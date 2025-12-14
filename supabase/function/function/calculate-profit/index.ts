import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'delivered')

  for (const o of orders || []) {
    const net =
      Number(o.total_price)
      - Number(o.marketplace_fee || 0)
      - Number(o.pod_cost || 0)
      - Number(o.shipping_cost || 0)
      - Number(o.tax_amount || 0)

    await supabase
      .from('orders')
      .update({ net_profit: net })
      .eq('id', o.id)
  }

  return new Response(JSON.stringify({ success: true }))
})
