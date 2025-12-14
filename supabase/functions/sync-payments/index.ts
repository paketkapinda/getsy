// supabase/functions/sync-payments/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!
  );

  // 🔐 aktif Etsy entegrasyonları
  const { data: integrations } = await supabase
    .from("integrations")
    .select("*")
    .eq("provider", "etsy")
    .eq("is_active", true);

  for (const i of integrations) {
    // 1️⃣ TOKEN REFRESH
    const tokenRes = await fetch(
      "https://api.etsy.com/v3/public/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          client_id: i.client_id,
          refresh_token: i.refresh_token
        })
      }
    );

    const token = await tokenRes.json();

    // 2️⃣ PAYMENTS ÇEK
    const payRes = await fetch(
      `https://api.etsy.com/v3/application/shops/${i.shop_id}/payments`,
      {
        headers: { Authorization: `Bearer ${token.access_token}` }
      }
    );

    const json = await payRes.json();

    // 3️⃣ PAYMENTS KAYDET
    for (const p of json.results) {
      await supabase.from("payments").upsert({
        provider: "etsy",
        external_payment_id: p.payment_id,
        order_id: p.order_id,
        amount: p.amount.value,
        currency: p.amount.currency,
        status: p.status,
        payment_date: p.create_date,
        integration_id: i.id
      });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
});

