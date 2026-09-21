import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const bodyText = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing Razorpay signature' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const razorpayWebhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!razorpayWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing webhook configuration in environment variables.');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Verify Signature using HMAC SHA-256
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(razorpayWebhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify', 'sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      new TextEncoder().encode(bodyText)
    );
    
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedSignature !== signature) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const payload = JSON.parse(bodyText);

    if (payload.event !== 'payment.captured' && payload.event !== 'order.paid') {
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Extract order ID
    const paymentEntity = payload.payload.payment.entity;
    const txnid = paymentEntity.order_id;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: dbOrder, error: orderFetchError } = await supabase
      .from('orders')
      .select('id, status, slot_id, user_data, amount')
      .eq('razorpay_order_id', txnid)
      .single();

    if (orderFetchError || !dbOrder) {
      return new Response(JSON.stringify({ success: true, message: 'Order not found, ignored.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (dbOrder.status === 'verified' || dbOrder.status === 'webhook_paid') {
      return new Response(JSON.stringify({ success: true, message: 'Already processed' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const userData = dbOrder.user_data ? JSON.parse(dbOrder.user_data) : {};
    const slotId = dbOrder.slot_id;

    const { data: existingSlot } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();
      
    if (!existingSlot) {
      return new Response(JSON.stringify({ error: 'Slot not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Call book_slot to add to queue safely
    const { error: bookingError } = await supabase.rpc('book_slot', {
      p_booking_id: crypto.randomUUID(),
      p_slot_id: slotId,
      p_order_id: txnid,
      p_holder_name: userData.brandName || 'User',
      p_logo_url: userData.logo_url || existingSlot.logo_url || null,
      p_website_url: userData.website || null,
      p_x_handle: userData.xHandle || null,
      p_amount_paid: dbOrder.amount
    });

    if (bookingError) {
      console.error('Webhook: Booking error:', bookingError);
      return new Response(JSON.stringify({ error: 'Failed to book the slot.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Mark as webhook_paid
    await supabase.from('orders').update({ status: 'webhook_paid' }).eq('razorpay_order_id', txnid);

    return new Response(JSON.stringify({ success: true, message: 'Webhook processed successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error processing webhook' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
