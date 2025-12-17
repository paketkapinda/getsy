import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  // 🔹 Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    )
  }

  try {
    // 🔹 Kullanıcı JWT
    const token =
      req.headers.get('authorization')?.replace('Bearer ', '') ?? ''

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // ✅ ANON + JWT (DOĞRU MODEL)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    // 🔹 Delivered siparişleri al
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'delivered')

    if (error) {
      throw error
    }

    for (const o of orders || []) {
      const net =
        Number(o.total_price || 0)
        - Number(o.marketplace_fee || 0)
        - Number(o.pod_cost || 0)
        - Number(o.shipping_cost || 0)
        - Number(o.tax_amount || 0)

      await supabase
        .from('orders')
        .update({ net_profit: net })
        .eq('id', o.id)
    }

    return new Response(
      JSON.stringify({ success: true, updated: orders?.length || 0 }),
      { headers: corsHeaders }
    )
  } catch (err: any) {
    console.error('NET PROFIT ERROR', err)

    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
