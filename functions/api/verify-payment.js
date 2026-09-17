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

    if (existingSlot.status === 'live' && existingSlot.size === 'micro') {
       return new Response(JSON.stringify({ error: 'This fixed-price slot has already been purchased.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (existingSlot.status === 'live') {
       let minOutbid = existingSlot.current_bid;
       if (existingSlot.size === 'big') {
         minOutbid = Math.ceil(existingSlot.current_bid * 1.10);
       } else if (existingSlot.size === 'small') {
         minOutbid = existingSlot.current_bid + 100;
       }
       
       if (minOutbid <= existingSlot.current_bid) {
         minOutbid = existingSlot.current_bid + 100;
       }

       if (actualAmount < minOutbid) {
         return new Response(JSON.stringify({ error: `Bid too low. Minimum required is ${minOutbid / 100} INR.` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
       }
    } else {
       if (actualAmount < existingSlot.current_bid) {
         return new Response(JSON.stringify({ error: 'Bid amount is below the starting price.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
       }
    }

    const userData = dbOrder.user_data ? JSON.parse(dbOrder.user_data) : {};
    
    const { data: updatedSlot, error: updateError } = await supabase
      .from('slots')
      .update({
        status: 'live',
        holder_name: userData.brandName,
        website_url: userData.website,
        x_handle: userData.xHandle || null,
        current_bid: actualAmount,
        logo_url: userData.logo_url || existingSlot.logo_url || null
      })
      .eq('id', slotId)
      .lte('current_bid', actualAmount)
      .select();

    if (updateError || !updatedSlot || updatedSlot.length === 0) {
      return new Response(JSON.stringify({ error: 'Slot update failed. Someone may have placed a higher bid simultaneously.' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }

    await supabase
      .from('orders')
      .update({ status: 'verified' })
      .eq('razorpay_order_id', txnid);

    return Response.redirect(new URL('/?payment_success=true', request.url).toString(), 302);

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error during verification' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
