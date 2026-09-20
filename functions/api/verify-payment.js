import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Parse JSON body
    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment details' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const razorpayKeySecret = env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!razorpayKeySecret || !supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Verify Razorpay Signature
    // HMAC SHA-256 of "razorpay_order_id|razorpay_payment_id" using RAZORPAY_KEY_SECRET
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(razorpayKeySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify', 'sign']
    );

    const dataToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      new TextEncoder().encode(dataToSign)
    );
    
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Invalid payment signature. Payment rejected.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: dbOrder, error: orderFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (orderFetchError || !dbOrder) {
      return new Response(JSON.stringify({ error: 'Order not found in system' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    if (dbOrder.status === 'verified') {
      return new Response(JSON.stringify({ success: true, message: 'Already verified' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const actualAmount = dbOrder.amount;
    const slotId = dbOrder.slot_id;

    const { data: existingSlot, error: fetchError } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (fetchError || !existingSlot) {
      return new Response(JSON.stringify({ error: 'Slot not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const userData = dbOrder.user_data ? JSON.parse(dbOrder.user_data) : {};
    
    // Call the PostgreSQL function to safely book the slot in the queue
    const { data: bookingResult, error: bookingError } = await supabase.rpc('book_slot', {
      p_booking_id: crypto.randomUUID(),
      p_slot_id: slotId,
      p_order_id: razorpay_order_id,
      p_holder_name: userData.brandName || 'User',
      p_logo_url: userData.logo_url || existingSlot.logo_url || null,
      p_website_url: userData.website || null,
      p_x_handle: userData.xHandle || null,
      p_amount_paid: actualAmount
    });

    if (bookingError) {
      console.error('Booking error:', bookingError);
      return new Response(JSON.stringify({ error: 'Failed to book the slot. Please contact support.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Also update the slot status to live (for backward compatibility if needed)
    await supabase.from('slots').update({
      status: 'live',
      holder_name: userData.brandName || 'User',
      website_url: userData.website || null,
      x_handle: userData.xHandle || null,
      logo_url: userData.logo_url || existingSlot.logo_url || null
    }).eq('id', slotId);

    await supabase
      .from('orders')
      .update({ status: 'verified' })
      .eq('razorpay_order_id', razorpay_order_id);

    return new Response(JSON.stringify({ success: true, message: 'Payment verified successfully.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error during verification' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
