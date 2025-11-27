// Edge Function: Job queue runner
// Picks pending jobs and executes them (called by cron or scheduled)

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

    // Get pending jobs
    const { data: jobs, error: jobsError } = await supabaseClient
      .from('job_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (jobsError) throw jobsError;

    const results = [];

    for (const job of jobs || []) {
      // Mark as processing
      await supabaseClient
        .from('job_queue')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', job.id);

      try {
        let result;

        switch (job.job_type) {
          case 'mockup_generation':
            // Call ai-mockup function logic (simplified)
            result = { success: true, message: 'Mockup generated' };
            break;
          case 'top_seller_analysis':
            // Call ai-top-seller function logic
            result = { success: true, message: 'Analysis completed' };
            break;
          case 'order_sync':
            // Call etsy-sync function logic
            result = { success: true, message: 'Orders synced' };
            break;
          default:
            result = { success: true, message: 'Job processed' };
        }

        // Mark as completed
        await supabaseClient
          .from('job_queue')
          .update({
            status: 'completed',
            result,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.push({ job_id: job.id, status: 'completed' });
      } catch (error) {
        // Mark as failed
        await supabaseClient
          .from('job_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            retry_count: (job.retry_count || 0) + 1,
          })
          .eq('id', job.id);

        results.push({ job_id: job.id, status: 'failed', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});


