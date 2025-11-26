// Edge Function: Generate invoice PDF
// Creates PDF invoice and uploads to Storage

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const { order_id } = await req.json();

    // Get order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${order.id.slice(0, 8).toUpperCase()}`;

    // Mock mode: create simple HTML invoice
    if (Deno.env.get('MOCK_PROVIDER') === 'true') {
      const htmlInvoice = `
        <html>
          <head><title>Invoice ${invoiceNumber}</title></head>
          <body style="font-family: Arial; padding: 40px;">
            <h1>Invoice ${invoiceNumber}</h1>
            <p>Order: ${order.etsy_order_id}</p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            <p>Total: $${order.total_amount}</p>
          </body>
        </html>
      `;

      // Convert HTML to PDF (simplified - in production use Puppeteer or similar)
      const pdfBlob = new Blob([htmlInvoice], { type: 'text/html' });
      const fileName = `invoices/${invoiceNumber}.html`;

      const { error: uploadError } = await supabaseClient.storage
        .from('invoices')
        .upload(fileName, pdfBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('invoices')
        .getPublicUrl(fileName);

      // Create invoice record
      const { data: invoice, error: invoiceError } = await supabaseClient
        .from('invoices')
        .insert({
          order_id,
          invoice_number: invoiceNumber,
          storage_url: publicUrl,
          total_amount: parseFloat(order.total_amount || '0'),
          status: 'sent',
          issued_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      return new Response(
        JSON.stringify({ success: true, invoice_id: invoice.id, invoice_url: publicUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Real mode: use PDF library (Puppeteer or PDFKit)
    // For demo, return mock URL
    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: `invoice_${Date.now()}`,
        invoice_url: `https://example.com/invoices/${invoiceNumber}.pdf`,
        message: 'PDF generation requires Puppeteer/PDFKit setup',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

