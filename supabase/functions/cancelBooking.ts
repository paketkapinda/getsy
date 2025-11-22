// supabase/functions/cancelBooking.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { booking_id, reason } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user } } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!user) {
      throw new Error('Invalid user');
    }

    // Check if user owns the booking
    const { data: booking } = await supabaseClient
      .from('hotel_bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('user_id', user.id)
      .single();

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Update booking status
    const { data: updatedBooking, error } = await supabaseClient
      .from('hotel_bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancellation_initiated_by: 'customer'
      })
      .eq('id', booking_id)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ booking: updatedBooking }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});