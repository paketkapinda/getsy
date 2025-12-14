// supabase/functions/escalate-unpaid-orders/index.ts
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1️⃣ Süresi geçen siparişleri bul
    const { data: overdueOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .lt('approval_deadline', new Date().toISOString())

    if (!overdueOrders || overdueOrders.length === 0) {
      return new Response(JSON.stringify({ message: 'No overdue orders' }))
    }

    let escalatedCount = 0

    for (const order of overdueOrders) {
      // 2️⃣ Siparişi merkeze çek
      await supabase
        .from('orders')
        .update({
          status: 'processing',            // merkez işliyor
          pod_status: 'pending',
          fulfillment_status: 'unfulfilled',
          notes: 'Order auto-escalated to central operation due to unpaid timeout',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      escalatedCount++
    }

    return new Response(
      JSON.stringify({
        success: true,
        escalated: escalatedCount
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
// supabase/functions/sync-orders/index.ts
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1️⃣ Aktif Etsy entegrasyonları
    const { data: integrations } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'etsy')
      .eq('is_active', true)

    if (!integrations?.length) {
      return new Response(JSON.stringify({ message: 'No active Etsy integrations' }))
    }

    let inserted = 0

    for (const integration of integrations) {
      const res = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${integration.shop_id}/receipts`,
        {
          headers: {
            'x-api-key': integration.api_key,
            'Authorization': `Bearer ${integration.access_token}`
          }
        }
      )

      const data = await res.json()
      if (!data.results) continue

      for (const receipt of data.results) {
        for (const tx of receipt.transactions) {

          // 2️⃣ Ürün eşleşmesi
          const { data: product } = await supabase
            .from('products')
            .select('id, user_id, title')
            .eq('marketplace_listing_id', tx.listing_id)
            .single()

          if (!product) continue

          // 3️⃣ Daha önce eklenmiş mi?
          const { data: exists } = await supabase
            .from('orders')
            .select('id')
            .eq('etsy_order_id', receipt.receipt_id)
            .maybeSingle()

          if (exists) continue

          const deadline = new Date(Date.now() + 30 * 60 * 1000)

          // 4️⃣ Siparişi ekle
          await supabase.from('orders').insert({
            user_id: product.user_id,
            order_number: receipt.receipt_id,
            etsy_order_id: receipt.receipt_id,
            customer_name: receipt.name || 'Etsy Customer',
            customer_email: receipt.buyer_email || '',
            shipping_address: receipt.shipping_address || {},
            product_id: product.id,
            product_name: product.title,
            product_variant: tx.variations?.map(v => v.formatted_name).join(', ') || null,
            quantity: tx.quantity,
            unit_price: tx.price.amount / 100,
            total_price: receipt.grandtotal.amount / 100,
            shipping_cost: receipt.shipping_cost?.amount / 100 || 0,
            tax_amount: receipt.tax_cost?.amount / 100 || 0,
            status: 'pending',
            pod_status: 'pending',
            fulfillment_status: 'unfulfilled',
            approval_deadline: deadline.toISOString()
          })

          inserted++
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    )
  }
})
