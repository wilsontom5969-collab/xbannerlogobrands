import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    const formData = await request.formData();
    const txnid = formData.get('txnid');
    const status = formData.get('status');
    const hash = formData.get('hash');
    const amount = formData.get('amount');
    const mihpayid = formData.get('mihpayid');
    const email = formData.get('email') || '';
    const firstname = formData.get('firstname') || '';
    const productinfo = formData.get('productinfo') || '';

    if (!txnid || !status || !hash || !amount) {
      return new Response(JSON.stringify({ error: 'Missing payment details in webhook' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const salt = env.PAYU_SALT;
    const keyId = env.PAYU_MERCHANT_KEY;
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!salt || !keyId || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing webhook configuration in environment variables.');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Verify Signature
    // Reverse hash formula: SALT|status|||||||||||email|firstname|productinfo|amount|txnid|key
    const hashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${keyId}`;
    
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-512', encoder.encode(hashString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (expectedSignature !== hash) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (status !== 'success') {
      return new Response(JSON.stringify({ success: true, message: 'Payment not successful, ignored' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check current order status
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
    const actualAmount = dbOrder.amount;

    // 1. Get current slot data
    const { data: existingSlot } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();
      
    if (!existingSlot) {
      return new Response(JSON.stringify({ error: 'Slot not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Perform secure atomic slot update
    const { data: updatedSlot, error: slotUpdateError } = await supabase
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

    if (slotUpdateError || !updatedSlot || updatedSlot.length === 0) {
      console.error('Webhook: Slot update failed (possibly outbid concurrently)');
    }

    // 3. Update the order status to webhook_paid and log event ID
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'webhook_paid', webhook_event_id: mihpayid })
      .eq('razorpay_order_id', txnid);

    if (updateError) {
      console.error('Webhook: Failed to update order status:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update order status' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, message: 'Webhook processed successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error processing webhook' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
