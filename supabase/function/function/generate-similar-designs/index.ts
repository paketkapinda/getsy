import { serve } from "https://deno.land/std/http/server.ts";
import OpenAI from "https://esm.sh/openai@4";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const {
      user_id,
      reference_image,
      product_type,
      style,
      variations = 3
    } = await req.json();

    if (!reference_image || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const prompt = `
Create a unique, original design for a print-on-demand ${product_type}.
Inspired by the provided reference image but NOT copying it.
Style: ${style}
No text, no logos, clean printable design.
`;

    const images = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      n: variations,
    });

    const results = [];

    for (let i = 0; i < images.data.length; i++) {
      const imageBase64 = images.data[i].b64_json;
      const buffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

      const filePath = `designs/${user_id}/${crypto.randomUUID()}.png`;

      await supabase.storage
        .from("product-designs")
        .upload(filePath, buffer, {
          contentType: "image/png",
        });

      const { data: product } = await supabase
        .from("products")
        .insert({
          user_id,
          design_path: filePath,
          status: "draft",
          source: "ai",
        })
        .select()
        .single();

      results.push(product);
    }

    return new Response(
      JSON.stringify({ success: true, products: results }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("❌ generate-similar-designs error:", err);
    return new Response(
      JSON.stringify({ error: "Design generation failed" }),
      { status: 500 }
    );
  }
});
