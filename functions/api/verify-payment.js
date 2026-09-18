import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Parse form-urlencoded body
    const formData = await request.formData();
    const txnid = formData.get('txnid');
    const status = formData.get('status');
    const hash = formData.get('hash');
    const amount = formData.get('amount');
    const mihpayid = formData.get('mihpayid');
    const email = formData.get('email') || '';
    const firstname = formData.get('firstname') || '';
    const productinfo = formData.get('productinfo') || '';
    const key = formData.get('key');

    if (!txnid || !status || !hash || !amount) {
      return new Response(JSON.stringify({ error: 'Missing payment details' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const salt = env.PAYU_SALT;
    const keyId = env.PAYU_MERCHANT_KEY;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!salt || !keyId || !supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Reverse hash formula: SALT|status|||||||||||email|firstname|productinfo|amount|txnid|key
    const hashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${keyId}`;
    
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-512', encoder.encode(hashString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedSignature !== hash) {
      return new Response(JSON.stringify({ error: 'Invalid payment signature. Payment rejected.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: dbOrder, error: orderFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', txnid)
      .single();

    if (orderFetchError || !dbOrder) {
      return new Response(JSON.stringify({ error: 'Order not found in system' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    if (dbOrder.status === 'verified') {
      return Response.redirect(new URL('/?payment_success=true', request.url).toString(), 302);
    }

    if (status !== 'success') {
      return Response.redirect(new URL('/?payment_failed=true', request.url).toString(), 302);
    }

    const actualAmount = parseFloat(amount);
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
      p_order_id: txnid,
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
      .eq('razorpay_order_id', txnid);

    return Response.redirect(new URL('/?payment_success=true', request.url).toString(), 302);

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error during verification' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
