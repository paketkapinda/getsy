import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${error.message}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Update payment status in database
      await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          stripe_payment_id: paymentIntent.id,
          stripe_charge_id: paymentIntent.latest_charge
        })
        .eq('stripe_payment_id', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('stripe_payment_id', failedPayment.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
