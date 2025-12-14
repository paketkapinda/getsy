import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* =====================================================
       AKTİF INTEGRATIONS
    ===================================================== */
    const { data: integrations, error: intErr } = await supabase
      .from("integrations")
      .select("*")
      .eq("is_active", true);

    if (intErr) throw intErr;

    for (const integration of integrations) {
      if (integration.provider !== "etsy") continue;

      const accessToken = integration.access_token;
      const shopId = integration.shop_id;

      if (!accessToken || !shopId) continue;

      /* =====================================================
         ETSY PAYMENTS
      ===================================================== */
      const res = await fetch(
        `https://api.etsy.com/v3/application/shops/${shopId}/payments`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-api-key": integration.api_key
          }
        }
      );

      if (!res.ok) {
        console.error("Etsy API error", await res.text());
        continue;
      }

      const json = await res.json();
      const payments = json.results || [];

      for (const p of payments) {
        if (!p.order_id) continue;

        /* ===========================================
           ORDER → USER EŞLEŞMESİ
        =========================================== */
        const { data: order } = await supabase
          .from("orders")
          .select("id, user_id")
          .eq("etsy_order_id", p.order_id)
          .maybeSingle();

        if (!order) continue;

        /* ===========================================
           PAYMENTS UPSERT
        =========================================== */
        await supabase
          .from("payments")
          .upsert(
            {
              integration_id: integration.id,
              external_payment_id: p.payment_id,
              order_id: p.order_id,
              user_id: order.user_id,
              amount: p.amount?.amount || 0,
              currency: p.amount?.currency_code || "USD",
              status: p.status || "paid",
              payment_date: p.create_date,
              provider: "etsy"
            },
            {
              onConflict: "integration_id,external_payment_id"
            }
          );
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("SYNC ERROR", err);
    return new Response(
      JSON.stringify({ error: "sync_failed" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
