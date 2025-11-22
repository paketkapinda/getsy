import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  
  const { data: order, error } = await supabase
    .from('restaurant_orders')
    .insert({
      user_id: user.id,
      ...body,
      status: 'pending',
      payment_status: 'pending',
      estimated_delivery_time: new Date(Date.now() + 45 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(order);
}

export async function GET(request: Request) {
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('restaurant_orders')
    .select('*')
    .eq('user_id', user.id);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: orders, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(orders);
}
